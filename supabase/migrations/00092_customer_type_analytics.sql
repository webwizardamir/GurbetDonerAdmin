-- 00092_customer_type_analytics.sql
-- Thread the admin-only customers.customer_type (migration 00091) through the
-- analytics RPCs so revenue/profit can be sliced by Horeca / Supermarkt / Overig,
-- and expose it on the sold-products breakdown so the day view can group/filter.
--
-- Each function is DROPPED then recreated because adding a trailing param is a
-- NEW overload (CREATE OR REPLACE would leave the old signature live → PostgREST
-- "function is not unique"); the sold-products breakdown changes its RETURN shape,
-- which also requires a drop. Bodies are copied VERBATIM from the live definitions
-- (00070 owner-gating via is_owner() + 00089 'draft' exclusion) and only the new
-- p_customer_type param + predicate are added. Grants are re-issued exactly:
-- the two SECURITY DEFINER analytics fns + the breakdown must REVOKE FROM PUBLIC
-- so COGS never re-leaks to anon (preserving 00070/00074).
--
-- customer_type is not a column on orders, so where a function does not usefully
-- join customers we filter with:  customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)

-- ===========================================================================
-- 1. get_order_performance (joins customers c)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_order_performance(date, date, text[], uuid, text);
CREATE FUNCTION get_order_performance(p_start_date date, p_end_date date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, order_number text, order_date date, customer_name text, status text, payment_method text, subtotal bigint, discount_amount bigint, tax_amount bigint, total bigint, total_cost bigint, profit bigint, profit_margin numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT o.id, o.order_number, o.order_date, c.company_name, o.status::text, o.payment_method::text,
    o.subtotal::bigint, COALESCE(o.discount,0)::bigint, COALESCE(o.tax,0)::bigint, o.total::bigint,
    CASE WHEN is_owner() THEN COALESCE(ic.cost,0)::bigint ELSE NULL END,
    CASE WHEN is_owner() THEN (o.subtotal-COALESCE(ic.cost,0))::bigint ELSE NULL END,
    CASE WHEN is_owner() AND o.subtotal>0 THEN ROUND(((o.subtotal-COALESCE(ic.cost,0))::numeric/o.subtotal)*100,1) ELSE NULL END
  FROM orders o JOIN customers c ON c.id=o.customer_id
  LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents*oi.quantity) as cost FROM order_items oi WHERE oi.order_id=o.id) ic ON true
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text=p_payment_method)
    AND (p_customer_type IS NULL OR c.customer_type = p_customer_type)
  ORDER BY o.order_date DESC, o.created_at DESC;
$function$;
GRANT EXECUTE ON FUNCTION get_order_performance(date, date, text[], uuid, text, text) TO anon, authenticated;

-- ===========================================================================
-- 2. get_customer_performance (joins customers c; predicate in outer WHERE)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_customer_performance(date, date, text[], uuid, text);
CREATE FUNCTION get_customer_performance(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(customer_id uuid, customer_name text, total_orders bigint, total_revenue bigint, total_cost bigint, total_profit bigint, profit_margin numeric, avg_order_value bigint, last_order_date date, first_order_date date)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.company_name, COUNT(DISTINCT o.id)::bigint, COALESCE(SUM(o.subtotal),0)::bigint,
    CASE WHEN is_owner() THEN COALESCE(SUM(ic.cost),0)::bigint ELSE NULL END,
    CASE WHEN is_owner() THEN (COALESCE(SUM(o.subtotal),0)-COALESCE(SUM(ic.cost),0))::bigint ELSE NULL END,
    CASE WHEN is_owner() AND SUM(o.subtotal)>0 THEN ROUND(((SUM(o.subtotal)-COALESCE(SUM(ic.cost),0))::numeric/SUM(o.subtotal))*100,1) ELSE NULL END,
    CASE WHEN COUNT(o.id)>0 THEN (SUM(o.subtotal)/COUNT(o.id))::bigint ELSE 0 END,
    MAX(o.order_date), MIN(o.order_date)
  FROM customers c LEFT JOIN orders o ON o.customer_id=c.id
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_start_date IS NULL OR o.order_date >= p_start_date) AND (p_end_date IS NULL OR o.order_date <= p_end_date)
    AND (p_payment_method IS NULL OR o.payment_method::text=p_payment_method)
  LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents*oi.quantity) as cost FROM order_items oi WHERE oi.order_id=o.id) ic ON true
  WHERE EXISTS (SELECT 1 FROM orders o2 WHERE o2.customer_id=c.id)
    AND (p_customer_id IS NULL OR c.id=p_customer_id)
    AND (p_customer_type IS NULL OR c.customer_type = p_customer_type)
  GROUP BY c.id, c.company_name ORDER BY SUM(o.subtotal) DESC NULLS LAST;
