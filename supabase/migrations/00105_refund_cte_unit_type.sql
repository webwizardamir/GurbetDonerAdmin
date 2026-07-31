-- 00105 — Refunds must be subtracted per UNIT TYPE, not per product.
--
-- Bug: in both get_sold_products_breakdown and get_customer_items_summary the
-- `sold` CTE groups by unit_type while the `refunded` CTE does NOT, and the join
-- matches on product_id (+ customer_id, city) only. A product sold in N unit
-- types therefore has its full refund subtracted from EVERY one of those N rows:
--
--   Patat, 10 kg (€100) + 5 doos (€150), refund of 2 doos (€60)
--   before → kg row €40, doos row €90   (€60 subtracted twice)
--   after  → kg row €100, doos row €90
--
-- In get_sold_products_breakdown the over-subtraction also feeds
-- `WHERE (s.qty_gross - qty_refunded) > 0`, so a legitimate unit row can vanish
-- from the report entirely rather than merely reading low.
--
-- Latent at time of writing (no order with both a refund and a multi-unit
-- product), but 76 (customer, product) pairs on Melek are already sold in more
-- than one unit type, so the first such refund would corrupt both reports.
--
-- unit_type is NOT stored on order_refund_items, so it comes from the refunded
-- order_items row. That FK is ON DELETE SET NULL and updateOrderWithItems
-- deletes-and-reinserts line items on every order edit, so the link CAN be
-- broken on an order that was edited after being refunded. The LATERAL fallback
-- recovers the unit from another line of the SAME order for the SAME product;
-- without it an orphaned refund would match no sold row and be dropped, which
-- would overstate revenue instead of understating it. Both directions are wrong,
-- so recover rather than pick one.
--
-- Bodies copied from the LIVE definitions on both projects (verified
-- byte-identical by md5), preserving the 00095 hidden_from_managers predicate in
-- both CTEs and the 'draft' exclusion. Only the refunded CTE and its join change.
--
-- 🚨 Apply to BOTH pnimvwconhhmcwxcuxcz (Melek) and dvpnvulxkccurqkpqqnx (Gurbet).

