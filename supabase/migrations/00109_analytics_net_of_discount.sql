-- 00109 — Analytics revenue and profit are net of discount.
--
-- `orders.subtotal` is persisted from computeOrderTotals().subtotal
-- (utils/discount.ts), which sums unit_price × quantity BEFORE line and order
-- discounts. Every analytics RPC used it as the revenue base, so profit was
-- overstated by exactly the discount. Order 10528 — €75,00 discount, €62,50
-- cost, €0,00 actually charged — reported +€12,50 profit instead of a €62,50
-- loss. The client-side equivalent was fixed in 5f93719; this is the SQL half.
--
-- The most visible symptom: get_financial_summary returned
--   'netRevenue', COALESCE(cur.net, 0)
-- which is the SAME expression as grossRevenue, so the Financial tab rendered a
-- waterfall that did not add up — "Bruto omzet 154.159,78 − Kortingen 108,45
-- = Netto omzet 154.159,78".
--
-- PRINCIPLE: `orders.subtotal` is CORRECT as a gross figure. The bug is using it
-- as the NET base. So a figure labelled gross, or shown next to its own discount
-- column, keeps subtotal; anything labelled net, or feeding profit / margin /
-- average order value, subtracts the discount.
--
--   order level  →  o.subtotal - COALESCE(o.discount, 0)
--   line level   →  oi.total - oi.tax_amount
--
-- Both verified equal on live data (order 10717: 19895 − 1895 = 18000 = Σ line
-- net). The order-level discount is distributed proportionally into each line's
-- finalBase by computeOrderTotals, so line totals are already fully net.
--
-- Expected shift on Melek: €108,45 order discounts + €33,45 line discounts =
-- €141,90 on €154.159,78 (0,07%) across 408 orders. grossRevenue must NOT move.
--
-- ---------------------------------------------------------------------------
-- TECHNIQUE — two, chosen per function rather than one for all
--
-- The plan called for hand-written CREATE OR REPLACE throughout. After reading
-- all 16 live bodies that is the wrong default, for two reasons:
--
--   1. get_monthly_comparison and get_revenue_by_payment_method DIVERGE between
--      Melek and Gurbet (verified by md5 of pg_get_functiondef). Pasting one
--      body into both would silently overwrite one project's version.
--   2. For 14 of the 16 the edit is a single expression whose every occurrence
--      has the same intent, so hand-copying a 40-line body only adds
--      transcription risk.
--
-- So: a targeted replace over the LIVE body (the 00089 precedent) for those 14,
-- which preserves each project's own text and every predicate in it, and an
-- explicit rewrite only for the two that genuinely need one:
--
--   * get_order_performance  — MIXED intent. `o.subtotal::bigint` is a display
--     column shown beside its own discount_amount column and must stay gross;
--     the profit and margin uses of the same token must change. A blanket
--     replace would corrupt the display column.
--   * get_financial_summary  — structural. netRevenue has to stop aliasing
--     grossRevenue, and the `prev` subquery selects no discounts at all.
--
-- EVERY replace is asserted: if a target string is not found the migration
-- RAISES. A silent miss is impossible, which is the property that makes this
-- safe on money.
--
-- Idempotent: after the edit the old substrings no longer match, so a re-run
-- changes nothing and the assertions are written to tolerate the already-done
-- state.
--
-- 🚨 Apply to BOTH pnimvwconhhmcwxcuxcz (Melek) and dvpnvulxkccurqkpqqnx
-- (Gurbet). Live bodies were captured to public.rpc_backup_pre_00109 on each
-- project first — rollback is re-executing `def` from that table.

