-- Go-live security hardening (2026-06-29)
-- 1) Remove catastrophic migration-rollback leftover: rollback_migration() is
--    anon-executable, unguarded, and would DELETE nearly every table because its
--    snapshot source (_migration_snapshot) is empty. Drop both.
DROP FUNCTION IF EXISTS public.rollback_migration();
DROP TABLE IF EXISTS public._migration_snapshot;

-- 2) Tighten always-true WRITE policies to admin-only. Portal customers hold the
--    `authenticated` role, so `WITH CHECK (true)` let them write to staff tables.
--    is_admin_user() = true only for owner/shop_manager/admin staff.
ALTER POLICY "Users can create orders"          ON public.orders          WITH CHECK (is_admin_user());
ALTER POLICY "Users can update orders"          ON public.orders          USING (is_admin_user()) WITH CHECK (is_admin_user());
ALTER POLICY "Users can delete orders"          ON public.orders          USING (is_admin_user());

ALTER POLICY "Users can create order items"     ON public.order_items     WITH CHECK (is_admin_user());
ALTER POLICY "Users can update order items"     ON public.order_items     USING (is_admin_user()) WITH CHECK (is_admin_user());
ALTER POLICY "Users can delete order items"     ON public.order_items     USING (is_admin_user());

ALTER POLICY "Users can create order discounts" ON public.order_discounts WITH CHECK (is_admin_user());
ALTER POLICY "Users can delete order discounts" ON public.order_discounts USING (is_admin_user());

ALTER POLICY "Users can create order fees"      ON public.order_fees      WITH CHECK (is_admin_user());
ALTER POLICY "Users can delete order fees"      ON public.order_fees      USING (is_admin_user());

ALTER POLICY "Users can create customer prices" ON public.customer_prices WITH CHECK (is_admin_user());
ALTER POLICY "Users can update customer prices" ON public.customer_prices USING (is_admin_user()) WITH CHECK (is_admin_user());
ALTER POLICY "Users can delete customer prices" ON public.customer_prices USING (is_admin_user());

ALTER POLICY "documents_insert"                 ON public.documents       WITH CHECK (is_admin_user());
ALTER POLICY "Users can create price history"   ON public.price_history   WITH CHECK (is_admin_user());

-- 3) Defense-in-depth: revoke anon/PUBLIC EXECUTE on sensitive RPCs. These are all
--    internally guarded (is_admin_user/is_owner/get_portal_customer_id) and called
--    only by authenticated staff/portal users or service_role edge functions.
--    Deliberately NOT revoked: record_login_attempt, is_login_rate_limited (anon
--    login flow); is_admin_user/is_owner/is_shop_manager/get_portal_customer_id
--    (used in RLS policy evaluation); handle_new_user/log_audit_event (triggers).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(ARRAY[
      'create_order_refund','trash_order','purge_order','restore_order','empty_order_trash',
      'update_staff_profile','snooze_invoice_reminder','clear_invoice_reminder_snooze','generate_order_number',
      'get_action_required','get_all_staff','get_customer_items_summary','get_customer_orders','get_customer_stats',
      'get_dashboard_revenue','get_inventory_turnover','get_overdue_invoices','get_product_stats','get_slow_movers',
      'get_sold_products_breakdown','get_today_orders_by_status','get_today_stats','get_weekly_stats',
      'search_customers','search_products',
      'get_portal_customer','get_portal_documents','get_portal_order','get_portal_orders','get_portal_stats',
      'touch_portal_last_login'
    ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- 4) Pin mutable search_path on the last flagged function.
ALTER FUNCTION public.set_product_code() SET search_path = 'public';
