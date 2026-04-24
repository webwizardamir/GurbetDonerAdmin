-- Align product-analytics RPCs with the rest of Analytics.
-- Sibling RPCs (get_order_performance, get_customer_performance, get_top_customers,
-- get_dashboard_revenue) count every order that is NOT cancelled or refunded — so
-- today's pending orders already show up on Overview/Orders/Customers/Financial.
--
-- The product-side RPCs filtered to status='completed' only, which is why the
-- Products tab appeared empty the same day an order was created.
-- This migration rewrites them to use the same status filter.

DROP FUNCTION IF EXISTS get_product_performance(date, date);
DROP FUNCTION IF EXISTS get_top_products(date, date, integer);
DROP FUNCTION IF EXISTS get_revenue_by_category(date, date);

-- =====================================================================
-- get_product_performance(start_date, end_date)
-- =====================================================================
CREATE OR REPLACE FUNCTION get_product_performance(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  product_name   text,
  category_name  text,
  total_revenue  bigint,
  total_cogs     bigint,
  total_profit   bigint,
  profit_margin  numeric,
  total_quantity numeric,
  order_count    integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT
    oi.product_name,
    COALESCE(c.name, '')                                            AS category_name,
    SUM(oi.unit_price * oi.quantity)::bigint                        AS total_revenue,
    SUM(oi.cost_cents  * oi.quantity)::bigint                       AS total_cogs,
    (SUM(oi.unit_price * oi.quantity)
       - SUM(oi.cost_cents * oi.quantity))::bigint                  AS total_profit,
    CASE
      WHEN SUM(oi.unit_price * oi.quantity) > 0
      THEN ROUND(
        ((SUM(oi.unit_price * oi.quantity) - SUM(oi.cost_cents * oi.quantity))::numeric
         / SUM(oi.unit_price * oi.quantity)) * 100, 2)
      ELSE 0
    END                                                             AS profit_margin,
    SUM(oi.quantity)::numeric                                       AS total_quantity,
    COUNT(DISTINCT o.id)::integer                                   AS order_count
  FROM order_items oi
  JOIN orders o      ON o.id = oi.order_id
  LEFT JOIN products p  ON p.id = oi.product_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND o.status NOT IN ('cancelled', 'refunded')
  GROUP BY oi.product_name, c.name
  ORDER BY total_revenue DESC;
$func$;

-- =====================================================================
-- get_top_products(start_date, end_date, limit)
-- =====================================================================
CREATE OR REPLACE FUNCTION get_top_products(
  p_start_date date,
  p_end_date date,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  product_name   text,
  total_quantity numeric,
  total_revenue  bigint,
  total_profit   bigint,
  unit_type      text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT
    oi.product_name,
    SUM(oi.quantity)::numeric                                       AS total_quantity,
    SUM(oi.unit_price * oi.quantity)::bigint                        AS total_revenue,
    (SUM(oi.unit_price * oi.quantity)
       - SUM(oi.cost_cents * oi.quantity))::bigint                  AS total_profit,
    COALESCE(MAX(oi.unit_type), 'piece')                            AS unit_type
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND o.status NOT IN ('cancelled', 'refunded')
  GROUP BY oi.product_name
  ORDER BY total_revenue DESC
  LIMIT p_limit;
$func$;

-- =====================================================================
-- get_revenue_by_category(start_date, end_date)
-- =====================================================================
CREATE OR REPLACE FUNCTION get_revenue_by_category(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  category_name  text,
  total_revenue  bigint,
  total_cogs     bigint,
  total_profit   bigint,
  profit_margin  numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT
    COALESCE(c.name, '')                                            AS category_name,
    SUM(oi.unit_price * oi.quantity)::bigint                        AS total_revenue,
    SUM(oi.cost_cents  * oi.quantity)::bigint                       AS total_cogs,
    (SUM(oi.unit_price * oi.quantity)
       - SUM(oi.cost_cents * oi.quantity))::bigint                  AS total_profit,
    CASE
      WHEN SUM(oi.unit_price * oi.quantity) > 0
      THEN ROUND(
        ((SUM(oi.unit_price * oi.quantity) - SUM(oi.cost_cents * oi.quantity))::numeric
         / SUM(oi.unit_price * oi.quantity)) * 100, 2)
      ELSE 0
    END                                                             AS profit_margin
  FROM order_items oi
  JOIN orders o      ON o.id = oi.order_id
  LEFT JOIN products p  ON p.id = oi.product_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND o.status NOT IN ('cancelled', 'refunded')
  GROUP BY c.name
  ORDER BY total_revenue DESC;
$func$;

GRANT EXECUTE ON FUNCTION get_product_performance(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_products(date, date, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_by_category(date, date) TO anon, authenticated;
