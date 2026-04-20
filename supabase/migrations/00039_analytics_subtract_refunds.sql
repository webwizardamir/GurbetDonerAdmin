-- Make revenue analytics WooCommerce-compatible: subtract refunds from revenue.
-- Rewritten as pure SQL functions (no PL/pgSQL DECLARE/INTO) to avoid parser quirks.

-- 1. get_dashboard_revenue: overall net revenue
CREATE OR REPLACE FUNCTION get_dashboard_revenue()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT COALESCE(SUM(total - COALESCE(refund_amount, 0)), 0)::bigint
  FROM orders
  WHERE status NOT IN ('cancelled', 'refunded');
$func$;

-- 2. get_today_stats: today's revenue minus refunds occurring today
CREATE OR REPLACE FUNCTION get_today_stats(p_is_owner boolean DEFAULT false)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  WITH
    t AS (
      SELECT
        COUNT(*)::int AS orders_today,
        COALESCE(SUM(total), 0)::bigint AS revenue_today,
        COALESCE((
          SELECT SUM(oi.cost_cents * oi.quantity)::bigint
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.order_date = CURRENT_DATE
            AND o.status NOT IN ('cancelled', 'refunded')
        ), 0)::bigint AS cost_today,
        COALESCE((
          SELECT COUNT(*)::int
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.order_date = CURRENT_DATE
            AND o.status IN ('pending_payment', 'on_hold', 'draft')
        ), 0) AS items_to_pick
      FROM orders
      WHERE order_date = CURRENT_DATE
        AND status NOT IN ('cancelled', 'refunded')
    ),
    rt AS (SELECT COALESCE(SUM(amount), 0)::bigint AS refunded_today      FROM order_refunds WHERE refund_date::date = CURRENT_DATE),
    ry AS (SELECT COALESCE(SUM(amount), 0)::bigint AS refunded_yesterday  FROM order_refunds WHERE refund_date::date = CURRENT_DATE - 1),
    y  AS (SELECT COALESCE(SUM(total), 0)::bigint AS yesterday_revenue    FROM orders WHERE order_date = CURRENT_DATE - 1 AND status NOT IN ('cancelled', 'refunded')),
    p  AS (SELECT COUNT(*)::int AS pending_count FROM orders WHERE status IN ('pending_payment', 'on_hold', 'draft')),
    d  AS (SELECT COUNT(*)::int AS deliveries_today FROM orders WHERE order_date = CURRENT_DATE AND status = 'completed')
  SELECT CASE WHEN p_is_owner THEN
    jsonb_build_object(
      'orders_today',      t.orders_today,
      'revenue_today',     GREATEST(t.revenue_today - rt.refunded_today, 0),
      'profit_today',      GREATEST(t.revenue_today - rt.refunded_today, 0) - t.cost_today,
      'pending_count',     p.pending_count,
      'yesterday_revenue', GREATEST(y.yesterday_revenue - ry.refunded_yesterday, 0)
    )
  ELSE
    jsonb_build_object(
      'orders_today',     t.orders_today,
      'items_to_pick',    t.items_to_pick,
      'pending_count',    p.pending_count,
      'deliveries_today', d.deliveries_today
    )
  END
  FROM t, rt, ry, y, p, d;
$func$;

-- 3. get_weekly_stats: this week vs last week, net of refunds (by refund_date)
CREATE OR REPLACE FUNCTION get_weekly_stats(p_is_owner boolean DEFAULT false)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  WITH
    tw AS (
      SELECT
        COALESCE(SUM(total), 0)::bigint AS revenue,
        COUNT(*)::int AS order_count
      FROM orders
      WHERE order_date >= date_trunc('week', CURRENT_DATE)::date
        AND order_date <= CURRENT_DATE
        AND status NOT IN ('cancelled', 'refunded')
    ),
    lw AS (
      SELECT
        COALESCE(SUM(total), 0)::bigint AS revenue,
        COUNT(*)::int AS order_count
      FROM orders
      WHERE order_date >= (date_trunc('week', CURRENT_DATE) - interval '7 days')::date
        AND order_date <= (date_trunc('week', CURRENT_DATE) - interval '1 day')::date
        AND status NOT IN ('cancelled', 'refunded')
    ),
    rtw AS (
      SELECT COALESCE(SUM(amount), 0)::bigint AS refunded
      FROM order_refunds
      WHERE refund_date::date BETWEEN date_trunc('week', CURRENT_DATE)::date AND CURRENT_DATE
    ),
    rlw AS (
      SELECT COALESCE(SUM(amount), 0)::bigint AS refunded
      FROM order_refunds
      WHERE refund_date::date BETWEEN (date_trunc('week', CURRENT_DATE) - interval '7 days')::date
                                  AND (date_trunc('week', CURRENT_DATE) - interval '1 day')::date
    )
  SELECT jsonb_build_object(
    'this_week_revenue',  GREATEST(tw.revenue - rtw.refunded, 0),
    'this_week_orders',   tw.order_count,
    'last_week_revenue',  GREATEST(lw.revenue - rlw.refunded, 0),
    'last_week_orders',   lw.order_count,
    'revenue_change_pct', CASE
      WHEN GREATEST(lw.revenue - rlw.refunded, 0) > 0
      THEN ROUND(
        ((GREATEST(tw.revenue - rtw.refunded, 0) - GREATEST(lw.revenue - rlw.refunded, 0))::numeric
         / GREATEST(lw.revenue - rlw.refunded, 1)) * 100, 1)
      WHEN GREATEST(tw.revenue - rtw.refunded, 0) > 0 THEN 100
      ELSE 0
    END,
    'orders_change_pct', CASE
      WHEN lw.order_count > 0
      THEN ROUND(((tw.order_count - lw.order_count)::numeric / lw.order_count) * 100, 1)
      WHEN tw.order_count > 0 THEN 100
      ELSE 0
    END
  )
  FROM tw, lw, rtw, rlw;
$func$;
