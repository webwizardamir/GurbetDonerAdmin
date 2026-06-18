import { supabase } from './supabase'
import type {
  ClientReminderConfig,
  OverdueInvoice,
} from '../types'

// ===========================================================================
// Default client-reminder config — mirrors the DB default in migration 00058.
// Used when document_settings.client_reminder_config is somehow absent.
// ===========================================================================
export const DEFAULT_CLIENT_REMINDER_CONFIG: ClientReminderConfig = {
  auto_send_enabled: false,
  send_hour: 8,
  working_days_only: true,
  repeat_interval_days: 7,
  max_count: 3,
  steps: [
    { days_after_due: 1,  template_key: 'payment_reminder_1',     tone: 'gentle' },
    { days_after_due: 14, template_key: 'payment_reminder_2',     tone: 'second' },
    { days_after_due: 30, template_key: 'payment_reminder_final', tone: 'final'  },
  ],
}

// ===========================================================================
// Work queue
// ===========================================================================

/** All outstanding (overdue, unpaid, not opted-out) invoices. Includes snoozed. */
export async function fetchOverdueInvoices(): Promise<OverdueInvoice[]> {
  const { data, error } = await supabase.rpc('get_overdue_invoices')
  if (error) throw error
  return (data as OverdueInvoice[]) ?? []
}

/** Hide an invoice from the active queue until `until`. */
export async function snoozeInvoiceReminder(orderId: string, until: Date): Promise<void> {
  const { error } = await supabase.rpc('snooze_invoice_reminder', {
    p_order_id: orderId,
    p_until: until.toISOString(),
  })
  if (error) throw error
}

/** Bring a snoozed invoice back to the active queue immediately. */
export async function clearInvoiceReminderSnooze(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('clear_invoice_reminder_snooze', {
    p_order_id: orderId,
  })
  if (error) throw error
}

/**
 * Mark an invoice paid by completing its order (= paid, per business rule).
 * Guards against resurrecting a meanwhile-cancelled/refunded order from a stale
 * queue snapshot — those statuses can never transition to completed here.
 */
export async function markInvoicePaid(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', orderId)
    .not('status', 'in', '(cancelled,refunded)')
  if (error) throw error
}

/** Exclude (or re-include) a single invoice from all overdue reminders. */
export async function setInvoiceReminderOptOut(orderId: string, optedOut: boolean): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ reminders_opted_out: optedOut })
    .eq('id', orderId)
  if (error) throw error
}

// ===========================================================================
// Helpers
// ===========================================================================
// Note: reminder sends (manual + automated) are counted from document_sends
// (document_type='payment_reminder', status='sent') by the get_overdue_invoices
// RPC, so there is no separate manual-log step. The invoice_reminders table is
// written only by the automated edge function for per-step idempotency.

/**
 * Which escalation step is next for an invoice given how overdue it is and how
 * many reminders were already sent. Mirrors the edge-function logic so the
 * manual "Send now" button picks the same tone the auto-job would.
 * Returns the 1-based step index (1..steps.length) capped at the final step.
 */
export function nextReminderStep(
  cfg: ClientReminderConfig,
  remindersSent: number,
): number {
  const total = cfg.steps.length
  if (total === 0) return 1
  return Math.min(remindersSent + 1, total)
}
