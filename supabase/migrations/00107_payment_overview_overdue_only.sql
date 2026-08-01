-- 00107 — The Betaaloverzicht lists ONLY overdue invoices.
--
-- The statement was built as a full statement of account: every open invoice,
-- with a "totaal openstaand" the customer could reconcile against their own
-- ledger. In practice that is not what it is being used for — it goes out to
-- customers who are late, and listing invoices that are not due yet alongside
-- them reads as chasing money that is not owed. Sohbet bbq cafe Restaurant
-- (3 overdue + FC-08570 due 03-08) and Pizza house (3 overdue + FC-08615 due
-- 05-08) are the cases that settled it.
--
-- `p_overdue_only` rather than a hard filter, because the two callers want
-- different things and CLAUDE.md's rule is that which-orders-qualify lives in
-- the RPC, never in a builder:
--   * the DOCUMENT builders pass TRUE  — the customer sees only what is late
--   * the ADMIN tab list passes FALSE — the owner keeps the full picture, which
--     is what makes the "4 facturen · 3 verlopen" split on a row readable
--
-- Overdue is `invoice_due_date < CURRENT_DATE`, matching the existing
-- days_overdue = GREATEST(0, CURRENT_DATE - due) definition: an invoice due
-- TODAY is not late. One live row sits exactly on that boundary today.
--
-- get_payment_overview_customers additionally returns `overdue_cents` so the
-- admin can show what the statement will actually total, next to the full
-- balance. Without it the tab would advertise an amount the PDF contradicts.
--
-- 🚨 Apply to BOTH pnimvwconhhmcwxcuxcz (Melek) and dvpnvulxkccurqkpqqnx (Gurbet).

-- Dropped in dependency order. plpgsql resolves function calls at runtime, so
-- recreating `_orders` under a new signature needs no change in `_customers`
-- (it calls the 1-arg form, which now binds to the DEFAULT).
DROP FUNCTION IF EXISTS public.get_payment_overview_customers(date);
DROP FUNCTION IF EXISTS public.get_payment_overview_orders(uuid);

CREATE FUNCTION public.get_payment_overview_orders(
  p_customer_id  uuid,
  p_overdue_only boolean DEFAULT false
)
RETURNS TABLE(
  order_id uuid, order_number text, invoice_number text, order_date date,
  invoice_due_date date, days_overdue integer, amount_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admits the service-role cron (auth.uid() IS NULL) AND the owner, and
  -- nobody else. A plain `NOT is_owner()` would lock the cron out.
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
    AND o.status NOT IN ('completed', 'cancelled', 'refunded', 'draft')
    AND COALESCE(inv.document_number, o.woo_invoice_number::text) IS NOT NULL
    AND (o.total - COALESCE(o.refund_amount, 0)) > 0
    AND (NOT p_overdue_only OR o.invoice_due_date < CURRENT_DATE)
  ORDER BY o.invoice_due_date ASC NULLS LAST, o.order_date ASC;
END;
$function$;

CREATE FUNCTION public.get_payment_overview_customers(p_period date DEFAULT NULL::date)
RETURNS TABLE(
  customer_id uuid, company_name text, email text, billing_country text,
  reminders_opted_out boolean, open_count integer, overdue_count integer,
  total_cents bigint, overdue_cents bigint, oldest_due_date date,
  last_overview_id uuid, last_period date, last_sent_at timestamp with time zone,
  last_send_status text
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
    agg.overdue_cents,
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
      -- What the statement will actually total, now that it lists overdue only.
      COALESCE(SUM(g.amount_cents) FILTER (WHERE g.days_overdue > 0), 0)::bigint
                                                                           AS overdue_cents,
      MIN(g.invoice_due_date)                                              AS oldest_due_date
    FROM get_payment_overview_orders(c.id) g    -- full picture: p_overdue_only defaults false
  ) agg ON TRUE
  LEFT JOIN payment_overviews po ON po.customer_id = c.id AND po.period = v_period
  LEFT JOIN document_sends   ds ON ds.id = po.document_send_id
  WHERE c.is_active
    AND agg.open_count > 0
  ORDER BY agg.total_cents DESC;
END;
$function$;

-- 🚨 Recreating a SECURITY DEFINER function re-grants EXECUTE to `anon` via
-- Supabase default privileges. REVOKE FROM PUBLIC alone is not enough.
REVOKE EXECUTE ON FUNCTION public.get_payment_overview_orders(uuid, boolean)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_payment_overview_customers(date)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_payment_overview_orders(uuid, boolean)    TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.get_payment_overview_customers(date)          TO authenticated, service_role;
