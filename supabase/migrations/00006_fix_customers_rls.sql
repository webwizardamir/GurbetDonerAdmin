-- =====================================================
-- FIX: Create missing helper functions and RLS policies
-- =====================================================

-- Ensure helper functions exist (they should have been in Phase 0)

-- Function to check if current user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role::text = 'owner'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is shop manager
CREATE OR REPLACE FUNCTION is_shop_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role::text = 'shop_manager'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin (owner OR shop_manager)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role::text IN ('owner', 'shop_manager', 'admin')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES FOR CUSTOMERS
-- =====================================================

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS customers_select_policy ON customers;
DROP POLICY IF EXISTS customers_insert_policy ON customers;
DROP POLICY IF EXISTS customers_update_policy ON customers;
DROP POLICY IF EXISTS customers_delete_policy ON customers;

-- All admin users can view customers
CREATE POLICY customers_select_policy ON customers
    FOR SELECT TO authenticated
    USING (is_admin_user());

-- All admin users can create customers
CREATE POLICY customers_insert_policy ON customers
    FOR INSERT TO authenticated
    WITH CHECK (is_admin_user());

-- All admin users can update customers
CREATE POLICY customers_update_policy ON customers
    FOR UPDATE TO authenticated
    USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Only owner can delete customers
CREATE POLICY customers_delete_policy ON customers
    FOR DELETE TO authenticated
    USING (is_owner());

-- =====================================================
-- CUSTOMER SEARCH FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION search_customers(search_query TEXT)
RETURNS SETOF customers AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM customers
    WHERE
        is_active = true
        AND (
            company_name ILIKE '%' || search_query || '%'
            OR contact_person ILIKE '%' || search_query || '%'
            OR email ILIKE '%' || search_query || '%'
            OR phone ILIKE '%' || search_query || '%'
            OR vat_number ILIKE '%' || search_query || '%'
            OR billing_city ILIKE '%' || search_query || '%'
        )
    ORDER BY company_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CUSTOMER STATS FUNCTION
-- =====================================================

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
        COUNT(*) FILTER (WHERE is_active = true)::BIGINT as active_customers,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::BIGINT as new_this_month
    FROM customers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
