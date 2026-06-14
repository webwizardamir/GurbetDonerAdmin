-- Analytics status filter
-- Adds an optional `p_statuses text[]` parameter to every date-range analytics RPC.
--
-- Behaviour:
--   p_statuses IS NULL (default)  -> unchanged: every order except cancelled/refunded
--   p_statuses IS NOT NULL        -> only orders whose status is in the array
--                                    (any status allowed, incl. cancelled/refunded;
--                                     figures are then the raw line totals for those orders)
--
-- The predicate is inlined per function as:
--   ((p_statuses IS NULL AND <col> NOT IN ('cancelled','refunded'))
--     OR (p_statuses IS NOT NULL AND <col>::text = ANY(p_statuses)))
--
-- All functions are DROPped first (signature changes) and recreated with the
-- new trailing parameter defaulted to NULL, so existing call sites keep working.

-- =====================================================================
-- FINANCIAL
-- =====================================================================
DROP FUNCTION IF EXISTS get_financial_summary(date, date);
CREATE OR REPLACE FUNCTION get_financial_summary(
  p_start date,
  p_end date,
  p_statuses text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE result json; v_prev_start date; v_prev_end date; v_days int;
BEGIN
  v_days := p_end - p_start; v_prev_end := p_start - 1; v_prev_start := v_prev_end - v_days;
  SELECT json_build_object(
    'grossRevenue', COALESCE(cur.net, 0), 'totalDiscounts', COALESCE(cur.discounts, 0),
    'netRevenue', COALESCE(cur.net, 0), 'totalCogs', COALESCE(cur.cogs, 0),
    'grossProfit', COALESCE(cur.net, 0) - COALESCE(cur.cogs, 0),
    'grossMargin', CASE WHEN COALESCE(cur.net, 0) > 0 THEN round(((COALESCE(cur.net, 0) - COALESCE(cur.cogs, 0))::numeric / cur.net) * 100, 1) ELSE 0 END,
    'vatCollected', COALESCE(cur.vat, 0), 'cashRevenue', COALESCE(cur.cash, 0), 'bankRevenue', COALESCE(cur.bank, 0),
    'orderCount', COALESCE(cur.cnt, 0), 'itemsSold', COALESCE(cur.items_sold, 0),
    'avgOrderValue', CASE WHEN COALESCE(cur.cnt, 0) > 0 THEN round(COALESCE(cur.net, 0)::numeric / cur.cnt) ELSE 0 END,
    'prev', json_build_object('grossRevenue', COALESCE(prev.net, 0),
      'grossProfit', COALESCE(prev.net, 0) - COALESCE(prev.cogs, 0), 'orderCount', COALESCE(prev.cnt, 0))
  ) INTO result FROM (
    SELECT SUM(o.subtotal) as net, SUM(o.discount) as discounts, SUM(o.tax) as vat,
      SUM(CASE WHEN o.payment_method = 'cash' THEN o.subtotal ELSE 0 END) as cash,
      SUM(CASE WHEN o.payment_method = 'bank' THEN o.subtotal ELSE 0 END) as bank, COUNT(*) as cnt,
      (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))))) as items_sold,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))))) as cogs
    FROM orders o WHERE o.order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  ) cur, (
    SELECT SUM(o.subtotal) as net, COUNT(*) as cnt,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))))) as cogs
    FROM orders o WHERE o.order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  ) prev;
  RETURN result;
END; $function$;
GRANT EXECUTE ON FUNCTION get_financial_summary(date, date, text[]) TO anon, authenticated;

