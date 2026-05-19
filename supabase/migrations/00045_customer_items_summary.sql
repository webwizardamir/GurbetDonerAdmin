-- ============================================================================
-- 00045: get_customer_items_summary RPC
-- ============================================================================
-- Aggregate per-(product, unit) view of every item ever sold to a customer.
-- Used by the new "Products" tab on CustomerDetail.
--
-- Returns one row per (product_name, unit_type) — different unit types of the
-- same product are separate rows (matches the planner's "row per (product,
-- unit_type) pair").
--
-- Refund handling: refunded amount/quantity from order_refund_items is
-- subtracted out per product_id. Same pattern as the WC reconciliation tools
-- so net revenue here equals net revenue elsewhere.
--
-- Cancelled and fully-refunded orders are excluded (matches 00041's
-- product RPCs). Partial refunds stay in via the subtract logic.
--
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customer_items_summary(
  p_customer_id UUID,
  p_start_date  DATE,
  p_end_date    DATE
)
RETURNS TABLE (
  product_id      UUID,
  product_code    TEXT,
  product_name    TEXT,
  category_name   TEXT,
  unit_type       TEXT,
  total_quantity  NUMERIC,
  order_count     INTEGER,
  last_ordered    TIMESTAMPTZ,
  avg_unit_price  BIGINT,
  total_revenue   BIGINT,
  total_profit    BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  WITH sold AS (
    SELECT
      oi.product_id,
      oi.product_name,
      oi.unit_type,
      SUM(oi.quantity)::numeric              AS qty_gross,
      SUM(oi.unit_price * oi.quantity)::bigint AS revenue_gross,
      SUM(oi.cost_cents * oi.quantity)::bigint AS cogs,
      COUNT(DISTINCT o.id)::integer          AS order_count,
      MAX(o.order_date)                      AS last_ordered
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY oi.product_id, oi.product_name, oi.unit_type
  ),
  refunded AS (
    SELECT
      ori.product_id,
      SUM(ori.quantity)::numeric AS qty_refunded,
      SUM(ori.amount)::bigint    AS amount_refunded
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    JOIN orders o        ON o.id = r.order_id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
    GROUP BY ori.product_id
  )
  SELECT
    s.product_id,
    p.product_code,
    s.product_name,
    COALESCE(c.name, ''),
    s.unit_type,
    (s.qty_gross - COALESCE(rf.qty_refunded, 0))::numeric AS total_quantity,
    s.order_count,
    s.last_ordered,
    CASE
      WHEN s.qty_gross > 0
      THEN ROUND(s.revenue_gross::numeric / s.qty_gross)::bigint
      ELSE 0::bigint
    END AS avg_unit_price,
    (s.revenue_gross - COALESCE(rf.amount_refunded, 0))::bigint AS total_revenue,
    (s.revenue_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::bigint AS total_profit
  FROM sold s
  LEFT JOIN refunded   rf ON rf.product_id = s.product_id
  LEFT JOIN products   p  ON p.id          = s.product_id
  LEFT JOIN categories c  ON c.id          = p.category_id
  ORDER BY total_revenue DESC NULLS LAST;
$func$;

COMMENT ON FUNCTION get_customer_items_summary(UUID, DATE, DATE) IS
  'Per-(product, unit) sales summary for one customer over a date range. Refunds subtracted out from revenue and qty. Used by CustomerDetail Products tab.';

GRANT EXECUTE ON FUNCTION get_customer_items_summary(UUID, DATE, DATE) TO authenticated;
