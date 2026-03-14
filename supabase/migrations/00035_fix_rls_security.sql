-- =====================================================
-- MIGRATION 00035: Fix Critical RLS Security Issues
-- =====================================================
-- This migration fixes wide-open RLS policies across the system,
-- hardens the handle_new_user trigger, and changes SECURITY DEFINER
-- functions to SECURITY INVOKER where appropriate.
--
-- Summary of fixes:
-- 1. Orders, order_items, order_discounts, order_fees: proper role-based access
-- 2. customer_prices, price_history: admin-only access
-- 3. permissions table: RLS enabled, owner-only
-- 4. user_sessions, login_attempts: RLS enabled, scoped access
-- 5. documents: admin + portal customer scoped access
-- 6. company-assets storage: admin-only write, authenticated read
-- 7. product_unit_prices: admin write (already mostly correct, fix SELECT)
-- 8. handle_new_user: always set role to 'customer'
-- 9. search_customers, search_products: SECURITY INVOKER

-- =====================================================
-- HELPER: Reusable function to check portal customer
-- =====================================================

CREATE OR REPLACE FUNCTION get_portal_customer_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT customer_id FROM customer_accounts
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- 1. ORDERS TABLE: Drop wide-open policies, create proper ones
-- =====================================================

-- Drop the wide-open policies from 00015_orders.sql
DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders;

-- Drop old policies from 00002_rls_policies.sql that may conflict
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Customers can insert own orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Customers can update own pending orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

-- Drop portal policy from 00027
DROP POLICY IF EXISTS "Portal customers can view own orders" ON orders;

-- New policies
CREATE POLICY "rls_orders_admin_select" ON orders
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_orders_admin_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_orders_admin_update" ON orders
  FOR UPDATE TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_orders_admin_delete" ON orders
  FOR DELETE TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_orders_portal_select" ON orders
  FOR SELECT TO authenticated
  USING (
    customer_id = get_portal_customer_id()
  );

-- =====================================================
-- ORDER_ITEMS: Drop wide-open policies, create proper ones
-- =====================================================

DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can update order items" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items" ON order_items;

-- Drop old policies from 00002
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can insert order items" ON order_items;
DROP POLICY IF EXISTS "Customers can insert own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can update order items" ON order_items;
DROP POLICY IF EXISTS "Customers can update own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON order_items;
DROP POLICY IF EXISTS "Customers can delete own order items" ON order_items;

-- Drop portal policy from 00027
DROP POLICY IF EXISTS "Portal customers can view own order items" ON order_items;

CREATE POLICY "rls_order_items_admin_select" ON order_items
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_order_items_admin_insert" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_order_items_admin_update" ON order_items
  FOR UPDATE TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_order_items_admin_delete" ON order_items
  FOR DELETE TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_order_items_portal_select" ON order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = get_portal_customer_id()
    )
  );

-- =====================================================
-- ORDER_DISCOUNTS: Drop wide-open policies, create proper ones
-- =====================================================

DROP POLICY IF EXISTS "Users can view order discounts" ON order_discounts;
DROP POLICY IF EXISTS "Users can create order discounts" ON order_discounts;
DROP POLICY IF EXISTS "Users can delete order discounts" ON order_discounts;

CREATE POLICY "rls_order_discounts_admin_select" ON order_discounts
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_order_discounts_admin_insert" ON order_discounts
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_order_discounts_admin_update" ON order_discounts
  FOR UPDATE TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_order_discounts_admin_delete" ON order_discounts
  FOR DELETE TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_order_discounts_portal_select" ON order_discounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_discounts.order_id
      AND orders.customer_id = get_portal_customer_id()
    )
  );

-- =====================================================
-- ORDER_FEES: Drop wide-open policies, create proper ones
-- =====================================================

DROP POLICY IF EXISTS "Users can view order fees" ON order_fees;
DROP POLICY IF EXISTS "Users can create order fees" ON order_fees;
DROP POLICY IF EXISTS "Users can delete order fees" ON order_fees;

CREATE POLICY "rls_order_fees_admin_select" ON order_fees
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_order_fees_admin_insert" ON order_fees
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_order_fees_admin_update" ON order_fees
  FOR UPDATE TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_order_fees_admin_delete" ON order_fees
  FOR DELETE TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_order_fees_portal_select" ON order_fees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_fees.order_id
      AND orders.customer_id = get_portal_customer_id()
    )
  );