-- =====================================================================
DROP FUNCTION IF EXISTS get_kpis(date, date);
CREATE OR REPLACE FUNCTION get_kpis(
  p_start date,
  p_end date,
  p_statuses text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  v_prev_start date;
  v_prev_end date;
  v_days int;
BEGIN
  v_days := p_end - p_start;
  v_prev_end := p_start - 1;
  v_prev_start := v_prev_end - v_days;

  SELECT json_build_object(
    'totalRevenue', COALESCE(cur.revenue, 0),
    'totalOrders', COALESCE(cur.order_count, 0),
    'totalItems', COALESCE(cur.items, 0),
    'averageOrderValue', CASE WHEN COALESCE(cur.order_count,0) > 0
      THEN round(COALESCE(cur.revenue,0)::numeric / cur.order_count) ELSE 0 END,
    'totalProfit', COALESCE(cur.revenue, 0) - COALESCE(cur.cogs, 0),
    'profitMargin', CASE WHEN COALESCE(cur.revenue,0) > 0
      THEN round(((COALESCE(cur.revenue,0) - COALESCE(cur.cogs,0))::numeric / cur.revenue) * 100, 1) ELSE 0 END,
    'revenueGrowth', CASE WHEN COALESCE(prev.revenue,0) > 0
      THEN round(((COALESCE(cur.revenue,0) - prev.revenue)::numeric / prev.revenue) * 100, 1) ELSE 0 END,
    'orderGrowth', CASE WHEN COALESCE(prev.order_count,0) > 0
      THEN round(((COALESCE(cur.order_count,0) - prev.order_count)::numeric / prev.order_count) * 100, 1) ELSE 0 END,
    'profitGrowth', CASE WHEN COALESCE(prev.revenue,0) - COALESCE(prev.cogs,0) > 0
      THEN round((((COALESCE(cur.revenue,0) - COALESCE(cur.cogs,0)) - (prev.revenue - prev.cogs))::numeric / (prev.revenue - prev.cogs)) * 100, 1) ELSE 0 END,
    'prevRevenue', COALESCE(prev.revenue, 0),
    'prevOrders', COALESCE(prev.order_count, 0),
    'prevProfit', COALESCE(prev.revenue, 0) - COALESCE(prev.cogs, 0)
  ) INTO result
  FROM (
    SELECT
      SUM(subtotal) as revenue,
      COUNT(*) as order_count,
      (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id IN
        (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))))) as items,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN
        (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))))) as cogs
    FROM orders
    WHERE order_date BETWEEN p_start AND p_end
    AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses)))
  ) cur,
  (
    SELECT
      SUM(subtotal) as revenue,
      COUNT(*) as order_count,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN
        (SELECT id FROM orders WHERE order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))))) as cogs
    FROM orders
    WHERE order_date BETWEEN v_prev_start AND v_prev_end
    AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses)))
  ) prev;

  RETURN result;
END;
$function$;
GRANT EXECUTE ON FUNCTION get_kpis(date, date, text[]) TO anon, authenticated;

-- =====================================================================
DROP FUNCTION IF EXISTS get_revenue_by_day(date, date);
CREATE OR REPLACE FUNCTION get_revenue_by_day(
  p_start date,
  p_end date,
  p_statuses text[] DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      d.dt::date as date,
      COALESCE(SUM(o.subtotal), 0) as revenue,
      COALESCE(SUM(o.subtotal), 0) - COALESCE(SUM(items_cost.cost), 0) as profit,
      COUNT(o.id) as "orderCount"
    FROM generate_series(p_start, p_end, '1 day'::interval) d(dt)
    LEFT JOIN orders o ON o.order_date = d.dt::date
      AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    LEFT JOIN LATERAL (
      SELECT SUM(oi.cost_cents * oi.quantity) as cost
      FROM order_items oi WHERE oi.order_id = o.id
    ) items_cost ON true
    GROUP BY d.dt
    ORDER BY d.dt
  ) t;
$function$;
GRANT EXECUTE ON FUNCTION get_revenue_by_day(date, date, text[]) TO anon, authenticated;

-- =====================================================================
DROP FUNCTION IF EXISTS get_revenue_by_payment_method(date, date);
CREATE OR REPLACE FUNCTION get_revenue_by_payment_method(
  p_start date,
  p_end date,
  p_statuses text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT o.payment_method AS method, count(*)::int AS count, coalesce(sum(o.subtotal), 0)::bigint AS revenue
    FROM orders o WHERE o.order_date BETWEEN p_start AND p_end
      AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
      AND o.payment_method IS NOT NULL AND o.payment_method != 'none'
    GROUP BY o.payment_method ORDER BY sum(o.subtotal) DESC
  ) t;
  RETURN coalesce(result, '[]'::json);