$function$;
GRANT EXECUTE ON FUNCTION get_customer_performance(date, date, text[], uuid, text, text) TO anon, authenticated;

-- ===========================================================================
-- 3. get_financial_summary (no usable customers join; subquery predicate x5)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_financial_summary(date, date, text[], uuid, text);
CREATE FUNCTION get_financial_summary(p_start date, p_end date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
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
    'netRevenue', COALESCE(cur.net, 0),
    'totalCogs', CASE WHEN is_owner() THEN COALESCE(cur.cogs, 0) ELSE NULL END,
    'grossProfit', CASE WHEN is_owner() THEN COALESCE(cur.net, 0) - COALESCE(cur.cogs, 0) ELSE NULL END,
    'grossMargin', CASE WHEN is_owner() AND COALESCE(cur.net, 0) > 0 THEN round(((COALESCE(cur.net, 0) - COALESCE(cur.cogs, 0))::numeric / cur.net) * 100, 1) ELSE NULL END,
    'vatCollected', COALESCE(cur.vat, 0), 'cashRevenue', COALESCE(cur.cash, 0), 'bankRevenue', COALESCE(cur.bank, 0),
    'orderCount', COALESCE(cur.cnt, 0), 'itemsSold', COALESCE(cur.items_sold, 0),
    'avgOrderValue', CASE WHEN COALESCE(cur.cnt, 0) > 0 THEN round(COALESCE(cur.net, 0)::numeric / cur.cnt) ELSE 0 END,
    'prev', json_build_object('grossRevenue', COALESCE(prev.net, 0),
      'grossProfit', CASE WHEN is_owner() THEN COALESCE(prev.net, 0) - COALESCE(prev.cogs, 0) ELSE NULL END, 'orderCount', COALESCE(prev.cnt, 0))
  ) INTO result FROM (
    SELECT SUM(o.subtotal) as net, SUM(o.discount) as discounts, SUM(o.tax) as vat,
      SUM(CASE WHEN o.payment_method = 'cash' THEN o.subtotal ELSE 0 END) as cash,
      SUM(CASE WHEN o.payment_method = 'bank' THEN o.subtotal ELSE 0 END) as bank, COUNT(*) as cnt,
      (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as items_sold,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders o WHERE o.order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR o.customer_id = p_customer_id) AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
  ) cur, (
    SELECT SUM(o.subtotal) as net, COUNT(*) as cnt,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders o WHERE o.order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR o.customer_id = p_customer_id) AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
  ) prev;
  RETURN result;
END; $function$;
GRANT EXECUTE ON FUNCTION get_financial_summary(date, date, text[], uuid, text, text) TO anon, authenticated;

