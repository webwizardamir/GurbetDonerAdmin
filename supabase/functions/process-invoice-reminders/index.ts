// Supabase Edge Function: process-invoice-reminders
// Daily (or hourly) job that emails overdue-invoice reminders to clients per the
// configured escalation schedule, and optionally emails due admin reminders.
//
// IMPORTANT — deploy with JWT verification OFF and a shared secret:
//   supabase functions deploy process-invoice-reminders --no-verify-jwt
// The function has NO user; it is invoked by pg_cron (migration 00061) which
// passes the secret header. Every request is rejected unless
//   X-Reminder-Cron-Secret === Deno.env.get('REMINDER_CRON_SECRET').
// Set these secrets on the function in Supabase Studio:
//   REMINDER_CRON_SECRET, RESEND_API_KEY, RESEND_FROM_ADDRESS, APP_URL
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Emails are HTML/text only (NO PDF attachment) — @react-pdf can't run here. The
// body links to the customer portal (/portal/documents) where the PDF lives.
// Both manual sends (send-document-email) and these auto sends log to
// document_sends, so reminder counts stay unified.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ReminderStep { days_after_due: number; template_key: string; tone: string }
interface ReminderConfig {
  auto_send_enabled: boolean
  send_hour: number
  working_days_only: boolean
  repeat_interval_days: number
  max_count: number
  steps: ReminderStep[]
}
interface Template { subject: string; body: string }

