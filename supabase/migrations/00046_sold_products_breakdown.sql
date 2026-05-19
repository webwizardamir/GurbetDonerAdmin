-- ============================================================================
-- 00046: get_sold_products_breakdown RPC for Phase 4
-- ============================================================================
-- Per-(product, unit, customer, city) breakdown for a date range. Frontend
-- aggregates up to whatever grouping the user picks (None / City / Customer),
-- applies city/customer/category/unit filters, and renders driver-routing
-- PDFs.
--
-- City resolution (per Q8a): shipping_city if present, else billing_city.
--
-- Cancelled and fully-refunded orders are excluded (matches the existing
-- get_sold_products / 00041 pattern). Refunds from order_refund_items are
-- subtracted per (product, customer) so net qty and revenue line up with
-- the customer-side analytics.
--
-- The existing flat get_sold_products RPC stays untouched — the page will
-- switch to this new function once the UI is wired up.
--
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sold_products_breakdown(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS TABLE (
  product_id     UUID,
  product_name   TEXT,
  product_sku    TEXT,
  unit_type      TEXT,
  category_name  TEXT,
  customer_id    UUID,
  customer_name  TEXT,
  city           TEXT,
  total_quantity NUMERIC,
  total_revenue  BIGINT,
  order_count    INTEGER,
  current_stock  NUMERIC,
  track_stock    BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  WITH sold AS (
    SELECT
      oi.product_id,
      oi.product_name,
      oi.product_sku,
      oi.unit_type,
      o.customer_id,
      COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '')        AS city,
      SUM(oi.quantity)::numeric                                        AS qty_gross,
      SUM(oi.unit_price * oi.quantity)::bigint                         AS revenue_gross,
      COUNT(DISTINCT o.id)::integer                                    AS order_count
    FROM order_items oi
    JOIN orders    o ON o.id = oi.order_id
    JOIN customers c ON c.id = o.customer_id
    WHERE o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY oi.product_id, oi.product_name, oi.product_sku, oi.unit_type,
             o.customer_id, COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '')
  ),
  refunded AS (
    -- Refunds are tracked at the (refund, product) level. We attribute
    -- the refund to whichever customer/city the parent order had.
    SELECT
      ori.product_id,
      o.customer_id,
      COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '') AS city,
      SUM(ori.quantity)::numeric AS qty_refunded,
      SUM(ori.amount)::bigint    AS amount_refunded
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    JOIN orders        o ON o.id = r.order_id
    JOIN customers     c ON c.id = o.customer_id
    WHERE o.order_date BETWEEN p_start_date AND p_end_date
    GROUP BY ori.product_id, o.customer_id,
             COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '')
  )
  SELECT
    s.product_id,
    s.product_name,
    s.product_sku,
    s.unit_type,
    COALESCE(cat.name, '')                                               AS category_name,
    s.customer_id,
    cust.company_name                                                    AS customer_name,
    s.city,
    (s.qty_gross    - COALESCE(rf.qty_refunded, 0))::numeric             AS total_quantity,
    (s.revenue_gross - COALESCE(rf.amount_refunded, 0))::bigint          AS total_revenue,
    s.order_count,
    p.stock_quantity::numeric                                            AS current_stock,
    COALESCE(p.track_stock, FALSE)                                       AS track_stock
  FROM sold s
  LEFT JOIN refunded   rf   ON rf.product_id  = s.product_id
                            AND rf.customer_id = s.customer_id
                            AND rf.city        = s.city
  LEFT JOIN products   p    ON p.id           = s.product_id
  LEFT JOIN categories cat  ON cat.id         = p.category_id
  LEFT JOIN customers  cust ON cust.id        = s.customer_id
  WHERE (s.qty_gross - COALESCE(rf.qty_refunded, 0)) > 0
  ORDER BY total_revenue DESC NULLS LAST;
$func$;

COMMENT ON FUNCTION get_sold_products_breakdown(DATE, DATE) IS
  'Per-(product, unit, customer, city) breakdown for the Sold Products page. City = shipping_city if present, else billing_city. Refunds subtracted per (product, customer, city). Used for driver-routing PDFs and customer/city filters.';

GRANT EXECUTE ON FUNCTION get_sold_products_breakdown(DATE, DATE) TO authenticated;
