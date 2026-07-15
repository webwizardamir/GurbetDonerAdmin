-- ============================================================================
-- 00087: Allow the new delivery-status values on document_sends
-- ============================================================================
-- The sync-email-status poller (00086) writes the real Resend outcome into
-- document_sends.status, but the original CHECK constraint only permitted
-- pending/sent/failed/bounced. So 'delivered', 'complained' and — critically —
-- 'suppressed' UPDATEs were silently rejected at the DB, leaving a suppressed
-- invoice stuck showing 'sent'. Expand the allowed set to match the app's
-- DocumentSendStatus union.
--
-- Idempotent (drops the constraint first). Applied to live DB 2026-07-16.
-- ============================================================================

ALTER TABLE document_sends DROP CONSTRAINT IF EXISTS document_sends_status_check;

ALTER TABLE document_sends ADD CONSTRAINT document_sends_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'sent'::text,
    'delivered'::text,
    'failed'::text,
    'bounced'::text,
    'complained'::text,
    'suppressed'::text
  ]));