-- ===========================================================================
-- 4. get_kpis (no usable customers join; subquery predicate x5)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_kpis(date, date, text[], uuid, text);
CREATE FUNCTION get_kpis(p_start date, p_end date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE result json; v_prev_start date; v_prev_end date; v_days int;
BEGIN
  v_days := p_end - p_start; v_prev_end := p_start - 1; v_prev_start := v_prev_end - v_days;
  SELECT json_build_object(
    'totalRevenue', COALESCE(cur.revenue, 0),
    'totalOrders', COALESCE(cur.order_count, 0),
    'totalItems', COALESCE(cur.items, 0),
    'averageOrderValue', CASE WHEN COALESCE(cur.order_count,0) > 0 THEN round(COALESCE(cur.revenue,0)::numeric / cur.order_count) ELSE 0 END,
    'totalProfit', CASE WHEN is_owner() THEN COALESCE(cur.revenue, 0) - COALESCE(cur.cogs, 0) ELSE NULL END,
    'profitMargin', CASE WHEN is_owner() AND COALESCE(cur.revenue,0) > 0 THEN round(((COALESCE(cur.revenue,0) - COALESCE(cur.cogs,0))::numeric / cur.revenue) * 100, 1) ELSE NULL END,
    'revenueGrowth', CASE WHEN COALESCE(prev.revenue,0) > 0 THEN round(((COALESCE(cur.revenue,0) - prev.revenue)::numeric / prev.revenue) * 100, 1) ELSE 0 END,
    'orderGrowth', CASE WHEN COALESCE(prev.order_count,0) > 0 THEN round(((COALESCE(cur.order_count,0) - prev.order_count)::numeric / prev.order_count) * 100, 1) ELSE 0 END,
    'profitGrowth', CASE WHEN is_owner() AND COALESCE(prev.revenue,0) - COALESCE(prev.cogs,0) > 0 THEN round((((COALESCE(cur.revenue,0) - COALESCE(cur.cogs,0)) - (prev.revenue - prev.cogs))::numeric / (prev.revenue - prev.cogs)) * 100, 1) ELSE NULL END,
    'prevRevenue', COALESCE(prev.revenue, 0),
    'prevOrders', COALESCE(prev.order_count, 0),
    'prevProfit', CASE WHEN is_owner() THEN COALESCE(prev.revenue, 0) - COALESCE(prev.cogs, 0) ELSE NULL END
  ) INTO result
  FROM (
    SELECT SUM(subtotal) as revenue, COUNT(*) as order_count,
      (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id IN
        (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as items,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN
        (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders WHERE order_date BETWEEN p_start AND p_end
    AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method)
  ) cur,
  (
    SELECT SUM(subtotal) as revenue, COUNT(*) as order_count,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN
        (SELECT id FROM orders WHERE order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders WHERE order_date BETWEEN v_prev_start AND v_prev_end
    AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method)
  ) prev;
  RETURN result;
END; $function$;
GRANT EXECUTE ON FUNCTION get_kpis(date, date, text[], uuid, text, text) TO anon, authenticated;

-- ===========================================================================
-- 5. get_revenue_by_day (no usable customers join; predicate in ON-clause)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_revenue_by_day(date, date, text[], uuid, text);
CREATE FUNCTION get_revenue_by_day(p_start date, p_end date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_to_json(t)),'[]'::json) FROM (
    SELECT d.dt::date as date, COALESCE(SUM(o.subtotal),0) as revenue,
      CASE WHEN is_owner() THEN COALESCE(SUM(o.subtotal),0)-COALESCE(SUM(items_cost.cost),0) ELSE NULL END as profit,
      COUNT(o.id) as "orderCount"
    FROM generate_series(p_start,p_end,'1 day'::interval) d(dt)
    LEFT JOIN orders o ON o.order_date=d.dt::date
      AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
      AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
      AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type))
      AND (p_payment_method IS NULL OR o.payment_method::text=p_payment_method)
    LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents*oi.quantity) as cost FROM order_items oi WHERE oi.order_id=o.id) items_cost ON true
    GROUP BY d.dt ORDER BY d.dt
  ) t;
$function$;
GRANT EXECUTE ON FUNCTION get_revenue_by_day(date, date, text[], uuid, text, text) TO anon, authenticated;

-- ===========================================================================
-- 6. get_top_customers (joins customers c; add ONLY p_customer_type)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_top_customers(date, date, integer, text[]);
CREATE FUNCTION get_top_customers(p_start_date date, p_end_date date, p_limit integer DEFAULT 10, p_statuses text[] DEFAULT NULL::text[], p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(customer_name text, order_count bigint, total_revenue bigint, total_profit bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT c.company_name, COUNT(DISTINCT o.id)::bigint, COALESCE(SUM(o.subtotal),0)::bigint,
    CASE WHEN is_owner() THEN (COALESCE(SUM(o.subtotal),0)-COALESCE(SUM(ic.cost),0))::bigint ELSE NULL END
  FROM orders o JOIN customers c ON c.id=o.customer_id
  LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents*oi.quantity) as cost FROM order_items oi WHERE oi.order_id=o.id) ic ON true
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_customer_type IS NULL OR c.customer_type = p_customer_type)
  GROUP BY c.company_name ORDER BY SUM(o.subtotal) DESC LIMIT p_limit;
$function$;
GRANT EXECUTE ON FUNCTION get_top_customers(date, date, integer, text[], text) TO anon, authenticated;

