-- Follow-ups for order trash (00065): exclude trashed orders (deleted_at set)
-- everywhere they must not appear. Trashed orders carry status='cancelled', so
-- analytics money RPCs already drop them, but these surfaces needed explicit
-- deleted_at handling:
--   1. Customer portal SELECT policy (a trashed order would otherwise still be
--      visible to the customer as a 'cancelled' order).
--   2. Status-count RPCs that GROUP BY status (the orders-page filter counts and
--      dashboard/analytics status breakdowns) — trashed orders would inflate the
--      'cancelled' / total counts.

-- 1. Portal: never expose trashed orders to the customer portal.
DROP POLICY IF EXISTS "Portal customers can view own orders" ON orders;
CREATE POLICY "Portal customers can view own orders" ON orders
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM customer_accounts
      WHERE customer_accounts.customer_id = orders.customer_id
        AND customer_accounts.user_id = auth.uid()
        AND customer_accounts.is_active = true
    )
  );

-- 2a. Orders-page status filter counts.
CREATE OR REPLACE FUNCTION public.get_order_stats_by_status()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT o.status::text, count(*)::bigint
  FROM orders o
  WHERE o.deleted_at IS NULL
  GROUP BY o.status;
$function$;

-- 2b. Analytics orders-by-status (date range).
CREATE OR REPLACE FUNCTION public.get_orders_by_status(p_start_date date, p_end_date date, p_statuses text[] DEFAULT NULL::text[])
RETURNS TABLE(status text, count bigint, revenue bigint)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT o.status::text, COUNT(*)::bigint, COALESCE(SUM(o.subtotal), 0)::bigint
  FROM orders o WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND o.deleted_at IS NULL
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
  GROUP BY o.status ORDER BY COUNT(*) DESC;
$function$;

-- 2c. Dashboard today-by-status.
CREATE OR REPLACE FUNCTION public.get_today_orders_by_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(s)::jsonb), '[]'::jsonb) INTO result
  FROM (
    SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::bigint AS total_amount
    FROM orders
    WHERE order_date = CURRENT_DATE AND deleted_at IS NULL
    GROUP BY status
    ORDER BY CASE status
        WHEN 'draft' THEN 1 WHEN 'pending_payment' THEN 2 WHEN 'on_hold' THEN 3
        WHEN 'completed' THEN 4 WHEN 'refunded' THEN 5 WHEN 'cancelled' THEN 6 ELSE 7 END
  ) s;
  RETURN result;
END;
$function$;
