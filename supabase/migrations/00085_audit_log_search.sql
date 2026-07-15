-- =====================================================
-- Audit Log server-side search (2026-07-15)
-- =====================================================
-- The page searched only the client-loaded page (50 rows) and only the
-- entity_id/user_email columns — so order numbers / customer names (which live
-- INSIDE the new_values/old_values snapshot) never matched, and matches beyond
-- the first page were invisible. This RPC filters the WHOLE table server-side,
-- including a substring search across the snapshot JSON, and paginates by
-- created_at cursor. Owner-gated (matches the audit_logs SELECT policy).

CREATE OR REPLACE FUNCTION search_audit_logs(
    p_search      TEXT        DEFAULT NULL,
    p_entity_type TEXT        DEFAULT NULL,
    p_action      TEXT        DEFAULT NULL,
    p_user_email  TEXT        DEFAULT NULL,
    p_from        TIMESTAMPTZ DEFAULT NULL,
    p_to          TIMESTAMPTZ DEFAULT NULL,
    p_cursor      TIMESTAMPTZ DEFAULT NULL,
    p_limit       INTEGER     DEFAULT 50
)
RETURNS SETOF audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Owner-only, same gate as the audit_logs SELECT policy.
    IF NOT is_owner() THEN
        RETURN;
    END IF;

    RETURN QUERY
        SELECT a.*
        FROM audit_logs a
        WHERE (p_entity_type IS NULL OR a.entity_type = p_entity_type)
          AND (p_action      IS NULL OR a.action::text = p_action)
          AND (p_user_email  IS NULL OR a.user_email = p_user_email)
          AND (p_from        IS NULL OR a.created_at >= p_from)
          AND (p_to          IS NULL OR a.created_at <= p_to)
          AND (p_cursor      IS NULL OR a.created_at < p_cursor)
          AND (
              p_search IS NULL OR p_search = ''
              OR a.entity_type ILIKE '%' || p_search || '%'
              OR a.user_email  ILIKE '%' || p_search || '%'
              OR a.entity_id::text ILIKE '%' || p_search || '%'
              OR a.new_values::text ILIKE '%' || p_search || '%'
              OR a.old_values::text ILIKE '%' || p_search || '%'
          )
        ORDER BY a.created_at DESC
        -- LIMIT NULL returns all rows (used by the export path).
        LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION search_audit_logs(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_audit_logs(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO authenticated;
