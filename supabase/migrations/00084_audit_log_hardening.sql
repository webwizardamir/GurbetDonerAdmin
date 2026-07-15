-- =====================================================
-- Audit Log hardening (2026-07-15)
-- =====================================================
-- 1. Lock down INSERT so only the SECURITY DEFINER trigger can write
--    (previously WITH CHECK (true) → any authenticated user, incl. portal
--    customers, could forge/poison audit rows from the browser console).
-- 2. Tie SELECT to is_owner() (which checks is_active) instead of an inline
--    role check, closing the deactivated-owner-with-valid-JWT gap. Consolidate
--    the duplicate owner SELECT policies into one.
-- 3. Stop logging pure-noise UPDATEs (geocode-only writes on every route plan,
--    updated_at/search_vector/last_login_at churn) at the trigger source.
-- 4. Owner-gated get_audit_actors() RPC for the user filter dropdown.

-- -----------------------------------------------------
-- 1. INSERT lockdown
-- -----------------------------------------------------
-- The audit trigger is SECURITY DEFINER and runs as the function owner, so it
-- bypasses RLS and needs no INSERT policy. Removing all client-facing INSERT
-- policies means no authenticated client can insert directly.
DROP POLICY IF EXISTS audit_insert ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;

-- -----------------------------------------------------
-- 2. SELECT: single owner-only policy via is_owner() (active owners only)
-- -----------------------------------------------------
DROP POLICY IF EXISTS audit_select_owner ON audit_logs;
DROP POLICY IF EXISTS audit_logs_select_owner ON audit_logs;
CREATE POLICY audit_logs_select_owner ON audit_logs
    FOR SELECT TO authenticated
    USING (is_owner());

-- -----------------------------------------------------
-- 3. Noise-aware audit trigger
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    audit_action_type audit_action;
    old_data JSONB;
    new_data JSONB;
    meaningful_changes INTEGER;
    -- Columns whose change alone carries no business signal. An UPDATE that
    -- touches ONLY these is not logged (kills the geocode/route-plan flood,
    -- search_vector bumps, and last_login churn).
    noise_keys TEXT[] := ARRAY[
        'updated_at', 'search_vector',
        'latitude', 'longitude', 'geocoded_at',
        'geocode_address_hash', 'geocode_status',
        'last_login_at'
    ];
BEGIN
    -- Resolve the acting user (profiles first, then auth.users, else 'system').
    current_user_id := auth.uid();
    SELECT email INTO current_user_email FROM profiles WHERE id = current_user_id;
    IF current_user_email IS NULL AND current_user_id IS NOT NULL THEN
        SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    END IF;
    IF current_user_email IS NULL THEN
        current_user_email := 'system';
    END IF;

    IF (TG_OP = 'INSERT') THEN
        audit_action_type := 'create';
        new_data := to_jsonb(NEW);
        INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values)
        VALUES (current_user_id, current_user_email, audit_action_type, TG_TABLE_NAME, NEW.id, NULL, new_data);
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action_type := 'update';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        IF old_data IS DISTINCT FROM new_data THEN
            -- Count changed keys that are NOT pure noise.
            SELECT count(*) INTO meaningful_changes
            FROM jsonb_object_keys(new_data) AS k(key)
            WHERE (old_data -> k.key) IS DISTINCT FROM (new_data -> k.key)
              AND NOT (k.key = ANY (noise_keys));

            IF meaningful_changes > 0 THEN
                INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values)
                VALUES (current_user_id, current_user_email, audit_action_type, TG_TABLE_NAME, NEW.id, old_data, new_data);
            END IF;
        END IF;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        audit_action_type := 'delete';
        old_data := to_jsonb(OLD);
        INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values)
        VALUES (current_user_id, current_user_email, audit_action_type, TG_TABLE_NAME, OLD.id, old_data, NULL);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------
-- 4. Owner-gated distinct-actors RPC for the filter dropdown
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_audit_actors()
RETURNS TABLE(user_id UUID, user_email TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Owner-only, matching the audit_logs SELECT policy. Non-owners get nothing.
    IF NOT is_owner() THEN
        RETURN;
    END IF;
    RETURN QUERY
        SELECT DISTINCT a.user_id, a.user_email
        FROM audit_logs a
        ORDER BY a.user_email;
END;
$$;

REVOKE ALL ON FUNCTION get_audit_actors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_audit_actors() TO authenticated;
