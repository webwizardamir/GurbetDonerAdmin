-- 00081_documents_snapshot_only_update.sql
--
-- Harden the documents UPDATE path added in 00080.
--
-- 00080 added `documents_update` = USING/WITH CHECK (is_admin_user()) with no
-- column scope. RLS can't compare OLD vs NEW, so that grant technically lets any
-- staff role (owner AND shop_manager) mutate `document_number`, `document_type`,
-- `order_id`, `generated_at`, `generated_by` via a raw PostgREST call — a
-- regression against the legal invariant of sequential, immutable invoice
-- numbering (migration 00079). The app only ever writes `snapshot`
-- (refreshOrderDocumentSnapshots / Invoices-page write-back).
--
-- Two changes:
--   1. Rescope the policy to `authenticated` (was the default `public`, which
--      also covers `anon`) for consistency with the 00071 lockdown posture.
--      anon is already denied by is_admin_user(), so this is defense-in-depth.
--   2. A BEFORE UPDATE trigger enforces column-level immutability that RLS
--      cannot express: only `snapshot` may change. `order_id` is allowed to go
--      to NULL so the FK `ON DELETE SET NULL` fired by purge_order() still works
--      (a purge nulls documents.order_id); repointing to a DIFFERENT order is
--      blocked.

-- 1. Rescope the UPDATE policy to authenticated.
DROP POLICY IF EXISTS documents_update ON documents;
CREATE POLICY documents_update ON documents
  FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- 2. Column immutability: only snapshot is writable.
CREATE OR REPLACE FUNCTION enforce_document_snapshot_only_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.document_number IS DISTINCT FROM OLD.document_number
     OR NEW.document_type IS DISTINCT FROM OLD.document_type
     OR NEW.generated_at IS DISTINCT FROM OLD.generated_at
     OR NEW.generated_by IS DISTINCT FROM OLD.generated_by
     -- Allow order_id -> NULL (FK ON DELETE SET NULL from purge_order); block
     -- repointing to a different, non-null order.
     OR (NEW.order_id IS DISTINCT FROM OLD.order_id AND NEW.order_id IS NOT NULL)
  THEN
    RAISE EXCEPTION 'documents: only snapshot may be updated (document_number/document_type/order_id/generated_at/generated_by are immutable)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_snapshot_only_update ON documents;
CREATE TRIGGER trg_documents_snapshot_only_update
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION enforce_document_snapshot_only_update();
