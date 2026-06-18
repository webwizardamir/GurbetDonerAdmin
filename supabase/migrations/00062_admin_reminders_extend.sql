-- ============================================================================
-- 00062: Extend personal admin reminders (recurrence + optional email)
-- ============================================================================
-- Grows the existing per-user `reminders` table (00023) so admins can set
-- recurring reminders and opt a reminder into an email nudge. Per-user RLS is
-- unchanged. The optional email is delivered by the daily edge function
-- (process-invoice-reminders) which also handles client reminders.
--
-- Safe to re-run.
-- ============================================================================

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS recurrence       TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_enabled    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category         TEXT NOT NULL DEFAULT 'generic'
    CHECK (category IN ('generic', 'payment_due'));

COMMENT ON COLUMN reminders.recurrence IS
  'none | daily | weekly | monthly. A new occurrence is spawned client-side when a recurring reminder is marked read/dismissed.';
COMMENT ON COLUMN reminders.email_enabled IS
  'When true, the daily job emails the owning user once when the reminder is due (email_sent_at guards against re-send).';

-- Index to let the email job find due, email-enabled, not-yet-emailed reminders.
CREATE INDEX IF NOT EXISTS idx_reminders_email_due
  ON reminders(remind_at)
  WHERE email_enabled = true AND email_sent_at IS NULL AND is_dismissed = false;
