-- Fix function search_path security warnings
-- Setting search_path to 'public' prevents schema hijacking attacks

-- Update all functions to have immutable search_path
ALTER FUNCTION public.update_customer_prices_updated_at() SET search_path = public;
ALTER FUNCTION public.log_price_change() SET search_path = public;
ALTER FUNCTION public.get_effective_price(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.update_orders_updated_at() SET search_path = public;
ALTER FUNCTION public.log_audit_event() SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;
ALTER FUNCTION public.deduct_stock_on_order() SET search_path = public;
ALTER FUNCTION public.update_product_stock() SET search_path = public;
ALTER FUNCTION public.update_customer_balance() SET search_path = public;
ALTER FUNCTION public.update_invoice_payment_status() SET search_path = public;
ALTER FUNCTION public.set_order_number_fn() SET search_path = public;
ALTER FUNCTION public.restore_stock_on_delete() SET search_path = public;
ALTER FUNCTION public.get_all_staff() SET search_path = public;
ALTER FUNCTION public.handle_order_status_change() SET search_path = public;
ALTER FUNCTION public.update_staff_profile(uuid, text, text, boolean) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.calculate_order_total() SET search_path = public;
ALTER FUNCTION public.update_document_settings_timestamp() SET search_path = public;
ALTER FUNCTION public.get_next_document_number(document_type) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.search_products(text) SET search_path = public;
ALTER FUNCTION public.get_product_stats() SET search_path = public;
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = public;
ALTER FUNCTION public.is_login_rate_limited(text, inet) SET search_path = public;
ALTER FUNCTION public.record_login_attempt(text, inet, boolean) SET search_path = public;
ALTER FUNCTION public.search_customers(text) SET search_path = public;
ALTER FUNCTION public.is_owner() SET search_path = public;
ALTER FUNCTION public.is_shop_manager() SET search_path = public;
ALTER FUNCTION public.is_admin_user() SET search_path = public;
ALTER FUNCTION public.get_customer_stats() SET search_path = public;