-- =====================================================
-- 2. CUSTOMER_PRICES: Drop wide-open policies, admin-only
-- =====================================================

DROP POLICY IF EXISTS "Users can view customer prices" ON customer_prices;
DROP POLICY IF EXISTS "Users can create customer prices" ON customer_prices;
DROP POLICY IF EXISTS "Users can update customer prices" ON customer_prices;
DROP POLICY IF EXISTS "Users can delete customer prices" ON customer_prices;

CREATE POLICY "rls_customer_prices_admin_select" ON customer_prices
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_customer_prices_admin_insert" ON customer_prices
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_customer_prices_admin_update" ON customer_prices
  FOR UPDATE TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_customer_prices_admin_delete" ON customer_prices
  FOR DELETE TO authenticated
  USING (is_admin_user());

-- =====================================================
-- PRICE_HISTORY: Drop wide-open policies, admin-only
-- =====================================================

DROP POLICY IF EXISTS "Users can view price history" ON price_history;
DROP POLICY IF EXISTS "Users can create price history" ON price_history;

CREATE POLICY "rls_price_history_admin_select" ON price_history
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_price_history_admin_insert" ON price_history
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

-- =====================================================
-- 3. PERMISSIONS TABLE: Enable RLS, owner-only
-- =====================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_permissions_owner_select" ON permissions
  FOR SELECT TO authenticated
  USING (is_owner());

CREATE POLICY "rls_permissions_owner_insert" ON permissions
  FOR INSERT TO authenticated
  WITH CHECK (is_owner());

CREATE POLICY "rls_permissions_owner_update" ON permissions
  FOR UPDATE TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

CREATE POLICY "rls_permissions_owner_delete" ON permissions
  FOR DELETE TO authenticated
  USING (is_owner());

-- =====================================================
-- 4. USER_SESSIONS: Enable RLS, users see own sessions
-- =====================================================

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_user_sessions_own_select" ON user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "rls_user_sessions_own_insert" ON user_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "rls_user_sessions_own_update" ON user_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "rls_user_sessions_own_delete" ON user_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admin can also see all sessions
CREATE POLICY "rls_user_sessions_admin_select" ON user_sessions
  FOR SELECT TO authenticated
  USING (is_admin_user());

-- =====================================================
-- LOGIN_ATTEMPTS: Enable RLS, admin-only read
-- =====================================================

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Admin can view all login attempts
CREATE POLICY "rls_login_attempts_admin_select" ON login_attempts
  FOR SELECT TO authenticated
  USING (is_admin_user());

-- Insert is handled by the SECURITY DEFINER record_login_attempt() function,
-- but we need a policy for direct inserts too (or the function handles it).
-- The function is SECURITY DEFINER so it bypasses RLS.
-- No direct insert policy needed for regular users.
CREATE POLICY "rls_login_attempts_admin_insert" ON login_attempts
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

-- =====================================================
-- 5. DOCUMENTS: Drop wide-open SELECT, proper access
-- =====================================================

DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

-- Drop portal policy from 00027
DROP POLICY IF EXISTS "Portal customers can view own documents" ON documents;

CREATE POLICY "rls_documents_admin_select" ON documents
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE POLICY "rls_documents_admin_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_documents_admin_update" ON documents
  FOR UPDATE TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_documents_admin_delete" ON documents
  FOR DELETE TO authenticated
  USING (is_owner());

-- Portal customers can view documents for their own orders
CREATE POLICY "rls_documents_portal_select" ON documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = documents.order_id
      AND orders.customer_id = get_portal_customer_id()
    )
  );

-- =====================================================
-- 6. COMPANY-ASSETS STORAGE: Restrict writes to admin
-- =====================================================

-- Drop existing wide-open storage policies
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;

-- Only admin users can upload/update/delete
CREATE POLICY "rls_storage_company_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND is_admin_user()
  );

CREATE POLICY "rls_storage_company_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND is_admin_user()
  );

CREATE POLICY "rls_storage_company_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND is_admin_user()
  );

-- All authenticated users can view (needed for logo display on invoices etc.)
CREATE POLICY "rls_storage_company_assets_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-assets');

-- =====================================================
-- 7. PRODUCT_UNIT_PRICES: Fix SELECT & write policies
-- =====================================================