const DEFAULT_TEMPLATES: Record<string, Template> = {
  payment_reminder_1: {
    subject: 'Herinnering: factuur {{document_number}} openstaand',
    body: 'Beste {{customer_name}},\n\nMogelijk is het aan uw aandacht ontsnapt: factuur {{document_number}} ter waarde van {{total}} had vervaldatum {{due_date}} en staat nog open. Wij verzoeken u vriendelijk het bedrag over te maken op IBAN {{iban}}. U kunt de factuur bekijken via {{portal_link}}.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_reminder_2: {
    subject: 'Tweede herinnering: factuur {{document_number}}',
    body: 'Beste {{customer_name}},\n\nOndanks onze eerdere herinnering staat factuur {{document_number}} ({{total}}) nog steeds open. De factuur is inmiddels {{days_overdue}} dagen over de vervaldatum ({{due_date}}). Wij verzoeken u dringend het openstaande bedrag per omgaande te voldoen op IBAN {{iban}}.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_reminder_final: {
    subject: 'Laatste aanmaning: factuur {{document_number}}',
    body: 'Beste {{customer_name}},\n\nDit is onze laatste aanmaning voor factuur {{document_number}} ten bedrage van {{total}}, die nu {{days_overdue}} dagen achterstallig is. Wij verzoeken u het bedrag binnen 7 dagen te voldoen op IBAN {{iban}} om verdere (incasso)kosten te voorkomen.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
}

const DEFAULT_CONFIG: ReminderConfig = {
  auto_send_enabled: false,
  send_hour: 8,
  working_days_only: true,
  repeat_interval_days: 7,
  max_count: 3,
  steps: [
    { days_after_due: 1, template_key: 'payment_reminder_1', tone: 'gentle' },
    { days_after_due: 14, template_key: 'payment_reminder_2', tone: 'second' },
    { days_after_due: 30, template_key: 'payment_reminder_final', tone: 'final' },
  ],
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // 1. Shared-secret gate — before any work.
  const secret = Deno.env.get('REMINDER_CRON_SECRET')
  if (!secret || req.headers.get('X-Reminder-Cron-Secret') !== secret) {
    return json({ error: 'unauthorized' }, 401)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') || 'documents@example.com'
  const APP_URL = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not set' }, 500)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // 2. Load settings.
  const { data: settings } = await admin
    .from('document_settings')
    .select('client_reminder_config, email_templates, company_name, bank_iban')
    .limit(1)
    .maybeSingle()

  const cfg: ReminderConfig = { ...DEFAULT_CONFIG, ...(settings?.client_reminder_config ?? {}) }
  const templates: Record<string, Template> = (settings?.email_templates ?? {}) as Record<string, Template>
  const companyName = settings?.company_name ?? ''
  const iban = settings?.bank_iban ?? ''
  const portalLink = APP_URL ? `${APP_URL}/portal/documents` : ''

  // 3. Time-of-day / working-day gate (Europe/Amsterdam).
  const nowParts = amsterdamParts()
  const result = { clientSent: 0, clientFailed: 0, clientSkipped: 0, adminSent: 0 }

  const hourOk = nowParts.hour === cfg.send_hour
  const dayOk = !cfg.working_days_only || (nowParts.weekday >= 1 && nowParts.weekday <= 5)

  // 4. Client overdue reminders (only when auto-send is on and within window).
  if (cfg.auto_send_enabled && hourOk && dayOk) {
    // Build the full milestone ladder ONCE: explicit steps first, then repeats
    // of the last step every repeat_interval_days, capped at max_count. Each
    // milestone has a stable index used as the idempotency key — independent of
    // how many manual reminders were sent, so manual sends can never make the
    // auto-job skip or duplicate a tone.
    const milestones = buildMilestones(cfg)

    // Candidate overdue, unpaid, non-opted-out invoices that have an invoice doc.
    const { data: orders } = await admin
      .from('orders')
      .select('id, order_number, total, invoice_due_date, reminders_opted_out, customer:customers!customer_id(id, company_name, email, reminders_opted_out)')
      .lt('invoice_due_date', todayISO())
      .not('status', 'in', '(completed,cancelled,refunded)')
      .eq('reminders_opted_out', false)

    for (const o of (orders ?? []) as Record<string, unknown>[]) {
      const customer = (o.customer ?? {}) as Record<string, unknown>
      const email = customer.email as string | undefined
      if (!email || customer.reminders_opted_out) { result.clientSkipped++; continue }

      // Must have an invoice document.
      const { data: invDoc } = await admin
        .from('documents')
        .select('document_number')
        .eq('order_id', o.id as string)
        .eq('document_type', 'invoice')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!invDoc) { result.clientSkipped++; continue }

      // Reminders already sent (manual + auto), newest first, for the cap and
      // the spacing guard.
      const { data: priorSends } = await admin
        .from('document_sends')
        .select('created_at')
        .eq('order_id', o.id as string)
        .eq('document_type', 'payment_reminder')
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
      const remindersSent = priorSends?.length ?? 0
      if (remindersSent >= cfg.max_count) { result.clientSkipped++; continue }

      const daysOverdue = daysBetween(o.invoice_due_date as string)

      // Current due milestone = the highest milestone whose threshold has passed.
      let current: Milestone | null = null
      for (const m of milestones) if (daysOverdue >= m.day) current = m
      if (!current) { result.clientSkipped++; continue }
      const stepNumber = current.idx + 1

      // Spacing guard: never fire within repeat_interval_days of the last
      // reminder (manual or auto), so an auto-send can't pile onto a manual one.
      const lastSent = priorSends?.[0]?.created_at as string | undefined
      if (lastSent && daysSinceTs(lastSent) < cfg.repeat_interval_days) { result.clientSkipped++; continue }

      // Idempotency: skip if THIS milestone was already auto-sent.
      const { data: already } = await admin
        .from('invoice_reminders')
        .select('id')
        .eq('order_id', o.id as string)
        .eq('step_number', stepNumber)
        .eq('channel', 'auto')
        .eq('status', 'sent')
        .maybeSingle()
      if (already) { result.clientSkipped++; continue }

      const step = current
      const tmpl = templates[step.template_key] ?? DEFAULT_TEMPLATES[step.template_key] ?? DEFAULT_TEMPLATES.payment_reminder_1
      const ctx = {
        company_name: companyName,
        customer_name: (customer.company_name as string) ?? '',
        document_number: invDoc.document_number as string,
        order_number: o.order_number as string,
        total: formatEuro(o.total as number),
        due_date: formatNlDate(o.invoice_due_date as string),
        days_overdue: String(daysOverdue),
        iban,
        portal_link: portalLink,
      }
      const subject = render(tmpl.subject, ctx)
      const body = render(tmpl.body, ctx)

      // Log a pending document_sends row FIRST. If we can't track it, do not
      // email — otherwise an untracked send would be re-sent next run.
      const { data: sendRow, error: sendInsertErr } = await admin.from('document_sends').insert({
        document_id: null,
        order_id: o.id as string,
        document_type: 'payment_reminder',
        recipient_email: email,
        bcc_email: null,
        subject, body,
        status: 'pending',
      }).select('id').single()

      if (sendInsertErr || !sendRow) { result.clientFailed++; continue }

      const { ok, resendId, error } = await sendResend(RESEND_API_KEY, FROM_ADDRESS, email, subject, body)

      await admin.from('document_sends').update(
        ok
          ? { status: 'sent', resend_message_id: resendId, sent_at: new Date().toISOString() }
          : { status: 'failed', error_message: error },
      ).eq('id', sendRow.id)

      if (ok) {
        await admin.from('invoice_reminders').insert({
          order_id: o.id as string,
          step_number: stepNumber,
          channel: 'auto',
          status: 'sent',
          document_send_id: sendRow?.id ?? null,
        })
        result.clientSent++
      } else {
        result.clientFailed++
      }
    }
  }

  // 5. Admin reminder email nudges (independent of the client gate).
  if (hourOk && dayOk) {
    const { data: dueReminders } = await admin
      .from('reminders')
      .select('id, user_id, title, notes, remind_at')
      .eq('email_enabled', true)
      .eq('is_dismissed', false)
      .is('email_sent_at', null)
      .lte('remind_at', new Date().toISOString())
      .limit(200)

    for (const r of (dueReminders ?? []) as Record<string, unknown>[]) {
      const { data: userRes } = await admin.auth.admin.getUserById(r.user_id as string)
      const email = userRes?.user?.email
      if (!email) continue
      const subject = `Herinnering: ${r.title as string}`
      const body = `${r.title as string}${r.notes ? `\n\n${r.notes as string}` : ''}`
      const { ok } = await sendResend(RESEND_API_KEY, FROM_ADDRESS, email, subject, body)
      if (ok) {
        await admin.from('reminders').update({ email_sent_at: new Date().toISOString() }).eq('id', r.id as string)
        result.adminSent++
      }
    }
  }

  return json({ ok: true, ...result, ranAt: new Date().toISOString() }, 200)
})