-- ===========================================================================
-- 7. get_product_performance (SECURITY DEFINER; alias c = categories, use subquery)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_product_performance(date, date, text[], uuid, text, uuid, text);
CREATE FUNCTION get_product_performance(p_start_date date, p_end_date date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_product_id uuid DEFAULT NULL::uuid, p_unit_type text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(product_name text, category_name text, total_revenue bigint, total_cogs bigint, total_profit bigint, profit_margin numeric, total_quantity numeric, order_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oi.product_name, COALESCE(c.name,''),
    SUM(oi.unit_price*oi.quantity)::bigint,
    CASE WHEN is_owner() THEN SUM(oi.cost_cents*oi.quantity)::bigint ELSE NULL END,
    CASE WHEN is_owner() THEN (SUM(oi.unit_price*oi.quantity)-SUM(oi.cost_cents*oi.quantity))::bigint ELSE NULL END,
    CASE WHEN is_owner() AND SUM(oi.unit_price*oi.quantity)>0 THEN ROUND(((SUM(oi.unit_price*oi.quantity)-SUM(oi.cost_cents*oi.quantity))::numeric/SUM(oi.unit_price*oi.quantity))*100,2) ELSE NULL END,
    SUM(oi.quantity)::numeric, COUNT(DISTINCT o.id)::integer
  FROM order_items oi JOIN orders o ON o.id=oi.order_id
  LEFT JOIN products p ON p.id=oi.product_id LEFT JOIN categories c ON c.id=p.category_id
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text=p_payment_method)
    AND (p_product_id IS NULL OR oi.product_id=p_product_id)
    AND (p_unit_type IS NULL OR oi.unit_type::text=p_unit_type)
    AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type))
  GROUP BY oi.product_name, c.name ORDER BY SUM(oi.unit_price*oi.quantity) DESC;
$function$;
-- REVOKE from PUBLIC *and* anon: Supabase default privileges grant EXECUTE to
-- anon directly, so revoking PUBLIC alone leaves anon able to run this and
-- re-exposes COGS (regressing 00070). Must name anon explicitly.
REVOKE EXECUTE ON FUNCTION get_product_performance(date, date, text[], uuid, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_product_performance(date, date, text[], uuid, text, uuid, text, text) TO authenticated, service_role;

-- ===========================================================================
-- 8. get_top_products (SECURITY DEFINER; no customers join, use subquery)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_top_products(date, date, integer, text[], uuid, text, uuid, text);
CREATE FUNCTION get_top_products(p_start_date date, p_end_date date, p_limit integer DEFAULT 10, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_product_id uuid DEFAULT NULL::uuid, p_unit_type text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(product_name text, total_quantity numeric, total_revenue bigint, total_profit bigint, unit_type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oi.product_name, SUM(oi.quantity)::numeric, SUM(oi.unit_price*oi.quantity)::bigint,
    CASE WHEN is_owner() THEN (SUM(oi.unit_price*oi.quantity)-SUM(oi.cost_cents*oi.quantity))::bigint ELSE NULL END,
    COALESCE(MAX(oi.unit_type),'piece')
  FROM order_items oi JOIN orders o ON o.id=oi.order_id
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text=p_payment_method)
    AND (p_product_id IS NULL OR oi.product_id=p_product_id)
    AND (p_unit_type IS NULL OR oi.unit_type::text=p_unit_type)
    AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type))
  GROUP BY oi.product_name ORDER BY SUM(oi.unit_price*oi.quantity) DESC LIMIT p_limit;
$function$;
REVOKE EXECUTE ON FUNCTION get_top_products(date, date, integer, text[], uuid, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_top_products(date, date, integer, text[], uuid, text, uuid, text, text) TO authenticated, service_role;

-- ===========================================================================
-- 9. get_sold_products_breakdown (SECURITY DEFINER; add returned customer_type)
-- ===========================================================================
DROP FUNCTION IF EXISTS get_sold_products_breakdown(date, date);
CREATE FUNCTION get_sold_products_breakdown(p_start_date date, p_end_date date)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, unit_type text, category_name text, customer_id uuid, customer_name text, customer_type text, city text, total_quantity numeric, total_revenue bigint, order_count integer, current_stock numeric, track_stock boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
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
    cust.customer_type                                                   AS customer_type,
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
$function$;
REVOKE EXECUTE ON FUNCTION get_sold_products_breakdown(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_sold_products_breakdown(date, date) TO authenticated, service_role;
