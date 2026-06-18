-- ============================================================================
-- 00058: Client invoice-reminder schedule + opt-out flags
-- ============================================================================
-- Configuration for the client-facing overdue-invoice reminder system. Stored as
-- a single JSONB column on the document_settings singleton (matching the existing
-- email_templates pattern) so the escalation schedule is editable from the
-- Settings > Reminders tab without further migrations.
--
-- client_reminder_config shape:
-- {
--   "auto_send_enabled": false,        -- GLOBAL kill-switch for automated email
--   "send_hour": 8,                    -- local hour the daily job may send
--   "working_days_only": true,         -- skip Sat/Sun for automated sends
--   "repeat_interval_days": 7,         -- after the last explicit step, repeat every N days
--   "max_count": 3,                    -- max reminders ever sent per invoice
--   "steps": [                         -- explicit escalation milestones (ordered)
--     { "days_after_due": 1,  "template_key": "payment_reminder_1",     "tone": "gentle" },
--     { "days_after_due": 14, "template_key": "payment_reminder_2",     "tone": "second" },
--     { "days_after_due": 30, "template_key": "payment_reminder_final", "tone": "final"  }
--   ]
-- }
--
-- The in-app work queue ALWAYS surfaces overdue invoices regardless of
-- auto_send_enabled. auto_send_enabled only governs the automated email job.
--
-- Safe to re-run.
-- ============================================================================

ALTER TABLE document_settings
  ADD COLUMN IF NOT EXISTS client_reminder_config JSONB NOT NULL DEFAULT '{
    "auto_send_enabled": false,
    "send_hour": 8,
    "working_days_only": true,
    "repeat_interval_days": 7,
    "max_count": 3,
    "steps": [
      { "days_after_due": 1,  "template_key": "payment_reminder_1",     "tone": "gentle" },
      { "days_after_due": 14, "template_key": "payment_reminder_2",     "tone": "second" },
      { "days_after_due": 30, "template_key": "payment_reminder_final", "tone": "final"  }
    ]
  }'::jsonb;

COMMENT ON COLUMN document_settings.client_reminder_config IS
  'Escalation schedule + auto-send config for client overdue-invoice reminders. auto_send_enabled is the global kill-switch (in-app queue is always on).';

-- Per-recipient opt-out. A customer opted out is never auto-emailed and never
-- surfaces in the work queue; an order opted out is skipped for that invoice only.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS reminders_opted_out BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS reminders_opted_out BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN customers.reminders_opted_out IS
  'When true, this customer is excluded from invoice-overdue reminders (queue + auto-send).';
COMMENT ON COLUMN orders.reminders_opted_out IS
  'When true, this specific invoice is excluded from overdue reminders.';