// --- helpers ---------------------------------------------------------------

interface Milestone { idx: number; day: number; template_key: string; tone: string }

/**
 * Expand the config into a stable, ordered milestone ladder capped at max_count:
 * explicit steps first, then repeats of the last step every repeat_interval_days.
 * Indexes are stable so they can key idempotency regardless of manual sends.
 */
function buildMilestones(cfg: ReminderConfig): Milestone[] {
  const steps = [...cfg.steps].sort((a, b) => a.days_after_due - b.days_after_due)
  const out: Milestone[] = []
  if (steps.length === 0) return out
  const repeat = Math.max(1, cfg.repeat_interval_days)
  const max = Math.max(1, cfg.max_count)
  for (let i = 0; i < max; i++) {
    if (i < steps.length) {
      out.push({ idx: i, day: steps[i].days_after_due, template_key: steps[i].template_key, tone: steps[i].tone })
    } else {
      const last = steps[steps.length - 1]
      const extra = i - steps.length + 1
      out.push({ idx: i, day: last.days_after_due + extra * repeat, template_key: last.template_key, tone: last.tone })
    }
  }
  return out
}

function render(tmpl: string, ctx: Record<string, string>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => ctx[k] ?? '')
}

async function sendResend(apiKey: string, from: string, to: string, subject: string, body: string) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], subject,
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; white-space: pre-wrap; color: #1e293b;">${escapeHtml(body)}</div>`,
      }),
    })
    const data = await r.json() as { id?: string; message?: string; name?: string }
    if (!r.ok) return { ok: false, error: data.message || data.name || `Resend ${r.status}` }
    return { ok: true, resendId: data.id ?? null }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function daysBetween(dueISO: string): number {
  const due = new Date(dueISO + 'T00:00:00Z').getTime()
  const now = new Date(todayISO() + 'T00:00:00Z').getTime()
  return Math.floor((now - due) / 86400000)
}

function daysSinceTs(tsISO: string): number {
  return Math.floor((Date.now() - new Date(tsISO).getTime()) / 86400000)
}

function amsterdamParts(): { hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam', hour: 'numeric', hour12: false, weekday: 'short',
  })
  const parts = fmt.formatToParts(new Date())
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0') % 24
  const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const weekday = wkMap[parts.find(p => p.type === 'weekday')?.value ?? 'Sun'] ?? 0
  return { hour, weekday }
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format((cents ?? 0) / 100)
}

function formatNlDate(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}