END; $function$;
GRANT EXECUTE ON FUNCTION get_revenue_by_payment_method(date, date, text[]) TO anon, authenticated;

-- =====================================================================
DROP FUNCTION IF EXISTS get_monthly_comparison(integer);
CREATE OR REPLACE FUNCTION get_monthly_comparison(
  p_year integer,
  p_statuses text[] DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.month), '[]'::json)
  FROM (
    SELECT
      m.month,
      CASE m.month
        WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mrt' WHEN 4 THEN 'Apr'
        WHEN 5 THEN 'Mei' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug'
        WHEN 9 THEN 'Sep' WHEN 10 THEN 'Okt' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
      END as "monthLabel",
      COALESCE(SUM(o.subtotal), 0) as revenue,
      COALESCE(SUM(o.subtotal), 0) - COALESCE(SUM(items_cost.cost), 0) as profit,
      COUNT(o.id) as orders
    FROM generate_series(1, 12) m(month)
    LEFT JOIN orders o ON EXTRACT(MONTH FROM o.order_date) = m.month
      AND EXTRACT(YEAR FROM o.order_date) = p_year
      AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    LEFT JOIN LATERAL (
      SELECT SUM(oi.cost_cents * oi.quantity) as cost
      FROM order_items oi WHERE oi.order_id = o.id
    ) items_cost ON true
    GROUP BY m.month
  ) t;
$function$;
GRANT EXECUTE ON FUNCTION get_monthly_comparison(integer, text[]) TO anon, authenticated;

-- =====================================================================
-- ORDERS
-- =====================================================================
DROP FUNCTION IF EXISTS get_order_performance(date, date);
CREATE OR REPLACE FUNCTION get_order_performance(
  p_start_date date,
  p_end_date date,
  p_statuses text[] DEFAULT NULL
)
RETURNS TABLE(order_id uuid, order_number text, order_date date, customer_name text, status text, payment_method text, subtotal bigint, discount_amount bigint, tax_amount bigint, total bigint, total_cost bigint, profit bigint, profit_margin numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT o.id, o.order_number, o.order_date, c.company_name, o.status::text, o.payment_method::text,
    o.subtotal::bigint, COALESCE(o.discount, 0)::bigint, COALESCE(o.tax, 0)::bigint, o.total::bigint,
    COALESCE(ic.cost, 0)::bigint, (o.subtotal - COALESCE(ic.cost, 0))::bigint,
    CASE WHEN o.subtotal > 0 THEN ROUND(((o.subtotal - COALESCE(ic.cost, 0))::numeric / o.subtotal) * 100, 1) ELSE 0 END
  FROM orders o JOIN customers c ON c.id = o.customer_id
  LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents * oi.quantity) as cost FROM order_items oi WHERE oi.order_id = o.id) ic ON true
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  ORDER BY o.order_date DESC, o.created_at DESC;
$function$;
GRANT EXECUTE ON FUNCTION get_order_performance(date, date, text[]) TO anon, authenticated;

-- =====================================================================
DROP FUNCTION IF EXISTS get_orders_by_status(date, date);
CREATE OR REPLACE FUNCTION get_orders_by_status(
  p_start_date date,
  p_end_date date,
  p_statuses text[] DEFAULT NULL
)
RETURNS TABLE(status text, count bigint, revenue bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT o.status::text, COUNT(*)::bigint, COALESCE(SUM(o.subtotal), 0)::bigint
  FROM orders o WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  GROUP BY o.status ORDER BY COUNT(*) DESC;
$function$;
GRANT EXECUTE ON FUNCTION get_orders_by_status(date, date, text[]) TO anon, authenticated;

-- =====================================================================
-- CUSTOMERS
-- =====================================================================
DROP FUNCTION IF EXISTS get_top_customers(date, date, integer);
CREATE OR REPLACE FUNCTION get_top_customers(
  p_start_date date,
  p_end_date date,
  p_limit integer DEFAULT 10,
  p_statuses text[] DEFAULT NULL
)
RETURNS TABLE(customer_name text, order_count bigint, total_revenue bigint, total_profit bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT c.company_name, COUNT(DISTINCT o.id)::bigint,
    COALESCE(SUM(o.subtotal), 0)::bigint,
    (COALESCE(SUM(o.subtotal), 0) - COALESCE(SUM(ic.cost), 0))::bigint
  FROM orders o JOIN customers c ON c.id = o.customer_id
  LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents * oi.quantity) as cost FROM order_items oi WHERE oi.order_id = o.id) ic ON true
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  GROUP BY c.company_name ORDER BY SUM(o.subtotal) DESC LIMIT p_limit;
$function$;
GRANT EXECUTE ON FUNCTION get_top_customers(date, date, integer, text[]) TO anon, authenticated;