CREATE OR REPLACE FUNCTION public.get_sold_products_breakdown(p_start_date date, p_end_date date)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, unit_type text, category_name text, customer_id uuid, customer_name text, customer_type text, city text, total_quantity numeric, total_revenue bigint, order_count integer, current_stock numeric, track_stock boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH sold AS (
    SELECT oi.product_id, oi.product_name, oi.product_sku, oi.unit_type, o.customer_id,
      COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '') AS city,
      SUM(oi.quantity)::numeric AS qty_gross,
      SUM(oi.unit_price * oi.quantity)::bigint AS revenue_gross,
      COUNT(DISTINCT o.id)::integer AS order_count
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN customers c ON c.id = o.customer_id
    WHERE o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
      AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    GROUP BY oi.product_id, oi.product_name, oi.product_sku, oi.unit_type,
             o.customer_id, COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '')
  ),
  refunded AS (
    SELECT ori.product_id, COALESCE(oi.unit_type, fb.unit_type) AS unit_type, o.customer_id,
      COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '') AS city,
      SUM(ori.quantity)::numeric AS qty_refunded,
      SUM(ori.amount)::bigint AS amount_refunded
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    JOIN orders o ON o.id = r.order_id
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN order_items oi ON oi.id = ori.order_item_id
    LEFT JOIN LATERAL (
      SELECT oi2.unit_type
      FROM order_items oi2
      WHERE oi2.order_id = r.order_id AND oi2.product_id = ori.product_id
      ORDER BY oi2.created_at
      LIMIT 1
    ) fb ON oi.id IS NULL
    WHERE o.order_date BETWEEN p_start_date AND p_end_date
      AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    GROUP BY ori.product_id, COALESCE(oi.unit_type, fb.unit_type), o.customer_id,
             COALESCE(NULLIF(c.shipping_city, ''), c.billing_city, '')
  )
  SELECT s.product_id, s.product_name, s.product_sku, s.unit_type,
    COALESCE(cat.name, '') AS category_name,
    s.customer_id, cust.company_name AS customer_name, cust.customer_type AS customer_type, s.city,
    (s.qty_gross - COALESCE(rf.qty_refunded, 0))::numeric AS total_quantity,
    (s.revenue_gross - COALESCE(rf.amount_refunded, 0))::bigint AS total_revenue,
    s.order_count, p.stock_quantity::numeric AS current_stock,
    COALESCE(p.track_stock, FALSE) AS track_stock
  FROM sold s
  LEFT JOIN refunded rf
    ON rf.product_id = s.product_id
   AND rf.customer_id = s.customer_id
   AND rf.city = s.city
   AND rf.unit_type IS NOT DISTINCT FROM s.unit_type
  LEFT JOIN products p ON p.id = s.product_id
  LEFT JOIN categories cat ON cat.id = p.category_id
  LEFT JOIN customers cust ON cust.id = s.customer_id
  WHERE (s.qty_gross - COALESCE(rf.qty_refunded, 0)) > 0
  ORDER BY total_revenue DESC NULLS LAST;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_items_summary(p_customer_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(product_id uuid, product_code text, product_name text, category_name text, unit_type text, total_quantity numeric, order_count integer, last_ordered timestamp with time zone, avg_unit_price bigint, total_revenue bigint, total_profit bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;
  RETURN QUERY
  WITH sold AS (
    SELECT oi.product_id, oi.product_name, oi.unit_type,
      SUM(oi.quantity)::numeric AS qty_gross,
      SUM(oi.unit_price * oi.quantity)::bigint AS revenue_gross,
      SUM(oi.cost_cents * oi.quantity)::bigint AS cogs,
      COUNT(DISTINCT o.id)::integer AS order_count,
      MAX(o.order_date) AS last_ordered
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
      AND (NOT o.hidden_from_managers OR is_owner())
    GROUP BY oi.product_id, oi.product_name, oi.unit_type
  ),
  refunded AS (
    SELECT ori.product_id, COALESCE(oi.unit_type, fb.unit_type) AS unit_type,
      SUM(ori.quantity)::numeric AS qty_refunded,
      SUM(ori.amount)::bigint    AS amount_refunded
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    JOIN orders o        ON o.id = r.order_id
    LEFT JOIN order_items oi ON oi.id = ori.order_item_id
    LEFT JOIN LATERAL (
      SELECT oi2.unit_type
      FROM order_items oi2
      WHERE oi2.order_id = r.order_id AND oi2.product_id = ori.product_id
      ORDER BY oi2.created_at
      LIMIT 1
    ) fb ON oi.id IS NULL
    WHERE o.customer_id = p_customer_id
      AND o.order_date BETWEEN p_start_date AND p_end_date
      AND (NOT o.hidden_from_managers OR is_owner())
    GROUP BY ori.product_id, COALESCE(oi.unit_type, fb.unit_type)
  )
  SELECT s.product_id, p.product_code, s.product_name, COALESCE(c.name, ''),
    s.unit_type::text,
    (s.qty_gross - COALESCE(rf.qty_refunded, 0))::numeric,
    s.order_count,
    s.last_ordered::timestamptz,
    CASE WHEN s.qty_gross > 0 THEN ROUND(s.revenue_gross::numeric / s.qty_gross)::bigint ELSE 0::bigint END,
    (s.revenue_gross - COALESCE(rf.amount_refunded, 0))::bigint,
    CASE WHEN is_owner()
      THEN (s.revenue_gross - s.cogs - COALESCE(rf.amount_refunded, 0))::bigint
      ELSE NULL::bigint END
  FROM sold s
  LEFT JOIN refunded   rf ON rf.product_id = s.product_id
                         AND rf.unit_type IS NOT DISTINCT FROM s.unit_type
  LEFT JOIN products   p  ON p.id          = s.product_id
  LEFT JOIN categories c  ON c.id          = p.category_id
  ORDER BY (s.revenue_gross - COALESCE(rf.amount_refunded, 0)) DESC NULLS LAST;
END;
$function$;

-- 🚨 Recreating a SECURITY DEFINER function re-grants EXECUTE to `anon` via
-- Supabase's default privileges. REVOKE FROM PUBLIC alone is NOT enough — anon
-- holds its own grant. Regressing this re-leaks COGS to unauthenticated callers
-- (the 00070 / 00092 lesson).
REVOKE EXECUTE ON FUNCTION public.get_sold_products_breakdown(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_items_summary(uuid, date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_sold_products_breakdown(date, date) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_customer_items_summary(uuid, date, date) TO authenticated;
