-- =====================================================
-- Fix Audit Triggers
-- =====================================================
-- Creates the audit log infrastructure and attaches triggers to all tables

-- =====================================================
-- 1. Create audit action enum if not exists
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete');
    END IF;
END $$;

-- =====================================================
-- 2. Create audit_logs table if not exists
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT NOT NULL DEFAULT 'system',
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =====================================================
-- 3. Create the audit log function
-- =====================================================
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    audit_action_type audit_action;
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Get current user info
    current_user_id := auth.uid();

    -- Try to get email from profiles first, then from auth.users
    SELECT email INTO current_user_email FROM profiles WHERE id = current_user_id;

    -- If no profile found, try auth.users
    IF current_user_email IS NULL AND current_user_id IS NOT NULL THEN
        SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    END IF;

    -- If still no user found, use system
    IF current_user_email IS NULL THEN
        current_user_email := 'system';
    END IF;

    -- Determine action type and data
    IF (TG_OP = 'INSERT') THEN
        audit_action_type := 'create';
        old_data := NULL;
        new_data := to_jsonb(NEW);

        INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values)
        VALUES (current_user_id, current_user_email, audit_action_type, TG_TABLE_NAME, NEW.id, old_data, new_data);

        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action_type := 'update';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        -- Only log if there are actual changes
        IF old_data IS DISTINCT FROM new_data THEN
            INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values)
            VALUES (current_user_id, current_user_email, audit_action_type, TG_TABLE_NAME, NEW.id, old_data, new_data);
        END IF;

        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        audit_action_type := 'delete';
        old_data := to_jsonb(OLD);
        new_data := NULL;

        INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values)
        VALUES (current_user_id, current_user_email, audit_action_type, TG_TABLE_NAME, OLD.id, old_data, new_data);

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Enable RLS on audit_logs
-- =====================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow inserts (for triggers)
DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;
CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Only owners can view audit logs
DROP POLICY IF EXISTS audit_logs_select_owner ON audit_logs;
CREATE POLICY audit_logs_select_owner ON audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role::text = 'owner'
        )
    );

-- =====================================================
-- 5. Attach audit triggers to all tables
-- =====================================================

-- Profiles
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Customers
DROP TRIGGER IF EXISTS audit_customers ON customers;
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Categories
DROP TRIGGER IF EXISTS audit_categories ON categories;
DROP TRIGGER IF EXISTS audit_categories_changes ON categories;
CREATE TRIGGER audit_categories
    AFTER INSERT OR UPDATE OR DELETE ON categories
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Products
DROP TRIGGER IF EXISTS audit_products ON products;
DROP TRIGGER IF EXISTS audit_products_changes ON products;
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Orders
DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Order Items
DROP TRIGGER IF EXISTS audit_order_items ON order_items;
CREATE TRIGGER audit_order_items
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Customer prices
DROP TRIGGER IF EXISTS audit_customer_prices ON customer_prices;
CREATE TRIGGER audit_customer_prices
    AFTER INSERT OR UPDATE OR DELETE ON customer_prices
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Documents
DROP TRIGGER IF EXISTS audit_documents ON documents;
CREATE TRIGGER audit_documents
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Reminders
DROP TRIGGER IF EXISTS audit_reminders ON reminders;
CREATE TRIGGER audit_reminders
    AFTER INSERT OR UPDATE OR DELETE ON reminders
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Customer accounts
DROP TRIGGER IF EXISTS audit_customer_accounts ON customer_accounts;
CREATE TRIGGER audit_customer_accounts
    AFTER INSERT OR UPDATE OR DELETE ON customer_accounts
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();