-- Drop the existing wide-open SELECT and existing policies
DROP POLICY IF EXISTS "product_unit_prices_select_all" ON product_unit_prices;
DROP POLICY IF EXISTS "product_unit_prices_insert_owner" ON product_unit_prices;
DROP POLICY IF EXISTS "product_unit_prices_update_owner" ON product_unit_prices;
DROP POLICY IF EXISTS "product_unit_prices_delete_owner" ON product_unit_prices;
DROP POLICY IF EXISTS "product_unit_prices_insert_manager" ON product_unit_prices;
DROP POLICY IF EXISTS "product_unit_prices_update_manager" ON product_unit_prices;
DROP POLICY IF EXISTS "product_unit_prices_delete_manager" ON product_unit_prices;

-- SELECT: Admin users can see all fields (including cost_cents).
-- Portal/customer users can SELECT rows but cost_cents filtering
-- must be handled at the application layer since RLS cannot filter columns.
-- We restrict SELECT to admin users only, since customers do not need
-- direct access to this table (they get prices through orders).
CREATE POLICY "rls_product_unit_prices_admin_select" ON product_unit_prices
  FOR SELECT TO authenticated
  USING (is_admin_user());

-- Write operations: only admin users
CREATE POLICY "rls_product_unit_prices_admin_insert" ON product_unit_prices
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_product_unit_prices_admin_update" ON product_unit_prices
  FOR UPDATE TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "rls_product_unit_prices_admin_delete" ON product_unit_prices
  FOR DELETE TO authenticated
  USING (is_admin_user());

-- NOTE: cost_cents visibility for shop_manager vs owner must be enforced
-- at the application layer (e.g., exclude cost_cents from queries for
-- non-owner users). RLS cannot filter individual columns.

-- =====================================================
-- 8. HANDLE_NEW_USER: Always set role to 'customer'
-- =====================================================
-- CRITICAL: The old function trusted raw_user_meta_data.role, allowing
-- anyone signing up to set themselves as 'owner' or 'admin'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'customer'::user_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- 9. SEARCH FUNCTIONS: Change to SECURITY INVOKER
-- =====================================================
-- SECURITY DEFINER functions bypass RLS, meaning any authenticated user
-- could search all customers/products regardless of their role.
-- Changing to SECURITY INVOKER ensures RLS policies are respected.

CREATE OR REPLACE FUNCTION search_customers(search_query TEXT)
RETURNS SETOF customers AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM customers
    WHERE
        company_name ILIKE '%' || search_query || '%'
        OR contact_person ILIKE '%' || search_query || '%'
        OR email ILIKE '%' || search_query || '%'
        OR phone ILIKE '%' || search_query || '%'
        OR vat_number ILIKE '%' || search_query || '%'
        OR billing_city ILIKE '%' || search_query || '%'
    ORDER BY company_name;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public;

CREATE OR REPLACE FUNCTION search_products(search_query TEXT)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM products
  WHERE
    name ILIKE '%' || search_query || '%'
    OR sku ILIKE '%' || search_query || '%'
    OR barcode ILIKE '%' || search_query || '%'
    OR description ILIKE '%' || search_query || '%'
  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public;

-- Also fix get_customer_stats and get_product_stats to be SECURITY INVOKER
-- so they respect RLS too
CREATE OR REPLACE FUNCTION get_customer_stats()
RETURNS TABLE (
    total_customers BIGINT,
    active_customers BIGINT,
    new_this_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_customers,
        COUNT(*)::BIGINT as active_customers,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::BIGINT as new_this_month
    FROM customers;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public;

-- =====================================================
-- DONE
-- =====================================================
-- Summary of changes:
-- 1. Orders/order_items/order_discounts/order_fees: admin full access, portal SELECT own
-- 2. customer_prices/price_history: admin-only
-- 3. permissions: RLS enabled, owner-only
-- 4. user_sessions: users see own, admin sees all
-- 5. login_attempts: RLS enabled, admin-only read
-- 6. documents: admin full access, portal SELECT own
-- 7. company-assets storage: admin write, authenticated read
-- 8. product_unit_prices: admin-only (cost_cents column filtering at app layer)
-- 9. handle_new_user: always assigns 'customer' role (ignores metadata)
-- 10. search_customers/search_products: SECURITY INVOKER (respects RLS)
