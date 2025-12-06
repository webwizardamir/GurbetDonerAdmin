-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS for RLS
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer_id for current user
CREATE OR REPLACE FUNCTION get_user_customer_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM customers
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (is_admin());

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (is_admin());

-- =====================================================
-- CUSTOMERS TABLE POLICIES
-- =====================================================

-- Admins can do everything with customers
CREATE POLICY "Admins can view all customers"
    ON customers FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert customers"
    ON customers FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update customers"
    ON customers FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete customers"
    ON customers FOR DELETE
    USING (is_admin());

-- Customers can view their own data
CREATE POLICY "Customers can view own data"
    ON customers FOR SELECT
    USING (user_id = auth.uid());

-- Customers can update their own data (limited fields)
CREATE POLICY "Customers can update own data"
    ON customers FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- PRODUCTS TABLE POLICIES
-- =====================================================

-- Everyone (authenticated) can view active products
CREATE POLICY "Authenticated users can view active products"
    ON products FOR SELECT
    USING (is_active = true OR is_admin());

-- Admins can do everything with products
CREATE POLICY "Admins can insert products"
    ON products FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
    ON products FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete products"
    ON products FOR DELETE
    USING (is_admin());

-- =====================================================
-- ORDERS TABLE POLICIES
-- =====================================================

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
    ON orders FOR SELECT
    USING (is_admin());

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
    ON orders FOR SELECT
    USING (customer_id = get_user_customer_id());

-- Admins can insert orders
CREATE POLICY "Admins can insert orders"
    ON orders FOR INSERT
    WITH CHECK (is_admin());

-- Customers can insert their own orders
CREATE POLICY "Customers can insert own orders"
    ON orders FOR INSERT
    WITH CHECK (customer_id = get_user_customer_id());

-- Admins can update orders
CREATE POLICY "Admins can update orders"
    ON orders FOR UPDATE
    USING (is_admin());

-- Customers can update their pending orders
CREATE POLICY "Customers can update own pending orders"
    ON orders FOR UPDATE
    USING (
        customer_id = get_user_customer_id()
        AND status = 'pending'
    );

-- Admins can delete orders
CREATE POLICY "Admins can delete orders"
    ON orders FOR DELETE
    USING (is_admin());

-- =====================================================
-- ORDER ITEMS TABLE POLICIES
-- =====================================================

-- Admins can view all order items
CREATE POLICY "Admins can view all order items"
    ON order_items FOR SELECT
    USING (is_admin());

-- Customers can view their own order items
CREATE POLICY "Customers can view own order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.customer_id = get_user_customer_id()
        )
    );

-- Admins can insert order items
CREATE POLICY "Admins can insert order items"
    ON order_items FOR INSERT
    WITH CHECK (is_admin());

-- Customers can insert items for their pending orders
CREATE POLICY "Customers can insert own order items"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.customer_id = get_user_customer_id()
            AND orders.status = 'pending'
        )
    );

-- Admins can update order items
CREATE POLICY "Admins can update order items"
    ON order_items FOR UPDATE
    USING (is_admin());

-- Customers can update items in their pending orders
CREATE POLICY "Customers can update own order items"
    ON order_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.customer_id = get_user_customer_id()
            AND orders.status = 'pending'
        )
    );

-- Admins can delete order items
CREATE POLICY "Admins can delete order items"
    ON order_items FOR DELETE
    USING (is_admin());

-- Customers can delete items from their pending orders
CREATE POLICY "Customers can delete own order items"
    ON order_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.customer_id = get_user_customer_id()
            AND orders.status = 'pending'
        )
    );

-- =====================================================
-- INVOICES TABLE POLICIES
-- =====================================================

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
    ON invoices FOR SELECT
    USING (is_admin());

-- Customers can view their own invoices
CREATE POLICY "Customers can view own invoices"
    ON invoices FOR SELECT
    USING (customer_id = get_user_customer_id());

-- Admins can manage invoices
CREATE POLICY "Admins can insert invoices"
    ON invoices FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update invoices"
    ON invoices FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete invoices"
    ON invoices FOR DELETE
    USING (is_admin());

-- =====================================================
-- PAYMENTS TABLE POLICIES
-- =====================================================

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
    ON payments FOR SELECT
    USING (is_admin());

-- Customers can view their own payments
CREATE POLICY "Customers can view own payments"
    ON payments FOR SELECT
    USING (customer_id = get_user_customer_id());

-- Admins can manage payments
CREATE POLICY "Admins can insert payments"
    ON payments FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update payments"
    ON payments FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete payments"
    ON payments FOR DELETE
    USING (is_admin());

-- =====================================================
-- FUNCTION to handle new user signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
