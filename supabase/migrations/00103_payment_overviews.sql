-- 00103: monthly Betaaloverzicht (statement of account) — storage + read RPCs
--
-- WHAT: on the first working day of each month every customer with outstanding
-- orders receives ONE PDF listing all of them plus a single "totaal openstaand",
-- instead of one dunning email per overdue invoice.
--
-- WHY A DEDICATED TABLE AND NOT `documents`:
-- PDFs are never stored in this project — a document is re-rendered on demand
-- from its frozen `snapshot`. Same pattern here, but an overview has no
-- sequential legal number, so putting it in `documents` would (a) pollute the
-- Invoices register / `documents_list` view (00088), (b) force a CASE branch
-- into `get_next_document_number_atomic` (00079), and (c) burn an invoice
-- number. It gets its own table and links to the mail log the same way
-- `invoice_reminders` does: via `document_send_id`.

-- ---------------------------------------------------------------------------
-- 1. Storage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_overviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  -- First day of the statement month. One overview per customer per month.
  period           date NOT NULL,
  -- The PaymentOverviewData the PDF renders from. Frozen at send time so
  -- "show me what was sent" reproduces it byte-for-byte, exactly like
  -- documents.snapshot.
  snapshot         jsonb NOT NULL,
  total_cents      bigint  NOT NULL DEFAULT 0,
  order_count      integer NOT NULL DEFAULT 0,
  document_send_id uuid REFERENCES public.document_sends(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW()
);

-- Idempotency anchor: the cron upserts on (customer_id, period), so a retry
-- after a failed send re-uses the row instead of creating a second statement.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_overviews_customer_period
  ON public.payment_overviews (customer_id, period);

CREATE INDEX IF NOT EXISTS idx_payment_overviews_period
  ON public.payment_overviews (period DESC);

COMMENT ON TABLE public.payment_overviews IS
  'Monthly statement of account per customer. snapshot = the frozen PaymentOverviewData the PDF renders from; never stores the PDF itself.';

-- ---------------------------------------------------------------------------
-- 2. RLS — owner only, append/update only (no DELETE policy), like document_sends
-- ---------------------------------------------------------------------------
-- Owner-only because the statement AGGREGATES order totals: orders.hidden_from_managers
-- (00095) exists so a Shop Manager cannot see certain amounts, and a sum would
-- reconstruct them. Gating the sum for managers instead is not an option — it would
-- print a customer-facing total that disagrees with the real balance.
ALTER TABLE public.payment_overviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_overviews_select ON public.payment_overviews;
DROP POLICY IF EXISTS payment_overviews_insert ON public.payment_overviews;
DROP POLICY IF EXISTS payment_overviews_update ON public.payment_overviews;

CREATE POLICY payment_overviews_select ON public.payment_overviews
  FOR SELECT TO authenticated
  USING (is_admin_user() AND (SELECT is_owner()));

CREATE POLICY payment_overviews_insert ON public.payment_overviews
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user() AND (SELECT is_owner()));

CREATE POLICY payment_overviews_update ON public.payment_overviews
  FOR UPDATE TO authenticated
  USING      (is_admin_user() AND (SELECT is_owner()))
  WITH CHECK (is_admin_user() AND (SELECT is_owner()));

-- ---------------------------------------------------------------------------
-- 3. Read RPCs
-- ---------------------------------------------------------------------------
-- 🚨 AUTHORIZATION PATTERN, used by both functions below:
--
--     IF auth.uid() IS NOT NULL AND NOT is_owner() THEN RAISE EXCEPTION
--
-- These are SECURITY DEFINER, so they bypass RLS and must carry their own gate.
-- The gate has to admit TWO callers with opposite properties:
--   * the owner in the browser  -> auth.uid() set, is_owner() true
--   * the cron (service_role)   -> auth.uid() IS NULL, is_owner() FALSE
-- `is_owner()` reads profiles WHERE id = auth.uid(), so a plain `IF NOT is_owner()`
-- would lock the cron out of its own job. A NULL auth.uid() means "no end user",
-- which after the REVOKE below can only be the service role — anon and PUBLIC
-- have no EXECUTE at all.
--
-- Because only owners and the service role can get in, there is deliberately NO
-- `hidden_from_managers` predicate inside: both callers are entitled to see every
-- order, and a statement that silently omitted one would understate what the
-- customer owes.

