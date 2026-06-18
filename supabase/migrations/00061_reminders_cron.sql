-- ============================================================================
-- 00061: Schedule the automated invoice-reminder job (pg_cron + pg_net)
-- ============================================================================
-- Invokes the process-invoice-reminders edge function on a schedule. The
-- function self-gates on document_settings.client_reminder_config (auto_send,
-- send_hour, working_days_only), so we schedule it HOURLY and let it decide when
-- to actually send. This keeps the schedule simple while honouring send_hour.
--
-- SECURITY: the endpoint runs with verify_jwt=false, so it is publicly
-- reachable. The function rejects every request whose X-Reminder-Cron-Secret
-- header does not match the REMINDER_CRON_SECRET function secret. We therefore
-- pass that secret from the cron job. Store the project URL and the secret in
-- Supabase Vault so they never sit in plaintext SQL/migrations.
--
-- ── ONE-TIME SETUP (run these in the SQL editor BEFORE/with this migration) ──
--   select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'project_url');
--   select vault.create_secret('<SAME_VALUE_AS_FUNCTION_SECRET>', 'reminder_cron_secret');
-- And set on the edge function (Studio → Edge Functions → secrets):
--   REMINDER_CRON_SECRET, RESEND_API_KEY, RESEND_FROM_ADDRESS, APP_URL
-- Deploy with:  supabase functions deploy process-invoice-reminders --no-verify-jwt
--
-- Safe to re-run (unschedules first).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove a prior schedule with the same name (ignore if it doesn't exist).
DO $$
BEGIN
  PERFORM cron.unschedule('process-invoice-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'process-invoice-reminders',
  '0 * * * *',  -- top of every hour; function gates to send_hour
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/process-invoice-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Reminder-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'reminder_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To stop the job:  SELECT cron.unschedule('process-invoice-reminders');
-- To inspect runs:  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
