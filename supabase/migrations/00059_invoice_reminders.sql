-- ============================================================================
-- 00059: invoice_reminders (send log) + invoice_reminder_state (queue state)
-- ============================================================================
-- Two tables, separate concerns:
--
--  * invoice_reminders      — append-only log of every overdue-reminder actually
--                             sent (manual or automated). One row per send, links
--                             to the document_sends audit row. The unique index
--                             guarantees the AUTOMATED job never double-sends the
--                             same escalation step for an invoice (idempotency);
--                             manual sends are never blocked (admin may re-send).
--
--  * invoice_reminder_state — per-order work-queue state: a single snoozed_until
--                             timestamp. Snoozing hides an invoice from the queue
--                             until that moment, then it resurfaces. (The dashboard
--                             widget's "minimize" is per-session UI state, not here.)
--
-- "Paid => stop": when an order becomes 'completed', a trigger clears any snooze.
-- The overdue RPC (00060) excludes completed/cancelled/refunded orders entirely,
-- so no separate "resolved" status is needed — paid invoices simply drop out.
--
-- RLS: is_admin_user() (owner + shop_manager) may read/write, matching
-- document_sends, so a shop manager can work the queue and send reminders. No
-- DELETE (the log is append-only). The cron edge function uses the service role
-- key and bypasses RLS.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Send log ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  step_number      INTEGER NOT NULL,                 -- 1..N escalation step
  channel          TEXT NOT NULL DEFAULT 'manual'
                     CHECK (channel IN ('manual', 'auto')),
  status           TEXT NOT NULL DEFAULT 'sent'
                     CHECK (status IN ('sent', 'failed')),
  document_send_id UUID REFERENCES document_sends(id) ON DELETE SET NULL,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_order ON invoice_reminders(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_sent_at ON invoice_reminders(sent_at DESC);

-- Idempotency for the automated job: at most one successful auto-send per step.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_reminders_auto_step
  ON invoice_reminders(order_id, step_number)
  WHERE status = 'sent' AND channel = 'auto';

COMMENT ON TABLE invoice_reminders IS
  'Append-only log of overdue-invoice reminders sent (manual + automated). Links to document_sends.';

-- 2. Per-order queue state --------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_reminder_state (
  order_id      UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMPTZ,
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoice_reminder_state IS
  'Work-queue state per order: snoozed_until hides an overdue invoice from the queue until it passes, then it resurfaces.';

-- 3. RLS --------------------------------------------------------------------
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_reminder_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view invoice reminders"   ON invoice_reminders;
DROP POLICY IF EXISTS "Admins insert invoice reminders" ON invoice_reminders;
DROP POLICY IF EXISTS "Admins update invoice reminders" ON invoice_reminders;
CREATE POLICY "Admins view invoice reminders"   ON invoice_reminders FOR SELECT USING (is_admin_user());
CREATE POLICY "Admins insert invoice reminders" ON invoice_reminders FOR INSERT WITH CHECK (is_admin_user());
CREATE POLICY "Admins update invoice reminders" ON invoice_reminders FOR UPDATE USING (is_admin_user());

DROP POLICY IF EXISTS "Admins view reminder state"   ON invoice_reminder_state;
DROP POLICY IF EXISTS "Admins insert reminder state" ON invoice_reminder_state;
DROP POLICY IF EXISTS "Admins update reminder state" ON invoice_reminder_state;
CREATE POLICY "Admins view reminder state"   ON invoice_reminder_state FOR SELECT USING (is_admin_user());
CREATE POLICY "Admins insert reminder state" ON invoice_reminder_state FOR INSERT WITH CHECK (is_admin_user());
CREATE POLICY "Admins update reminder state" ON invoice_reminder_state FOR UPDATE USING (is_admin_user());

-- 4. "Paid => stop": clear snooze when the order becomes completed ----------
CREATE OR REPLACE FUNCTION clear_reminder_state_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    DELETE FROM public.invoice_reminder_state WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_reminder_state_on_paid ON orders;
CREATE TRIGGER trg_clear_reminder_state_on_paid
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION clear_reminder_state_on_paid();
