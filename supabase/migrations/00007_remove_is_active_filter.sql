-- =====================================================
-- Remove is_active filter from customer search function
-- =====================================================

-- Update search function to not filter by is_active
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update stats function to not count active separately
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
        COUNT(*)::BIGINT as active_customers, -- Same as total now
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::BIGINT as new_this_month
    FROM customers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
