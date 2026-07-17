-- 00090: get_overdue_invoices — count reminders by "was it sent", not status='sent'
--
-- BUG (introduced 2026-07-15 by the 00086 email-status sync):
-- This function counted a reminder as sent with `ds.status = 'sent'`. But the
-- sync-email-status cron (every 15 min) polls Resend and REWRITES that row in
-- place to the real outcome — 'delivered' / 'bounced' / 'suppressed'. So a row
-- only reads 'sent' for its first ~15 minutes, and the equality test silently
-- stopped matching essentially every reminder ever sent.
--
-- Live impact at the time of this migration: the count matched 2 of 115
-- payment_reminder rows, so the Reminders page (/overdue) showed "0 reminders
-- sent" and a NULL last_reminder_at for invoices that had received up to 3 —
-- which also made ReminderStatusCell's projected next-reminder date wrong.
--
-- FIX: count every status EXCEPT the retryable ones (pending = still in
-- flight, failed = Resend rejected it at send time, so nothing went out).
-- This mirrors NOT_YET_SENT_STATUSES in the process-invoice-reminders edge
-- function, and it must STAY mirrored: services/invoiceReminders.ts
-- (projectNextReminder/buildMilestones) is a faithful port of that edge-fn
-- ladder, so if this predicate and the edge function's disagree, the page
-- projects a next-reminder date the cron will not honour.
--
-- Note 'bounced'/'suppressed' deliberately COUNT as sent here: the reminder
-- was dispatched and consumed a rung of the escalation ladder even though the
-- mailbox rejected it. Undeliverable addresses surface separately in the
-- Outbox "problems" filter and the Dashboard delivery alert.
--
-- Only the LEFT JOIN LATERAL predicate changes; everything else is verbatim
-- from the previous definition.

CREATE OR REPLACE FUNCTION public.get_overdue_invoices()
 RETURNS TABLE(order_id uuid, order_number text, customer_id uuid, customer_name text, customer_email text, total integer, invoice_due_date date, days_overdue integer, invoice_number text, reminders_sent integer, last_reminder_at timestamp with time zone, snoozed_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    c.id,
    c.company_name,
    c.email,
    o.total,
    o.invoice_due_date,
    (CURRENT_DATE - o.invoice_due_date)::INTEGER         AS days_overdue,
    inv.document_number                                   AS invoice_number,
    COALESCE(r.cnt, 0)::INTEGER                           AS reminders_sent,
    r.last_reminder_at,
    st.snoozed_until
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN LATERAL (
    SELECT d.document_number
    FROM documents d
    WHERE d.order_id = o.id AND d.document_type = 'invoice'
    ORDER BY d.generated_at DESC NULLS LAST
    LIMIT 1
  ) inv ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)            AS cnt,
           MAX(ds.created_at)  AS last_reminder_at
    FROM document_sends ds
    WHERE ds.order_id = o.id
      AND ds.document_type = 'payment_reminder'
      -- NOT status = 'sent' — see header. Mirrors NOT_YET_SENT_STATUSES.
      AND ds.status NOT IN ('pending', 'failed')
  ) r ON TRUE
  LEFT JOIN invoice_reminder_state st ON st.order_id = o.id
  WHERE o.invoice_due_date < CURRENT_DATE
    AND o.status NOT IN ('completed', 'cancelled', 'refunded')
    AND o.reminders_opted_out = false
    AND c.reminders_opted_out = false
  ORDER BY o.invoice_due_date ASC;
END;
$function$;
