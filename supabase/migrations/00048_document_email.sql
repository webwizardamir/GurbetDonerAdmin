-- ============================================================================
-- 00048: Email send infrastructure for documents
-- ============================================================================
-- Phase 5 foundation. Adds:
--
--  * document_settings.email_bcc — optional company BCC address; pre-filled
--    in the Send dialog so a record always lands in the company mailbox.
--  * document_settings.email_templates — JSONB map of {document_type: {
--    subject, body}}. One template per type (invoice / proforma / credit_note /
--    packing_slip / order_confirmation / payment_reminder). Subject & body
--    support {{placeholders}} resolved client-side from order + customer
--    snapshots before the send.
--  * document_sends — append-only audit log. One row per send attempt with
--    status ('pending' | 'sent' | 'failed' | 'bounced'), Resend message id,
--    and any error from the edge function. Used by the Outbox page.
--
-- NOT in this migration:
--  * Resend API key — stays a Supabase edge-function secret (env var), never
--    in the DB. UI surfaces a 'set in Supabase secrets' note.
--  * PDF archive bucket — PDFs are regenerated on retry from immutable order
--    data, so no storage is needed. (Cheaper, deterministic, GDPR-friendlier.)
--
-- Safe to re-run.
-- ============================================================================

-- 1. document_settings additions
ALTER TABLE document_settings
  ADD COLUMN IF NOT EXISTS email_bcc       TEXT,
  ADD COLUMN IF NOT EXISTS email_templates JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN document_settings.email_bcc IS
  'Optional company BCC address pre-filled in the Send dialog.';
COMMENT ON COLUMN document_settings.email_templates IS
  'Map of {document_type: {subject, body}} with {{placeholder}} support.';

-- 2. document_sends audit table
CREATE TABLE IF NOT EXISTS document_sends (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id        UUID REFERENCES documents(id) ON DELETE SET NULL,
  order_id           UUID REFERENCES orders(id)    ON DELETE CASCADE,
  document_type      document_type NOT NULL,
  recipient_email    TEXT NOT NULL,
  bcc_email          TEXT,
  subject            TEXT NOT NULL,
  body               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message      TEXT,
  resend_message_id  TEXT,
  sent_at            TIMESTAMPTZ,
  sent_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_sends_order      ON document_sends(order_id);
CREATE INDEX IF NOT EXISTS idx_document_sends_document   ON document_sends(document_id);
CREATE INDEX IF NOT EXISTS idx_document_sends_status     ON document_sends(status);
CREATE INDEX IF NOT EXISTS idx_document_sends_created_at ON document_sends(created_at DESC);

COMMENT ON TABLE document_sends IS
  'Append-only audit log of every document email send attempt. Powers the Outbox page and the per-order "has it been sent?" indicator.';

-- 3. RLS — admin-only read/write; matches Owner+Shop Manager from CLAUDE.md
ALTER TABLE document_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view document sends"   ON document_sends;
DROP POLICY IF EXISTS "Admins insert document sends" ON document_sends;
DROP POLICY IF EXISTS "Admins update document sends" ON document_sends;

CREATE POLICY "Admins view document sends"   ON document_sends FOR SELECT USING (is_admin_user());
CREATE POLICY "Admins insert document sends" ON document_sends FOR INSERT WITH CHECK (is_admin_user());
CREATE POLICY "Admins update document sends" ON document_sends FOR UPDATE USING (is_admin_user());
-- No DELETE policy — audit log is append-only. Use status='cancelled' if needed later.
