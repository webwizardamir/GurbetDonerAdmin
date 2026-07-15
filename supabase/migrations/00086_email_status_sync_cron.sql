-- ============================================================================
-- 00086: Poll Resend for real email delivery status (pg_cron + pg_net)
-- ============================================================================
-- document_sends.status is written as 'sent' the instant Resend accepts the
-- request, but the true outcome (delivered / bounced / complained / SUPPRESSED)
-- only happens afterwards and was never recorded — so suppressed invoices looked
-- "sent". The sync-email-status edge function reads each recent send's real
-- last_event from Resend and writes it back. We run it every 15 minutes.
--
-- SECURITY: the endpoint runs with verify_jwt=false. It accepts either an admin
-- JWT (Outbox "Refresh status" button) or the X-Reminder-Cron-Secret header. We
-- REUSE the existing reminder cron secret + project_url vault entries created in
-- migration 00061, so there is NOTHING new to configure.
--
-- Requires (already set up by 00061):
--   vault secret 'project_url'          = https://<PROJECT_REF>.supabase.co
--   vault secret 'reminder_cron_secret' = <same value as REMINDER_CRON_SECRET>
--   edge-function secrets (project-wide): RESEND_API_KEY, REMINDER_CRON_SECRET,
--     SUPABASE_SERVICE_ROLE_KEY  (already present for the other functions)
-- ONE new owner action: the existing RESEND_API_KEY is send-only and CANNOT read
--   delivery status (GET /emails → 401 restricted_api_key). Create a Resend
--   "Full access" API key and add it as the RESEND_READ_API_KEY edge secret.
--   Until then the poller runs but updates nothing (returns readKeyRestricted).
-- Deploy with:  supabase functions deploy sync-email-status --no-verify-jwt
--
-- Safe to re-run (unschedules first).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Speeds up both the poller's "recent unresolved sends" scan and the Dashboard
-- failed-send count.
CREATE INDEX IF NOT EXISTS idx_document_sends_status_created
  ON document_sends (status, created_at DESC);

DO $$
BEGIN
  PERFORM cron.unschedule('sync-email-status');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'sync-email-status',
  '*/15 * * * *',  -- every 15 minutes
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/sync-email-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Reminder-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'reminder_cron_secret')
    ),
    body := jsonb_build_object('days', 7, 'limit', 200)
  );
  $$
);

-- To stop the job:  SELECT cron.unschedule('sync-email-status');
-- To inspect runs:  SELECT * FROM cron.job_run_details WHERE command LIKE '%sync-email-status%' ORDER BY start_time DESC LIMIT 20;
