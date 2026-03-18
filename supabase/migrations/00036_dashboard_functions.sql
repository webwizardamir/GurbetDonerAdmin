-- Dashboard RPC functions for today-focused KPIs
-- These complement the existing get_dashboard_revenue() function

-- 1. get_today_stats(is_owner boolean)
-- Returns today's KPIs, role-aware (owner sees profit, shop_manager sees operational data)
CREATE OR REPLACE FUNCTION get_today_stats(p_is_owner boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_today date := CURRENT_DATE;
  v_yesterday date := CURRENT_DATE - 1;
BEGIN
  IF p_is_owner THEN
    SELECT jsonb_build_object(
      'orders_today', COALESCE(t.orders_today, 0),
      'revenue_today', COALESCE(t.revenue_today, 0),
      'profit_today', COALESCE(t.revenue_today, 0) - COALESCE(t.cost_today, 0),
      'pending_count', COALESCE(p.pending_count, 0),
      'yesterday_revenue', COALESCE(y.yesterday_revenue, 0)
    ) INTO result
    FROM
      (SELECT
        COUNT(*)::int AS orders_today,
        COALESCE(SUM(total), 0)::bigint AS revenue_today,
        COALESCE((
          SELECT SUM(oi.cost_cents * oi.quantity)
          FROM order_items oi
          WHERE oi.order_id IN (
            SELECT id FROM orders
            WHERE order_date = v_today
              AND status NOT IN ('cancelled', 'refunded')
          )
        ), 0)::bigint AS cost_today
      FROM orders
      WHERE order_date = v_today
        AND status NOT IN ('cancelled', 'refunded')
      ) t,
      (SELECT COUNT(*)::int AS pending_count
       FROM orders
       WHERE status IN ('pending_payment', 'on_hold', 'draft')
      ) p,
      (SELECT COALESCE(SUM(total), 0)::bigint AS yesterday_revenue
       FROM orders
       WHERE order_date = v_yesterday
         AND status NOT IN ('cancelled', 'refunded')
      ) y;
  ELSE
    -- Shop manager: operational stats, no cost/profit
    SELECT jsonb_build_object(
      'orders_today', COALESCE(t.orders_today, 0),
      'items_to_pick', COALESCE(t.items_to_pick, 0),
      'pending_count', COALESCE(p.pending_count, 0),
      'deliveries_today', COALESCE(d.deliveries_today, 0)
    ) INTO result
    FROM
      (SELECT
        COUNT(*)::int AS orders_today,
        COALESCE((
          SELECT COUNT(*)::int
          FROM order_items oi
          WHERE oi.order_id IN (
            SELECT id FROM orders
            WHERE order_date = v_today
              AND status IN ('pending_payment', 'on_hold', 'draft')
          )
        ), 0) AS items_to_pick
      FROM orders
      WHERE order_date = v_today
        AND status NOT IN ('cancelled', 'refunded')
      ) t,
      (SELECT COUNT(*)::int AS pending_count
       FROM orders
       WHERE status IN ('pending_payment', 'on_hold', 'draft')
      ) p,
      (SELECT COUNT(*)::int AS deliveries_today
       FROM orders
       WHERE order_date = v_today
         AND status = 'completed'
      ) d;
  END IF;

  RETURN result;
END;
$$;

-- 2. get_weekly_stats(is_owner boolean)
-- Returns this week vs last week comparison with % change
CREATE OR REPLACE FUNCTION get_weekly_stats(p_is_owner boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_week_start date := date_trunc('week', CURRENT_DATE)::date;  -- Monday
  v_week_end date := CURRENT_DATE;
  v_last_week_start date := (date_trunc('week', CURRENT_DATE) - interval '7 days')::date;
  v_last_week_end date := (date_trunc('week', CURRENT_DATE) - interval '1 day')::date;
BEGIN
  SELECT jsonb_build_object(
    'this_week_revenue', COALESCE(tw.revenue, 0),
    'this_week_orders', COALESCE(tw.order_count, 0),
    'last_week_revenue', COALESCE(lw.revenue, 0),
    'last_week_orders', COALESCE(lw.order_count, 0),
    'revenue_change_pct', CASE
      WHEN COALESCE(lw.revenue, 0) > 0
      THEN ROUND(((COALESCE(tw.revenue, 0) - lw.revenue)::numeric / lw.revenue) * 100, 1)
      WHEN COALESCE(tw.revenue, 0) > 0 THEN 100
      ELSE 0
    END,
    'orders_change_pct', CASE
      WHEN COALESCE(lw.order_count, 0) > 0
      THEN ROUND(((COALESCE(tw.order_count, 0) - lw.order_count)::numeric / lw.order_count) * 100, 1)
      WHEN COALESCE(tw.order_count, 0) > 0 THEN 100
      ELSE 0
    END
  ) INTO result
  FROM
    (SELECT
      COALESCE(SUM(total), 0)::bigint AS revenue,
      COUNT(*)::int AS order_count
     FROM orders
     WHERE order_date >= v_week_start AND order_date <= v_week_end
       AND status NOT IN ('cancelled', 'refunded')
    ) tw,
    (SELECT
      COALESCE(SUM(total), 0)::bigint AS revenue,
      COUNT(*)::int AS order_count
     FROM orders
     WHERE order_date >= v_last_week_start AND order_date <= v_last_week_end
       AND status NOT IN ('cancelled', 'refunded')
    ) lw;

  RETURN result;
END;
$$;

-- 3. get_action_required()
-- Returns counts of items needing attention
CREATE OR REPLACE FUNCTION get_action_required()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'overdue_payments', COALESCE(op.cnt, 0),
    'zero_stock_count', COALESCE(zs.cnt, 0),
    'orders_on_hold', COALESCE(oh.cnt, 0)
  ) INTO result
  FROM
    (SELECT COUNT(*)::int AS cnt
     FROM orders
     WHERE status = 'pending_payment'
       AND created_at < (NOW() - interval '3 days')
    ) op,
    (SELECT COUNT(*)::int AS cnt
     FROM products
     WHERE track_stock = true
       AND stock_quantity <= 0
    ) zs,
    (SELECT COUNT(*)::int AS cnt
     FROM orders
     WHERE status = 'on_hold'
    ) oh;

  RETURN result;
END;
$$;

-- 4. get_today_orders_by_status()
-- Returns today's orders grouped by status with counts and totals
CREATE OR REPLACE FUNCTION get_today_orders_by_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(s)::jsonb), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      status,
      COUNT(*)::int AS count,
      COALESCE(SUM(total), 0)::bigint AS total_amount
    FROM orders
    WHERE order_date = CURRENT_DATE
    GROUP BY status
    ORDER BY
      CASE status
        WHEN 'draft' THEN 1
        WHEN 'pending_payment' THEN 2
        WHEN 'on_hold' THEN 3
        WHEN 'completed' THEN 4
        WHEN 'refunded' THEN 5
        WHEN 'cancelled' THEN 6
        ELSE 7
      END
  ) s;

  RETURN result;
END;
$$;