-- 3a. The orders that belong on one customer's statement.
CREATE OR REPLACE FUNCTION public.get_payment_overview_orders(p_customer_id uuid)
RETURNS TABLE (
  order_id         uuid,
  order_number     text,
  invoice_number   text,
  order_date       date,
  invoice_due_date date,
  days_overdue     integer,
  amount_cents     bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    COALESCE(inv.document_number, o.woo_invoice_number::text)      AS invoice_number,
    o.order_date,
    o.invoice_due_date,
    GREATEST(0, (CURRENT_DATE - o.invoice_due_date))::integer      AS days_overdue,
    (o.total - COALESCE(o.refund_amount, 0))::bigint               AS amount_cents
  FROM orders o
  LEFT JOIN LATERAL (
    SELECT d.document_number
    FROM documents d
    WHERE d.order_id = o.id AND d.document_type = 'invoice'
    ORDER BY d.generated_at DESC NULLS LAST
    LIMIT 1
  ) inv ON TRUE
  WHERE o.customer_id = p_customer_id
    AND o.deleted_at IS NULL
    -- Unpaid = everything except closed/void. 'draft' is excluded because a
    -- Concept order is unfinalised and carries no obligation; 'pending' and
    -- 'pending_payment' are both live values meaning "wacht op betaling".
    AND o.status NOT IN ('completed', 'cancelled', 'refunded', 'draft')
    -- Only billed orders: no invoice number means nothing has been charged yet.
    AND COALESCE(inv.document_number, o.woo_invoice_number::text) IS NOT NULL
    -- A fully-refunded-by-amount order owes nothing even if its status lags.
    AND (o.total - COALESCE(o.refund_amount, 0)) > 0
  ORDER BY o.invoice_due_date ASC NULLS LAST, o.order_date ASC;
END;
$function$;

-- 3b. One row per customer that has anything outstanding — drives the
--     Betaaloverzicht tab and the cron's candidate list.
CREATE OR REPLACE FUNCTION public.get_payment_overview_customers(p_period date DEFAULT NULL)
RETURNS TABLE (
  customer_id         uuid,
  company_name        text,
  email               text,
  billing_country     text,
  reminders_opted_out boolean,
  open_count          integer,
  overdue_count       integer,
  total_cents         bigint,
  oldest_due_date     date,
  last_overview_id    uuid,
  last_period         date,
  last_sent_at        timestamptz,
  last_send_status    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_period date := COALESCE(p_period, date_trunc('month', CURRENT_DATE)::date);
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.company_name,
    c.email,
    c.billing_country,
    c.reminders_opted_out,
    agg.open_count,
    agg.overdue_count,
    agg.total_cents,
    agg.oldest_due_date,
    po.id                       AS last_overview_id,
    po.period                   AS last_period,
    ds.sent_at                  AS last_sent_at,
    ds.status                   AS last_send_status
  FROM customers c
  JOIN LATERAL (
    SELECT
      COUNT(*)::integer                                                    AS open_count,
      COUNT(*) FILTER (WHERE g.days_overdue > 0)::integer                  AS overdue_count,
      COALESCE(SUM(g.amount_cents), 0)::bigint                             AS total_cents,
      MIN(g.invoice_due_date)                                              AS oldest_due_date
    FROM get_payment_overview_orders(c.id) g
  ) agg ON TRUE
  -- The statement for the period being inspected (this month by default), so
  -- the UI can show "already sent / not yet sent" without a second round-trip.
  LEFT JOIN payment_overviews po ON po.customer_id = c.id AND po.period = v_period
  LEFT JOIN document_sends   ds ON ds.id = po.document_send_id
  WHERE c.is_active
    AND agg.open_count > 0
  ORDER BY agg.total_cents DESC;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------
-- 🚨 Recreating a SECURITY DEFINER function re-grants EXECUTE to `anon` via
-- Supabase's default privileges. `REVOKE ... FROM PUBLIC` alone is NOT enough —
-- `anon` must be named explicitly, or these functions leak every customer's
-- outstanding balance to an unauthenticated caller (the 00092 / 00070 lesson).
REVOKE EXECUTE ON FUNCTION public.get_payment_overview_orders(uuid)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_payment_overview_customers(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_payment_overview_orders(uuid)  TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.get_payment_overview_customers(date) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Post-apply assertions (run on BOTH databases)
-- ---------------------------------------------------------------------------
-- a) anon must have no access -- both must be false:
--    SELECT has_function_privilege('anon', 'public.get_payment_overview_orders(uuid)', 'EXECUTE'),
--           has_function_privilege('anon', 'public.get_payment_overview_customers(date)', 'EXECUTE');
--
-- b) a shop_manager must be refused. In a rolled-back transaction:
--    BEGIN;
--      SET LOCAL role authenticated;
--      SET LOCAL request.jwt.claims TO '{"sub":"<a shop_manager profile id>","role":"authenticated"}';
--      SELECT * FROM get_payment_overview_customers();   -- expect: ERROR Not authorized
--    ROLLBACK;
