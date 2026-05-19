-- ============================================================================
-- 00047: Harden Phase 3-4 RPCs with admin guard + role-aware profit
-- ============================================================================
-- Fixes two HIGH-severity findings from the Phase 1-4 review:
--
-- (1) get_customer_items_summary leaks total_profit to Shop Manager when
--     called directly via supabase.rpc(...) from the JS client (the UI
--     hides the column but the RPC returned it for everyone). Now NULL
--     for non-owners.
--
-- (2) Both RPCs were SECURITY DEFINER without any caller authorization,
--     so any 'authenticated' user (including future customer-portal
--     accounts) could dump customer-level revenue and city breakdowns.
--     Now reject when is_admin_user() is false.
--
-- Status filter ('cancelled', 'refunded') is intentionally kept as-is to
-- match the existing dashboard RPC convention in 00036/00039/00041.
-- Changing it here without flipping every RPC would create an
-- inconsistent view of "revenue" across pages.
--
-- Safe to re-run.
-- ============================================================================

DROP FUNCTION IF EXISTS get_customer_items_summary(UUID, DATE, DATE);

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
LANGUAGE plpgsql
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
    (s.qty_gross - COALESCE(rf.qty_refunded, 0))::numeric,
    s.order_count,
    s.last_ordered,
    CASE
      WHEN s.qty_gross > 0
      THEN ROUND(s.revenue_gross::numeric / s.qty_gross)::bigint
      ELSE 0::bigint
    END,
    (s.revenue_gross - COALESCE(rf.amount_refunded, 0))::bigint,
    -- Profit hidden for non-owner roles. Shop Manager sees NULL even
    -- when calling the RPC directly via supabase.rpc(...).
    CASE
      WHEN is_owner()
      THEN (s.revenue_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::bigint
      ELSE NULL::bigint
    END
  FROM sold s
  LEFT JOIN refunded   rf ON rf.product_id = s.product_id
  LEFT JOIN products   p  ON p.id          = s.product_id
  LEFT JOIN categories c  ON c.id          = p.category_id
  ORDER BY (s.revenue_gross - COALESCE(rf.amount_refunded, 0)) DESC NULLS LAST;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_customer_items_summary(UUID, DATE, DATE) TO authenticated;

-- ---------------------------------------------------------------------------
-- get_sold_products_breakdown — admin guard only (no profit column to gate)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_sold_products_breakdown(DATE, DATE);

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
LANGUAGE plpgsql
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
    COALESCE(cat.name, '')::text,
    s.customer_id,
    cust.company_name,
    s.city,
    (s.qty_gross    - COALESCE(rf.qty_refunded, 0))::numeric,
    (s.revenue_gross - COALESCE(rf.amount_refunded, 0))::bigint,
    s.order_count,
    p.stock_quantity::numeric,
    COALESCE(p.track_stock, FALSE)
  FROM sold s
  LEFT JOIN refunded   rf   ON rf.product_id  = s.product_id
                            AND rf.customer_id = s.customer_id
                            AND rf.city        = s.city
  LEFT JOIN products   p    ON p.id           = s.product_id
  LEFT JOIN categories cat  ON cat.id         = p.category_id
  LEFT JOIN customers  cust ON cust.id        = s.customer_id
  WHERE (s.qty_gross - COALESCE(rf.qty_refunded, 0)) > 0
  ORDER BY (s.revenue_gross - COALESCE(rf.amount_refunded, 0)) DESC NULLS LAST;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_sold_products_breakdown(DATE, DATE) TO authenticated;
