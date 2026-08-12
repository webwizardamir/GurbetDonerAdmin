-- 00116: Portal dashboard stats — open orders, outstanding and overdue amounts
--
-- The portal home page showed four counters (total / pending / completed / lifetime
-- spend) and nothing about money owed. The two questions a B2B customer actually
-- opens the portal with are "what is still coming?" and "what do I still owe?".
--
-- 🚨 The payable set is a VERBATIM copy of `get_payment_overview_orders`'s
-- qualifying predicate (00102/00107): deleted_at IS NULL, status NOT IN
-- (completed, cancelled, refunded, draft), an invoice number exists (documents row
-- or woo_invoice_number), and total - refund_amount > 0. That function is what
-- builds the monthly Betaaloverzicht PDF the same customer is emailed, so a
-- divergence here would show them two different debts. Change one, change both.
-- "Overdue" is likewise `invoice_due_date < CURRENT_DATE` (due today is not late).
--
-- Amounts are cast through ROUND(...)::bigint because Gurbet's orders.total is
-- numeric while Melek's is integer (see CLAUDE.md → Money conventions).

CREATE OR REPLACE FUNCTION get_portal_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      o.status,
      o.order_date,
      o.invoice_due_date,
      (o.total - COALESCE(o.refund_amount, 0))::numeric AS net_cents,
      COALESCE(inv.document_number, o.woo_invoice_number::text) IS NOT NULL AS has_invoice
    FROM orders o
    LEFT JOIN LATERAL (
      SELECT d.document_number
      FROM documents d
      WHERE d.order_id = o.id AND d.document_type = 'invoice'
      ORDER BY d.generated_at DESC NULLS LAST
      LIMIT 1
    ) inv ON TRUE
    WHERE o.customer_id = get_portal_customer_id()
      AND o.deleted_at IS NULL
      AND o.status <> 'draft'
  ),
  -- Orders still on their way: everything that is neither finished nor written off.
  open_orders AS (
    SELECT * FROM scoped
    WHERE status IN ('pending', 'processing', 'pending_payment', 'on_hold')
  ),
  -- Money owed. Same set the Betaaloverzicht PDF bills.
  payable AS (
    SELECT * FROM scoped
    WHERE status NOT IN ('completed', 'cancelled', 'refunded')
      AND has_invoice
      AND net_cents > 0
  ),
  settled AS (
    SELECT * FROM scoped WHERE status IN ('completed', 'delivered')
  )
  SELECT json_build_object(
    'totalOrders',       (SELECT count(*) FROM scoped),
    'pendingOrders',     (SELECT count(*) FROM open_orders),
    'pendingAmount',     (SELECT ROUND(COALESCE(sum(net_cents), 0))::bigint FROM open_orders),
    'completedOrders',   (SELECT count(*) FROM settled),
    'totalSpent',        (SELECT ROUND(COALESCE(sum(net_cents), 0))::bigint FROM settled),
    'spentThisYear',     (SELECT ROUND(COALESCE(sum(net_cents), 0))::bigint FROM settled
                          WHERE order_date >= date_trunc('year', CURRENT_DATE)::date),
    -- COALESCE on the OUTSIDE: an empty set divides by NULL, not by zero.
    'averageOrderValue', (SELECT COALESCE(ROUND(sum(net_cents) / NULLIF(count(*), 0)), 0)::bigint
                          FROM settled),
    'lastOrderDate',     (SELECT max(order_date) FROM scoped),
    'outstandingCount',  (SELECT count(*) FROM payable),
    'outstandingAmount', (SELECT ROUND(COALESCE(sum(net_cents), 0))::bigint FROM payable),
    'overdueCount',      (SELECT count(*) FROM payable WHERE invoice_due_date < CURRENT_DATE),
    'overdueAmount',     (SELECT ROUND(COALESCE(sum(net_cents), 0))::bigint FROM payable
                          WHERE invoice_due_date < CURRENT_DATE),
    -- Earliest invoice that has not fallen due yet, so the tile can say "pay by".
    'nextDueDate',       (SELECT min(invoice_due_date) FROM payable
                          WHERE invoice_due_date >= CURRENT_DATE)
  );
$$;

-- Recreating a SECURITY DEFINER function re-grants EXECUTE to anon via Supabase's
-- default privileges. REVOKE FROM PUBLIC alone does not undo that.
REVOKE ALL ON FUNCTION get_portal_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_portal_stats() TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon', 'get_portal_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION 'get_portal_stats is still executable by anon';
  END IF;
  IF NOT has_function_privilege('authenticated', 'get_portal_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION 'get_portal_stats is not executable by authenticated';
  END IF;
END $$;
