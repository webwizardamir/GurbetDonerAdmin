-- Profit granularity & filterable analytics
-- =====================================================================
-- 1. Covering indexes for the per-order / per-product COGS aggregations.
-- 2. New owner-gated RPC get_customer_orders (per-order profit, refund-correct).
-- 3. Implement the two stub RPCs the UI already calls (get_slow_movers,
--    get_inventory_turnover) — previously returned empty.
-- 4. Add nullable filter params to the analytics RPCs so any tab can be sliced
--    by customer / payment method (order-grained) and product / unit type
--    (item-grained). All new params are TRAILING and DEFAULT NULL, so every
--    existing call site keeps working unchanged (same convention as 00054).
--
-- Profit convention (unchanged): revenue = orders.subtotal (ex-VAT, post-discount),
-- profit = revenue - SUM(order_items.cost_cents * quantity).
--
-- REFUNDS: get_customer_orders subtracts partial refunds (order_refund_items.amount,
-- ex-VAT) per order, mirroring get_customer_items_summary (00047). Folding partial
-- refund subtraction into the GLOBAL 00054 RPCs is deliberately DEFERRED to a future
-- migration (it would shift every dashboard total at once); they keep the existing
-- "exclude fully-refunded/cancelled orders" convention.

-- =====================================================================
-- 1. COVERING INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_order_items_order_cover
  ON order_items (order_id) INCLUDE (cost_cents, quantity, unit_price, product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_cover
  ON order_items (product_id) INCLUDE (quantity, cost_cents, unit_price, order_id);

-- =====================================================================
-- 2. get_customer_orders — per-order profit for one customer (owner-gated)
-- =====================================================================
DROP FUNCTION IF EXISTS get_customer_orders(uuid, date, date);
CREATE OR REPLACE FUNCTION get_customer_orders(
  p_customer_id uuid,
  p_start_date  date,
  p_end_date    date
)
RETURNS TABLE (
  order_id      uuid,
  order_number  text,
  order_date    date,
  status        text,
  subtotal      bigint,
  total_cost    bigint,
  profit        bigint,
  profit_margin numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  RETURN QUERY
  WITH sold AS (
    SELECT
      o.id                                       AS order_id,
      o.order_number,
      o.order_date,
      o.status::text                             AS status,
      o.subtotal::bigint                         AS subtotal_gross,
      COALESCE(SUM(oi.cost_cents * oi.quantity), 0)::bigint AS cogs
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY o.id, o.order_number, o.order_date, o.status, o.subtotal
  ),
  refunded AS (
    SELECT r.order_id, SUM(ori.amount)::bigint AS amount_refunded
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    JOIN orders o        ON o.id = r.order_id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
    GROUP BY r.order_id
  )
  SELECT
    s.order_id,
    s.order_number,
    s.order_date,
    s.status,
    (s.subtotal_gross - COALESCE(rf.amount_refunded, 0))::bigint AS subtotal,
    s.cogs                                                       AS total_cost,
    -- Profit/margin hidden for non-owner roles (NULL even via direct RPC call).
    CASE WHEN is_owner()
      THEN (s.subtotal_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::bigint
      ELSE NULL::bigint
    END                                                         AS profit,
    CASE
      WHEN is_owner() AND (s.subtotal_gross - COALESCE(rf.amount_refunded, 0)) > 0
      THEN ROUND(((s.subtotal_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::numeric
            / (s.subtotal_gross - COALESCE(rf.amount_refunded, 0))) * 100, 1)
      ELSE NULL::numeric
    END                                                         AS profit_margin
  FROM sold s
  LEFT JOIN refunded rf ON rf.order_id = s.order_id
  ORDER BY s.order_date DESC;
END;
$func$;
GRANT EXECUTE ON FUNCTION get_customer_orders(uuid, date, date) TO authenticated;

-- =====================================================================
-- 3a. get_slow_movers — products not sold within N days (UI already calls it)
-- =====================================================================
DROP FUNCTION IF EXISTS get_slow_movers(integer);
CREATE OR REPLACE FUNCTION get_slow_movers(
  p_days_since_last_sale integer DEFAULT 60
)
RETURNS TABLE (
  product_id           uuid,
  product_name         text,
  sku                  text,
  current_stock        numeric,
  stock_value          bigint,
  last_sale_date       date,
  days_since_last_sale integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT
    p.id,
    p.name,
    p.sku,
    p.stock_quantity::numeric,
    (p.stock_quantity * COALESCE(p.cost_cents, 0))::bigint,
    ls.last_sale_date,
    CASE WHEN ls.last_sale_date IS NOT NULL
      THEN (CURRENT_DATE - ls.last_sale_date)::integer ELSE NULL END
  FROM products p
  LEFT JOIN LATERAL (
    SELECT MAX(o.order_date) AS last_sale_date
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = p.id
      AND o.status NOT IN ('cancelled', 'refunded')
  ) ls ON true
  WHERE p.track_stock = true
    AND p.is_active = true
    AND p.stock_quantity > 0
    AND (ls.last_sale_date IS NULL OR ls.last_sale_date < CURRENT_DATE - p_days_since_last_sale)
  ORDER BY ls.last_sale_date ASC NULLS FIRST;
$func$;
GRANT EXECUTE ON FUNCTION get_slow_movers(integer) TO authenticated;

-- =====================================================================
-- 3b. get_inventory_turnover — COGS-in-period vs stock value (UI already calls it)
-- =====================================================================
DROP FUNCTION IF EXISTS get_inventory_turnover(date, date);
CREATE OR REPLACE FUNCTION get_inventory_turnover(
  p_start_date date,
  p_end_date   date
)
RETURNS TABLE (
  product_name   text,
  stock_qty      numeric,
  stock_value    bigint,
  cogs_in_period bigint,
  turnover_ratio numeric,
  days_to_sell   numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT
    p.name,
    p.stock_quantity::numeric,
    (p.stock_quantity * COALESCE(p.cost_cents, 0))::bigint AS stock_value,
    COALESCE(ic.cogs, 0)::bigint                           AS cogs_in_period,
    CASE WHEN (p.stock_quantity * COALESCE(p.cost_cents, 0)) > 0
      THEN ROUND(COALESCE(ic.cogs, 0)::numeric
            / (p.stock_quantity * COALESCE(p.cost_cents, 0)), 2)
      ELSE 0 END                                           AS turnover_ratio,
    CASE WHEN COALESCE(ic.cogs, 0) > 0
      THEN ROUND((p_end_date - p_start_date)::numeric
            / (COALESCE(ic.cogs, 0)::numeric
               / NULLIF(p.stock_quantity * COALESCE(p.cost_cents, 0), 0)), 1)
      ELSE NULL END                                        AS days_to_sell
  FROM products p
  LEFT JOIN LATERAL (
    SELECT SUM(oi.cost_cents * oi.quantity) AS cogs
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = p.id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded')
  ) ic ON true
  WHERE p.track_stock = true
    AND p.is_active = true
  ORDER BY turnover_ratio DESC NULLS LAST;
$func$;
GRANT EXECUTE ON FUNCTION get_inventory_turnover(date, date) TO authenticated;

-- =====================================================================
-- 4. FILTERABLE ANALYTICS RPCs
--    Order-grained  -> + p_customer_id, p_payment_method
--    Item-grained   -> + p_customer_id, p_payment_method, p_product_id, p_unit_type
-- =====================================================================

-- ---- get_order_performance (order-grained) --------------------------
DROP FUNCTION IF EXISTS get_order_performance(date, date, text[]);
CREATE OR REPLACE FUNCTION get_order_performance(
  p_start_date date,
  p_end_date date,
  p_statuses text[] DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL
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
    AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
  ORDER BY o.order_date DESC, o.created_at DESC;
$function$;
GRANT EXECUTE ON FUNCTION get_order_performance(date, date, text[], uuid, text) TO anon, authenticated;

-- ---- get_customer_performance (order-grained) -----------------------
DROP FUNCTION IF EXISTS get_customer_performance(date, date, text[]);
CREATE OR REPLACE FUNCTION get_customer_performance(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL
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
    AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
  LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents * oi.quantity) as cost FROM order_items oi WHERE oi.order_id = o.id) ic ON true
  WHERE EXISTS (SELECT 1 FROM orders o2 WHERE o2.customer_id = c.id)
    AND (p_customer_id IS NULL OR c.id = p_customer_id)
  GROUP BY c.id, c.company_name ORDER BY SUM(o.subtotal) DESC NULLS LAST;
$function$;
GRANT EXECUTE ON FUNCTION get_customer_performance(date, date, text[], uuid, text) TO anon, authenticated;

-- ---- get_financial_summary (order-grained) --------------------------
DROP FUNCTION IF EXISTS get_financial_summary(date, date, text[]);
CREATE OR REPLACE FUNCTION get_financial_summary(
  p_start date,
  p_end date,
  p_statuses text[] DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL
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
      (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as items_sold,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders o WHERE o.order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR o.customer_id = p_customer_id) AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
  ) cur, (
    SELECT SUM(o.subtotal) as net, COUNT(*) as cnt,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders o WHERE o.order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR o.customer_id = p_customer_id) AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
  ) prev;
  RETURN result;
END; $function$;
GRANT EXECUTE ON FUNCTION get_financial_summary(date, date, text[], uuid, text) TO anon, authenticated;

-- ---- get_kpis (order-grained) ---------------------------------------
DROP FUNCTION IF EXISTS get_kpis(date, date, text[]);
CREATE OR REPLACE FUNCTION get_kpis(
  p_start date,
  p_end date,
  p_statuses text[] DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL
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
        (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as items,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN
        (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders
    WHERE order_date BETWEEN p_start AND p_end
    AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method)
  ) cur,
  (
    SELECT
      SUM(subtotal) as revenue,
      COUNT(*) as order_count,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN
        (SELECT id FROM orders WHERE order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders
    WHERE order_date BETWEEN v_prev_start AND v_prev_end
    AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method)
  ) prev;

  RETURN result;
END;
$function$;
GRANT EXECUTE ON FUNCTION get_kpis(date, date, text[], uuid, text) TO anon, authenticated;

-- ---- get_revenue_by_day (order-grained) -----------------------------
DROP FUNCTION IF EXISTS get_revenue_by_day(date, date, text[]);
CREATE OR REPLACE FUNCTION get_revenue_by_day(
  p_start date,
  p_end date,
  p_statuses text[] DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL
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
      AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
      AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
    LEFT JOIN LATERAL (
      SELECT SUM(oi.cost_cents * oi.quantity) as cost
      FROM order_items oi WHERE oi.order_id = o.id
    ) items_cost ON true
    GROUP BY d.dt
    ORDER BY d.dt
  ) t;
$function$;
GRANT EXECUTE ON FUNCTION get_revenue_by_day(date, date, text[], uuid, text) TO anon, authenticated;

-- ---- get_product_performance (item-grained) -------------------------
DROP FUNCTION IF EXISTS get_product_performance(date, date, text[]);
CREATE OR REPLACE FUNCTION get_product_performance(
  p_start_date date,
  p_end_date date,
  p_statuses text[] DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_unit_type text DEFAULT NULL
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
    AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
    AND (p_product_id IS NULL OR oi.product_id = p_product_id)
    AND (p_unit_type IS NULL OR oi.unit_type::text = p_unit_type)
  GROUP BY oi.product_name, c.name
  ORDER BY total_revenue DESC;
$func$;
GRANT EXECUTE ON FUNCTION get_product_performance(date, date, text[], uuid, text, uuid, text) TO anon, authenticated;

-- ---- get_top_products (item-grained) --------------------------------
DROP FUNCTION IF EXISTS get_top_products(date, date, integer, text[]);
CREATE OR REPLACE FUNCTION get_top_products(
  p_start_date date,
  p_end_date date,
  p_limit integer DEFAULT 10,
  p_statuses text[] DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_unit_type text DEFAULT NULL
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
    AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
    AND (p_product_id IS NULL OR oi.product_id = p_product_id)
    AND (p_unit_type IS NULL OR oi.unit_type::text = p_unit_type)
  GROUP BY oi.product_name
  ORDER BY total_revenue DESC
  LIMIT p_limit;
$func$;
GRANT EXECUTE ON FUNCTION get_top_products(date, date, integer, text[], uuid, text, uuid, text) TO anon, authenticated;
