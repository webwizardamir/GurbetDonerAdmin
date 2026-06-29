-- Profit/cost in the dashboard must be gated server-side, not by a client-passed
-- flag. A shop_manager could call get_today_stats(true) and read profit otherwise.
-- Keep the param for call-site compatibility but AND it with is_owner().
CREATE OR REPLACE FUNCTION public.get_today_stats(p_is_owner boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH
    t AS (
      SELECT
        COUNT(*)::int AS orders_today,
        COALESCE(SUM(subtotal), 0)::bigint AS revenue_today,
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
    rt AS (
      SELECT COALESCE(SUM(ori.amount), 0)::bigint AS refunded_today
      FROM order_refund_items ori
      JOIN order_refunds r ON r.id = ori.refund_id
      WHERE r.refund_date::date = CURRENT_DATE
    ),
    ry AS (
      SELECT COALESCE(SUM(ori.amount), 0)::bigint AS refunded_yesterday
      FROM order_refund_items ori
      JOIN order_refunds r ON r.id = ori.refund_id
      WHERE r.refund_date::date = CURRENT_DATE - 1
    ),
    y  AS (SELECT COALESCE(SUM(subtotal), 0)::bigint AS yesterday_revenue FROM orders WHERE order_date = CURRENT_DATE - 1 AND status NOT IN ('cancelled', 'refunded')),
    p  AS (SELECT COUNT(*)::int AS pending_count FROM orders WHERE status IN ('pending_payment', 'on_hold', 'draft')),
    d  AS (SELECT COUNT(*)::int AS deliveries_today FROM orders WHERE order_date = CURRENT_DATE AND status = 'completed')
  SELECT CASE WHEN (p_is_owner AND is_owner()) THEN
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
$function$;