-- =====================================================================
DROP FUNCTION IF EXISTS get_customer_performance(date, date);
CREATE OR REPLACE FUNCTION get_customer_performance(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_statuses text[] DEFAULT NULL
)
RETURNS TABLE(customer_id uuid, customer_name text, total_orders bigint, total_revenue bigint, total_cost bigint, total_profit bigint, profit_margin numeric, avg_order_value bigint, last_order_date date, first_order_date date)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT c.id, c.company_name, COUNT(DISTINCT o.id)::bigint, COALESCE(SUM(o.subtotal), 0)::bigint,
    COALESCE(SUM(ic.cost), 0)::bigint, (COALESCE(SUM(o.subtotal), 0) - COALESCE(SUM(ic.cost), 0))::bigint,
    CASE WHEN SUM(o.subtotal) > 0 THEN ROUND(((SUM(o.subtotal) - COALESCE(SUM(ic.cost), 0))::numeric / SUM(o.subtotal)) * 100, 1) ELSE 0 END,
    CASE WHEN COUNT(o.id) > 0 THEN (SUM(o.subtotal) / COUNT(o.id))::bigint ELSE 0 END,
    MAX(o.order_date), MIN(o.order_date)
  FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_start_date IS NULL OR o.order_date >= p_start_date) AND (p_end_date IS NULL OR o.order_date <= p_end_date)
  LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents * oi.quantity) as cost FROM order_items oi WHERE oi.order_id = o.id) ic ON true
  WHERE EXISTS (SELECT 1 FROM orders o2 WHERE o2.customer_id = c.id)
  GROUP BY c.id, c.company_name ORDER BY SUM(o.subtotal) DESC NULLS LAST;
$function$;
GRANT EXECUTE ON FUNCTION get_customer_performance(date, date, text[]) TO anon, authenticated;

-- =====================================================================
-- PRODUCTS (previously defined in 00041 — recreated with status filter)
-- =====================================================================
DROP FUNCTION IF EXISTS get_product_performance(date, date);
CREATE OR REPLACE FUNCTION get_product_performance(
  p_start_date date,
  p_end_date date,
  p_statuses text[] DEFAULT NULL
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
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  GROUP BY oi.product_name, c.name
  ORDER BY total_revenue DESC;
$func$;
GRANT EXECUTE ON FUNCTION get_product_performance(date, date, text[]) TO anon, authenticated;

-- =====================================================================
DROP FUNCTION IF EXISTS get_top_products(date, date, integer);
CREATE OR REPLACE FUNCTION get_top_products(
  p_start_date date,
  p_end_date date,
  p_limit integer DEFAULT 10,
  p_statuses text[] DEFAULT NULL
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
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  GROUP BY oi.product_name
  ORDER BY total_revenue DESC
  LIMIT p_limit;
$func$;
GRANT EXECUTE ON FUNCTION get_top_products(date, date, integer, text[]) TO anon, authenticated;

-- =====================================================================
DROP FUNCTION IF EXISTS get_revenue_by_category(date, date);
CREATE OR REPLACE FUNCTION get_revenue_by_category(
  p_start_date date,
  p_end_date date,
  p_statuses text[] DEFAULT NULL
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
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  GROUP BY c.name
  ORDER BY total_revenue DESC;
$func$;
GRANT EXECUTE ON FUNCTION get_revenue_by_category(date, date, text[]) TO anon, authenticated;