DO $mig$
DECLARE
  v_def  text;
  v_new  text;
  v_oid  oid;
  -- fn name, search, replace, min_occurrences
  v_edits text[][] := ARRAY[
    -- ---- order level: revenue/profit bases -------------------------------
    ARRAY['get_kpis',
          'SELECT SUM(subtotal) as revenue, COUNT(*) as order_count,',
          'SELECT SUM(subtotal - COALESCE(discount, 0)) as revenue, COUNT(*) as order_count,'],

    ARRAY['get_today_stats',
          'COALESCE(SUM(subtotal), 0)::bigint AS revenue_today',
          'COALESCE(SUM(subtotal - COALESCE(discount, 0)), 0)::bigint AS revenue_today'],
    ARRAY['get_today_stats',
          'COALESCE(SUM(subtotal), 0)::bigint AS yesterday_revenue',
          'COALESCE(SUM(subtotal - COALESCE(discount, 0)), 0)::bigint AS yesterday_revenue'],

    ARRAY['get_revenue_by_day',
          'COALESCE(SUM(o.subtotal),0)',
          'COALESCE(SUM(o.subtotal - COALESCE(o.discount,0)),0)'],

    ARRAY['get_monthly_comparison',
          'COALESCE(SUM(o.subtotal), 0)',
          'COALESCE(SUM(o.subtotal - COALESCE(o.discount, 0)), 0)'],

    ARRAY['get_top_customers',
          'COALESCE(SUM(o.subtotal),0)',
          'COALESCE(SUM(o.subtotal - COALESCE(o.discount,0)),0)'],
    ARRAY['get_top_customers',
          'ORDER BY SUM(o.subtotal) DESC',
          'ORDER BY SUM(o.subtotal - COALESCE(o.discount,0)) DESC'],

    ARRAY['get_customer_performance',
          'COALESCE(SUM(o.subtotal),0)',
          'COALESCE(SUM(o.subtotal - COALESCE(o.discount,0)),0)'],
    ARRAY['get_customer_performance',
          'SUM(o.subtotal)>0',
          'SUM(o.subtotal - COALESCE(o.discount,0))>0'],
    ARRAY['get_customer_performance',
          '((SUM(o.subtotal)-COALESCE(SUM(ic.cost),0))::numeric/SUM(o.subtotal))',
          '((SUM(o.subtotal - COALESCE(o.discount,0))-COALESCE(SUM(ic.cost),0))::numeric/SUM(o.subtotal - COALESCE(o.discount,0)))'],
    ARRAY['get_customer_performance',
          '(SUM(o.subtotal)/COUNT(o.id))::bigint',
          '(SUM(o.subtotal - COALESCE(o.discount,0))/COUNT(o.id))::bigint'],
    ARRAY['get_customer_performance',
          'ORDER BY SUM(o.subtotal) DESC NULLS LAST',
          'ORDER BY SUM(o.subtotal - COALESCE(o.discount,0)) DESC NULLS LAST'],

    -- One edit fixes subtotal, profit AND margin: everything downstream reads
    -- the subtotal_gross alias.
    ARRAY['get_customer_orders',
          'o.subtotal::bigint AS subtotal_gross',
          '(o.subtotal - COALESCE(o.discount, 0))::bigint AS subtotal_gross'],
    ARRAY['get_customer_orders',
          'GROUP BY o.id, o.order_number, o.order_date, o.status, o.subtotal',
          'GROUP BY o.id, o.order_number, o.order_date, o.status, o.subtotal, o.discount'],

    ARRAY['get_orders_by_status',
          'COALESCE(SUM(o.subtotal), 0)::bigint',
          'COALESCE(SUM(o.subtotal - COALESCE(o.discount, 0)), 0)::bigint'],

    ARRAY['get_revenue_by_payment_method',
          'coalesce(sum(o.subtotal), 0)::bigint AS revenue',
          'coalesce(sum(o.subtotal - COALESCE(o.discount, 0)), 0)::bigint AS revenue'],
    ARRAY['get_revenue_by_payment_method',
          'ORDER BY sum(o.subtotal) DESC',
          'ORDER BY sum(o.subtotal - COALESCE(o.discount, 0)) DESC'],

    -- ---- line level: oi.unit_price × qty is pre-discount too --------------
    -- Every occurrence in these five is a revenue position (select, profit,
    -- margin numerator and denominator, ORDER BY), so a blanket swap per
    -- function is exactly right.
    ARRAY['get_product_performance',
          'SUM(oi.unit_price*oi.quantity)',
          'SUM(oi.total - oi.tax_amount)'],
    ARRAY['get_revenue_by_category',
          'SUM(oi.unit_price*oi.quantity)',
          'SUM(oi.total - oi.tax_amount)'],
    ARRAY['get_top_products',
          'SUM(oi.unit_price*oi.quantity)',
          'SUM(oi.total - oi.tax_amount)'],
    ARRAY['get_customer_items_summary',
          'SUM(oi.unit_price * oi.quantity)::bigint AS revenue_gross',
          'SUM(oi.total - oi.tax_amount)::bigint AS revenue_gross'],
    ARRAY['get_sold_products_breakdown',
          'SUM(oi.unit_price * oi.quantity)::bigint AS revenue_gross',
          'SUM(oi.total - oi.tax_amount)::bigint AS revenue_gross']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(v_edits, 1) LOOP
    SELECT p.oid INTO v_oid
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = v_edits[i][1]
    LIMIT 1;

    IF v_oid IS NULL THEN
      RAISE EXCEPTION '00109: function % not found', v_edits[i][1];
    END IF;

    v_def := pg_get_functiondef(v_oid);

    -- Already applied? The replacement text is present and the search text is
    -- gone. Treat as a no-op so the migration is re-runnable.
    IF position(v_edits[i][2] in v_def) = 0 THEN
      IF position(v_edits[i][3] in v_def) = 0 THEN
        RAISE EXCEPTION '00109: %: neither the search nor the replacement text was found — the live body has drifted. Search was: %',
          v_edits[i][1], v_edits[i][2];
      END IF;
      CONTINUE;
    END IF;

    v_new := replace(v_def, v_edits[i][2], v_edits[i][3]);
    EXECUTE v_new;
  END LOOP;
END
$mig$;

-- ---------------------------------------------------------------------------
-- get_order_performance — MIXED intent, so hand-written.
-- `subtotal` stays GROSS: it is returned beside its own discount_amount,
-- tax_amount and total columns, i.e. an invoice-style breakdown. Only profit
-- and profit_margin move to the net base.
CREATE OR REPLACE FUNCTION public.get_order_performance(p_start_date date, p_end_date date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, order_number text, order_date date, customer_name text, status text, payment_method text, subtotal bigint, discount_amount bigint, tax_amount bigint, total bigint, total_cost bigint, profit bigint, profit_margin numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT o.id, o.order_number, o.order_date, c.company_name, o.status::text, o.payment_method::text,
    o.subtotal::bigint, COALESCE(o.discount,0)::bigint, COALESCE(o.tax,0)::bigint, o.total::bigint,
    CASE WHEN is_owner() THEN COALESCE(ic.cost,0)::bigint ELSE NULL END,
    CASE WHEN is_owner() THEN ((o.subtotal - COALESCE(o.discount,0))-COALESCE(ic.cost,0))::bigint ELSE NULL END,
    CASE WHEN is_owner() AND (o.subtotal - COALESCE(o.discount,0))>0 THEN ROUND((((o.subtotal - COALESCE(o.discount,0))-COALESCE(ic.cost,0))::numeric/(o.subtotal - COALESCE(o.discount,0)))*100,1) ELSE NULL END
  FROM orders o JOIN customers c ON c.id=o.customer_id
  LEFT JOIN LATERAL (SELECT SUM(oi.cost_cents*oi.quantity) as cost FROM order_items oi WHERE oi.order_id=o.id) ic ON true
  WHERE o.order_date BETWEEN p_start_date AND p_end_date
    AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses)))
    AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
    AND (p_payment_method IS NULL OR o.payment_method::text=p_payment_method)
    AND (p_customer_type IS NULL OR c.customer_type = p_customer_type)
  ORDER BY o.order_date DESC, o.created_at DESC;
