-- 00080_documents_admin_update.sql
--
-- Allow admins (owner + shop_manager) to UPDATE the `documents` table.
--
-- Why: the `documents` table only had INSERT / SELECT / DELETE policies, so any
-- UPDATE was denied by RLS. We now keep a document's frozen `snapshot` in sync
-- with the live order (see services/documents.ts `refreshOrderDocumentSnapshots`
-- + the Invoices-page download write-back) so the same document renders
-- identically on the Orders page, the Invoices list page, and the customer
-- portal. That refresh is a plain UPDATE of `documents.snapshot`, which requires
-- this policy — without it the write-back silently failed and the portal kept
-- showing a stale snapshot.
--
-- Scope: admins only (`is_admin_user()` = owner/shop_manager/admin). Portal
-- customers still have no direct write path to `documents` (they read their own
-- documents through the SECURITY DEFINER get_portal_* RPCs). Document numbers,
-- types, and generated_at are never touched by the app refresh — only snapshot.

CREATE POLICY documents_update ON documents
  FOR UPDATE
  USING (is_admin_user())
  WITH CHECK (is_admin_user());
