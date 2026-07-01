-- =====================================================
-- PHASE 0: Authentication, Roles & Audit Log
-- =====================================================

-- =====================================================
-- 1. UPDATE USER ROLES
-- =====================================================

-- Create new role enum (keeping old for migration, will update references)
DO $$
BEGIN
    -- Add new values to existing enum if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'owner';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'shop_manager' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'shop_manager';
    END IF;
END $$;

-- Add new columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- =====================================================
-- 2. PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, resource, action)
);

-- Create index for permission lookups
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- Insert default permissions for Owner (full access)
INSERT INTO permissions (role, resource, action, allowed) VALUES
    -- Owner permissions (full access)
    ('owner', 'customers', 'view', true),
    ('owner', 'customers', 'create', true),
    ('owner', 'customers', 'edit', true),
    ('owner', 'customers', 'delete', true),
    ('owner', 'products', 'view', true),
    ('owner', 'products', 'create', true),
    ('owner', 'products', 'edit', true),
    ('owner', 'products', 'delete', true),
    ('owner', 'products', 'view_cost', true),
    ('owner', 'orders', 'view', true),
    ('owner', 'orders', 'create', true),
    ('owner', 'orders', 'edit', true),
    ('owner', 'orders', 'delete', true),
    ('owner', 'orders', 'refund', true),
    ('owner', 'documents', 'view', true),
    ('owner', 'documents', 'generate', true),
    ('owner', 'documents', 'download', true),
    ('owner', 'inventory', 'view', true),
    ('owner', 'inventory', 'adjust', true),
    ('owner', 'inventory', 'view_cost', true),
    ('owner', 'analytics', 'view', true),
    ('owner', 'analytics', 'export', true),
    ('owner', 'settings', 'view', true),
    ('owner', 'settings', 'edit', true),
    ('owner', 'audit_log', 'view', true),
    ('owner', 'audit_log', 'export', true),

    -- Shop Manager permissions (operational access, no cost/profit visibility)
    ('shop_manager', 'customers', 'view', true),
    ('shop_manager', 'customers', 'create', true),
    ('shop_manager', 'customers', 'edit', true),
    ('shop_manager', 'customers', 'delete', false),
    ('shop_manager', 'products', 'view', true),
    ('shop_manager', 'products', 'create', true),
    ('shop_manager', 'products', 'edit', true),
    ('shop_manager', 'products', 'delete', false),
    ('shop_manager', 'products', 'view_cost', false),
    ('shop_manager', 'orders', 'view', true),
    ('shop_manager', 'orders', 'create', true),
    ('shop_manager', 'orders', 'edit', true),
    ('shop_manager', 'orders', 'delete', true),
    ('shop_manager', 'orders', 'refund', true),
    ('shop_manager', 'documents', 'view', true),
    ('shop_manager', 'documents', 'generate', true),
    ('shop_manager', 'documents', 'download', true),
    ('shop_manager', 'inventory', 'view', true),
    ('shop_manager', 'inventory', 'adjust', true),
    ('shop_manager', 'inventory', 'view_cost', false),
    ('shop_manager', 'analytics', 'view', false),
    ('shop_manager', 'analytics', 'export', false),
    ('shop_manager', 'settings', 'view', false),
    ('shop_manager', 'settings', 'edit', false),
    ('shop_manager', 'audit_log', 'view', false),
    ('shop_manager', 'audit_log', 'export', false)
ON CONFLICT (role, resource, action) DO NOTHING;

-- =====================================================
-- 3. AUDIT LOG TABLE
-- =====================================================

-- Create audit action enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    user_email TEXT NOT NULL,
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make audit_logs append-only (no updates or deletes allowed via RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow inserts, no updates or deletes
CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY audit_logs_select_owner ON audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role::text = 'owner'
        )
    );

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =====================================================
-- 4. AUDIT LOG FUNCTION
-- =====================================================

-- Generic function to log changes
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
    SELECT email INTO current_user_email FROM profiles WHERE id = current_user_id;

    -- If no user found, use system
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
-- 5. AUDIT TRIGGERS FOR ALL TABLES
-- =====================================================

-- Profiles audit trigger
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Customers audit trigger
DROP TRIGGER IF EXISTS audit_customers ON customers;
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Products audit trigger
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Orders audit trigger
DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Order Items audit trigger
DROP TRIGGER IF EXISTS audit_order_items ON order_items;
CREATE TRIGGER audit_order_items
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Invoices audit trigger
DROP TRIGGER IF EXISTS audit_invoices ON invoices;
CREATE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Payments audit trigger
DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Permissions audit trigger (for tracking permission changes)
DROP TRIGGER IF EXISTS audit_permissions ON permissions;
CREATE TRIGGER audit_permissions
    AFTER INSERT OR UPDATE OR DELETE ON permissions
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- =====================================================
-- 6. HELPER FUNCTIONS FOR PERMISSION CHECKS
-- =====================================================

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

-- Function to check specific permission
CREATE OR REPLACE FUNCTION has_permission(p_resource TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
    has_perm BOOLEAN;
BEGIN
    -- Get user's role
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid() AND is_active = true;

    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check permission
    SELECT allowed INTO has_perm
    FROM permissions
    WHERE role = user_role
    AND resource = p_resource
    AND action = p_action;

    RETURN COALESCE(has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. SESSION MANAGEMENT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. UPDATE RLS POLICIES FOR NEW ROLES
-- =====================================================

-- Update profiles RLS
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;

CREATE POLICY profiles_select_own ON profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR is_admin_user());

CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Owner can update any profile
CREATE POLICY profiles_update_owner ON profiles
    FOR UPDATE TO authenticated
    USING (is_owner())
    WITH CHECK (is_owner());

-- =====================================================
-- 9. LOGIN ATTEMPT TRACKING (Rate Limiting)
-- =====================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- Function to check if login is rate limited
CREATE OR REPLACE FUNCTION is_login_rate_limited(p_email TEXT, p_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
    recent_failures INTEGER;
BEGIN
    -- Count failed attempts in last 15 minutes
    SELECT COUNT(*) INTO recent_failures
    FROM login_attempts
    WHERE (email = p_email OR ip_address = p_ip)
    AND success = false
    AND attempted_at > NOW() - INTERVAL '15 minutes';

    -- Rate limit after 5 failed attempts
    RETURN recent_failures >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(p_email TEXT, p_ip INET, p_success BOOLEAN)
RETURNS void AS $$
BEGIN
    INSERT INTO login_attempts (email, ip_address, success)
    VALUES (p_email, p_ip, p_success);

    -- Update last_login_at on successful login
    IF p_success THEN
        UPDATE profiles SET last_login_at = NOW() WHERE email = p_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
