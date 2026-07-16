-- 00089_exclude_draft_from_analytics.sql
--
-- Exclude 'draft' orders from analytics revenue/profit/COGS aggregates.
--
-- Context: 'draft' is now an opt-in order status meaning "not finalised" — it
-- gets no invoice and no automatic email, and must NOT count in the analytics
-- the owner reads (day/week/month revenue & profit, dashboard revenue, top
-- products/customers, etc.). Normal orders keep defaulting to 'pending'.
--
-- The analytics RPCs define their "sold set" as `status NOT IN
-- ('cancelled','refunded')`, which currently INCLUDES draft. This migration
-- adds 'draft' to that exclusion in every revenue/profit RPC.
--
-- Approach: rather than hand-copy 20 function bodies (which would risk drifting
-- from the live owner-gated definitions from 00070), we read each function's
-- current definition with pg_get_functiondef and replace ONLY the sold-set
-- predicate. This is safe and precise because the two exact substrings we target
-- appear only in the revenue exclusion — the operational buckets that
-- deliberately KEEP draft (dashboard "te picken / openstaand") use
-- `IN ('pending_payment','on_hold','draft')`, which does not match `NOT IN
-- ('cancelled', ...)`. Idempotent: after the edit the substring no longer
-- matches, so a re-run is a no-op.
--
-- Deliberately NOT touched (draft stays visible):
--   * get_today_stats items_to_pick / pending_count  (operational to-do)
--   * get_orders_by_status / get_today_orders_by_status (status distribution)
--   * get_order_stats_by_status (Orders-list Draft filter tab)
--   * client-side per-order/per-line profit in OrderDetail / OrderForm
-- Because there are 0 draft orders at migration time, this changes no existing
-- number — it is purely forward-looking.

DO $mig$
DECLARE
  r        record;
  new_def  text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_customer_items_summary', 'get_customer_orders', 'get_customer_performance',
        'get_dashboard_revenue', 'get_financial_summary', 'get_inventory_turnover',
        'get_kpis', 'get_monthly_comparison', 'get_order_performance',
        'get_product_performance', 'get_revenue_by_category', 'get_revenue_by_day',
        'get_revenue_by_payment_method', 'get_slow_movers', 'get_sold_products',
        'get_sold_products_breakdown', 'get_top_customers', 'get_top_products',
        'get_weekly_stats', 'get_today_stats'
      )
  LOOP
    new_def := pg_get_functiondef(r.oid);
    -- Two spellings of the sold-set exclusion are used across the RPCs:
    new_def := replace(
      new_def,
      'NOT IN (''cancelled'', ''refunded'')',
      'NOT IN (''cancelled'', ''refunded'', ''draft'')'
    );
    new_def := replace(
      new_def,
      'NOT IN (''cancelled'',''refunded'')',
      'NOT IN (''cancelled'',''refunded'',''draft'')'
    );
    EXECUTE new_def;
  END LOOP;
END
$mig$;
