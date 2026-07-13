import { supabase } from './supabase'
import type {
  ClientReminderConfig,
  ClientReminderStep,
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

// ===========================================================================
// Next-reminder projection (UI display)
// ===========================================================================
// buildMilestones + the send-hour/working-day landing below are a FAITHFUL
// PORT of the auto-send edge function
// (supabase/functions/process-invoice-reminders/index.ts — buildMilestones,
// the send window, and the spacing guard). Keep the three in sync: if the
// edge cadence changes, change this too, or the projected "next reminder"
// date drifts from what actually sends. (Same duplication convention as the
// branded-email HTML noted in CLAUDE.md.)

interface Milestone { idx: number; day: number; tone: string }

/**
 * Expand the config into the ordered milestone ladder capped at max_count:
 * explicit steps (sorted ascending) first, then repeats of the last step every
 * repeat_interval_days. Mirrors the edge function's buildMilestones exactly,
 * including the Math.max(1, …) clamps.
 */
export function buildMilestones(cfg: ClientReminderConfig): Milestone[] {
  const steps: ClientReminderStep[] = [...cfg.steps].sort((a, b) => a.days_after_due - b.days_after_due)
  const out: Milestone[] = []
  if (steps.length === 0) return out
  const repeat = Math.max(1, cfg.repeat_interval_days)
  const max = Math.max(1, cfg.max_count)
  for (let i = 0; i < max; i++) {
    if (i < steps.length) {
      out.push({ idx: i, day: steps[i].days_after_due, tone: steps[i].tone })
    } else {
      const last = steps[steps.length - 1]
      const extra = i - steps.length + 1
      out.push({ idx: i, day: last.days_after_due + extra * repeat, tone: last.tone })
    }
  }
  return out
}

/** Discriminated result of projectNextReminder — drives the status badge. */
export type NextReminder =
  | { kind: 'manual' }                                   // auto-send globally off
  | { kind: 'no-email' }                                 // customer has no email → never auto-sends
  | { kind: 'done' }                                     // max_count reached
  | { kind: 'due' }                                      // milestone passed → fires next daily run
  | { kind: 'scheduled'; date: Date; mayShift: boolean } // concrete future send date

const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Roll a date to the given local hour; if working-days-only, bump Sat/Sun → Mon. */
function landOnSlot(d: Date, sendHour: number, workingDaysOnly: boolean): Date {
  const x = new Date(d)
  x.setHours(sendHour, 0, 0, 0)
  if (workingDaysOnly) {
    const day = x.getDay() // 0 Sun … 6 Sat
    if (day === 6) x.setDate(x.getDate() + 2)
    else if (day === 0) x.setDate(x.getDate() + 1)
  }
  return x
}

/**
 * Project the next automatic reminder for an overdue invoice. Pure — no I/O.
 * In the common case (auto on, no manual sends) this is the exact date the edge
 * job will send: invoice_due_date + the next milestone's day, at send_hour on a
 * working day. `mayShift` flags the two cases where the real day can move (a
 * manual/prior send pushes it via the spacing guard, or the invoice already
 * overshot the last milestone) so the UI can add a subtle "may shift" hint
 * WITHOUT labelling every row an estimate.
 */
export function projectNextReminder(
  inv: Pick<OverdueInvoice, 'reminders_sent' | 'last_reminder_at' | 'snoozed_until' | 'invoice_due_date' | 'days_overdue' | 'customer_email'>,
  cfg: ClientReminderConfig,
  now: Date = new Date(),
): NextReminder {
  if (!cfg.auto_send_enabled) return { kind: 'manual' }
  if (!inv.customer_email) return { kind: 'no-email' }
  if (inv.reminders_sent >= Math.max(1, cfg.max_count)) return { kind: 'done' }

  const milestones = buildMilestones(cfg)
  if (milestones.length === 0) return { kind: 'manual' }
  const next = milestones[Math.min(inv.reminders_sent, milestones.length - 1)]

  // Anchor on the DATE (invoice_due_date + milestone.day) so UI and send stay
  // consistent regardless of session timezone.
  const due = new Date(inv.invoice_due_date + 'T00:00:00')
  const milestoneDate = addDays(due, next.day)

  // Spacing floor: never within repeat_interval_days of the last send (manual
  // OR auto). last_reminder_at = MAX(created_at) of sent reminders — the exact
  // value the edge fn's spacing guard uses.
  const repeat = Math.max(1, cfg.repeat_interval_days)
  const spacingFloor = inv.last_reminder_at ? addDays(new Date(inv.last_reminder_at), repeat) : null

  let earliest = milestoneDate
  let mayShift = false
  if (spacingFloor && spacingFloor > earliest) { earliest = spacingFloor; mayShift = true }

  // Snooze now pauses auto-sends (see edge function): the next send can't be
  // before the snooze expires.
  const snoozeEnd = inv.snoozed_until ? new Date(inv.snoozed_until) : null
  if (snoozeEnd && snoozeEnd > earliest) earliest = snoozeEnd

  // Late-enable / overshoot: 0 sent but already past the last milestone → the
  // job fires the final tone once, then stops. The date is "next run".
  const lastMilestone = milestones[milestones.length - 1]
  if (inv.reminders_sent === 0 && inv.days_overdue >= lastMilestone.day) mayShift = true

  const slot = landOnSlot(earliest, cfg.send_hour, cfg.working_days_only)
  if (slot.getTime() <= now.getTime()) return { kind: 'due' }
  return { kind: 'scheduled', date: slot, mayShift }
}

/** Relative-time bucket for the "last sent" line. Exact stamp goes in a tooltip. */
export function relTimeKey(iso: string, now: number = Date.now()): { key: string; count: number } {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return { key: 'today', count: 0 }
  if (days === 1) return { key: 'yesterday', count: 1 }
  if (days < 14) return { key: 'daysAgo', count: days }
  if (days < 60) return { key: 'weeksAgo', count: Math.floor(days / 7) }
  return { key: 'monthsAgo', count: Math.floor(days / 30) }
}