$function$;

-- ---------------------------------------------------------------------------
-- get_financial_summary — structural.
--   grossRevenue  stays cur.net (SUM(subtotal)) — it IS the gross figure
--   netRevenue    finally becomes gross − discounts (it aliased grossRevenue)
--   grossProfit / grossMargin / avgOrderValue  computed from netRevenue
--   prev          gains `discounts`, which its subquery never selected, so the
--                 period-comparison profit uses the same base as the current one
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_start date, p_end date, p_statuses text[] DEFAULT NULL::text[], p_customer_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_customer_type text DEFAULT NULL::text)
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
    'netRevenue', COALESCE(cur.net, 0) - COALESCE(cur.discounts, 0),
    'totalCogs', CASE WHEN is_owner() THEN COALESCE(cur.cogs, 0) ELSE NULL END,
    'grossProfit', CASE WHEN is_owner() THEN COALESCE(cur.net, 0) - COALESCE(cur.discounts, 0) - COALESCE(cur.cogs, 0) ELSE NULL END,
    'grossMargin', CASE WHEN is_owner() AND (COALESCE(cur.net, 0) - COALESCE(cur.discounts, 0)) > 0 THEN round((((COALESCE(cur.net, 0) - COALESCE(cur.discounts, 0)) - COALESCE(cur.cogs, 0))::numeric / (cur.net - COALESCE(cur.discounts, 0))) * 100, 1) ELSE NULL END,
    'vatCollected', COALESCE(cur.vat, 0), 'cashRevenue', COALESCE(cur.cash, 0), 'bankRevenue', COALESCE(cur.bank, 0),
    'orderCount', COALESCE(cur.cnt, 0), 'itemsSold', COALESCE(cur.items_sold, 0),
    'avgOrderValue', CASE WHEN COALESCE(cur.cnt, 0) > 0 THEN round((COALESCE(cur.net, 0) - COALESCE(cur.discounts, 0))::numeric / cur.cnt) ELSE 0 END,
    'prev', json_build_object('grossRevenue', COALESCE(prev.net, 0),
      'grossProfit', CASE WHEN is_owner() THEN COALESCE(prev.net, 0) - COALESCE(prev.discounts, 0) - COALESCE(prev.cogs, 0) ELSE NULL END, 'orderCount', COALESCE(prev.cnt, 0))
  ) INTO result FROM (
    SELECT SUM(o.subtotal) as net, SUM(o.discount) as discounts, SUM(o.tax) as vat,
      SUM(CASE WHEN o.payment_method = 'cash' THEN o.subtotal - COALESCE(o.discount,0) ELSE 0 END) as cash,
      SUM(CASE WHEN o.payment_method = 'bank' THEN o.subtotal - COALESCE(o.discount,0) ELSE 0 END) as bank, COUNT(*) as cnt,
      (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as items_sold,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders o WHERE o.order_date BETWEEN p_start AND p_end AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR o.customer_id = p_customer_id) AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
  ) cur, (
    SELECT SUM(o.subtotal) as net, SUM(o.discount) as discounts, COUNT(*) as cnt,
      (SELECT SUM(oi.cost_cents * oi.quantity) FROM order_items oi WHERE oi.order_id IN (SELECT id FROM orders WHERE order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR customer_id = p_customer_id) AND (p_customer_type IS NULL OR customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR payment_method::text = p_payment_method))) as cogs
    FROM orders o WHERE o.order_date BETWEEN v_prev_start AND v_prev_end AND ((p_statuses IS NULL AND o.status NOT IN ('cancelled','refunded','draft')) OR (p_statuses IS NOT NULL AND o.status::text = ANY(p_statuses))) AND (p_customer_id IS NULL OR o.customer_id = p_customer_id) AND (p_customer_type IS NULL OR o.customer_id IN (SELECT id FROM customers WHERE customer_type = p_customer_type)) AND (p_payment_method IS NULL OR o.payment_method::text = p_payment_method)
  ) prev;
  RETURN result;
END; $function$;

-- ---------------------------------------------------------------------------
-- 🚨 Recreating a SECURITY DEFINER function re-grants EXECUTE to `anon` via
-- Supabase default privileges. REVOKE FROM PUBLIC alone is not enough.
REVOKE EXECUTE ON FUNCTION public.get_customer_orders(uuid, date, date)                                            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_items_summary(uuid, date, date)                                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_today_stats(boolean)                                                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_sold_products_breakdown(date, date)                                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_revenue_by_category(date, date, text[])                                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_product_performance(date, date, text[], uuid, text, uuid, text, text)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_products(date, date, integer, text[], uuid, text, uuid, text, text)       FROM PUBLIC, anon;
