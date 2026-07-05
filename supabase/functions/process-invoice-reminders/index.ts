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
type Lang = 'nl' | 'en'

// Kept in sync with apps/admin/src/services/documentEmail.ts (the edge function
// can't import from the app). NL for NL/BE customers, EN for everyone else.
const DEFAULT_TEMPLATES_NL: Record<string, Template> = {
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

const DEFAULT_TEMPLATES_EN: Record<string, Template> = {
  payment_reminder_1: {
    subject: 'Reminder: invoice {{document_number}} outstanding',
    body: 'Dear {{customer_name}},\n\nThis may have escaped your attention: invoice {{document_number}} for {{total}} was due on {{due_date}} and is still outstanding. We kindly ask you to transfer the amount to IBAN {{iban}}. You can view the invoice at {{portal_link}}.\n\nKind regards,\n{{company_name}}',
  },
  payment_reminder_2: {
    subject: 'Second reminder: invoice {{document_number}}',
    body: 'Dear {{customer_name}},\n\nDespite our earlier reminder, invoice {{document_number}} ({{total}}) is still outstanding. It is now {{days_overdue}} days past the due date ({{due_date}}). We urgently request that you pay the outstanding amount immediately to IBAN {{iban}}.\n\nKind regards,\n{{company_name}}',
  },
  payment_reminder_final: {
    subject: 'Final notice: invoice {{document_number}}',
    body: 'Dear {{customer_name}},\n\nThis is our final notice for invoice {{document_number}} for {{total}}, now {{days_overdue}} days overdue. We request that you pay the amount within 7 days to IBAN {{iban}} to avoid further (collection) costs.\n\nKind regards,\n{{company_name}}',
  },
}

const DEFAULTS_BY_LANG: Record<Lang, Record<string, Template>> = {
  nl: DEFAULT_TEMPLATES_NL,
  en: DEFAULT_TEMPLATES_EN,
}

function resolveLang(country: string | null | undefined): Lang {
  const code = (country || 'NL').trim().toUpperCase()
  return code === 'NL' || code === 'BE' ? 'nl' : 'en'
}

// email_templates is now language-nested ({ nl, en }); older rows may be a flat
// map (treated as NL). Return the template bucket for the requested language.
function langBucket(raw: Record<string, unknown>, lang: Lang): Record<string, Template> {
  const nested = 'nl' in raw || 'en' in raw
  if (nested) return (raw[lang] as Record<string, Template>) ?? {}
  return lang === 'nl' ? (raw as Record<string, Template>) : {}
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
  const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') || 'info@melekhalalfood.nl'
  const APP_URL = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not set' }, 500)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // 2. Load settings.
  const { data: settings } = await admin
    .from('document_settings')
    .select('client_reminder_config, email_templates, company_name, company_logo_url, company_address, company_postal_code, company_city, company_country, company_phone, company_email, company_website, company_vat_number, company_kvk_number, bank_iban, bank_account_holder')
    .limit(1)
    .maybeSingle()

  const cfg: ReminderConfig = { ...DEFAULT_CONFIG, ...(settings?.client_reminder_config ?? {}) }
  const rawTemplates = (settings?.email_templates ?? {}) as Record<string, unknown>
  const companyName = settings?.company_name ?? ''
  const iban = settings?.bank_iban ?? ''
  const portalLink = APP_URL ? `${APP_URL}/portal/documents` : ''

  // Company branding for the HTML email shell (logo header + footer).
  const brand: EmailBrandSettings = {
    company_name: settings?.company_name ?? null,
    company_logo_url: settings?.company_logo_url ?? null,
    company_address: settings?.company_address ?? null,
    company_postal_code: settings?.company_postal_code ?? null,
    company_city: settings?.company_city ?? null,
    company_country: settings?.company_country ?? null,
    company_phone: settings?.company_phone ?? null,
    company_email: settings?.company_email ?? null,
    company_website: settings?.company_website ?? null,
    company_vat_number: settings?.company_vat_number ?? null,
    company_kvk_number: settings?.company_kvk_number ?? null,
    bank_iban: settings?.bank_iban ?? null,
    bank_account_holder: settings?.bank_account_holder ?? null,
  }

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
      .select('id, order_number, total, invoice_due_date, reminders_opted_out, customer:customers!customer_id(id, company_name, email, billing_country, reminders_opted_out)')
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
      const lang = resolveLang(customer.billing_country as string | undefined)
      const bucket = langBucket(rawTemplates, lang)
      const defaults = DEFAULTS_BY_LANG[lang]
      const tmpl = bucket[step.template_key] ?? defaults[step.template_key] ?? defaults.payment_reminder_1
      const ctx = {
        company_name: companyName,
        customer_name: (customer.company_name as string) ?? '',
        document_number: invDoc.document_number as string,
        order_number: o.order_number as string,
        total: formatEuro(o.total as number),
        due_date: formatDate(o.invoice_due_date as string, lang),
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

      const { ok, resendId, error } = await sendResend(RESEND_API_KEY, FROM_ADDRESS, email, subject, body, brand)

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
      const { ok } = await sendResend(RESEND_API_KEY, FROM_ADDRESS, email, subject, body, brand)
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

async function sendResend(apiKey: string, from: string, to: string, subject: string, body: string, brand: EmailBrandSettings = {}) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], subject,
        html: buildBrandedEmailHtml(body, brand),
      }),
    })
    const data = await r.json() as { id?: string; message?: string; name?: string }
    if (!r.ok) return { ok: false, error: data.message || data.name || `Resend ${r.status}` }
    return { ok: true, resendId: data.id ?? null }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ===========================================================================
// Branded HTML email shell.
// DUPLICATED (kept in sync) with apps/admin/src/utils/emailHtml.ts and
// supabase/functions/send-document-email/index.ts. Change all three together
// so the Outbox preview matches what customers receive.
// ===========================================================================

interface EmailBrandSettings {
  company_name?: string | null
  company_logo_url?: string | null
  company_address?: string | null
  company_postal_code?: string | null
  company_city?: string | null
  company_country?: string | null
  company_phone?: string | null
  company_email?: string | null
  company_website?: string | null
  company_vat_number?: string | null
  company_kvk_number?: string | null
  bank_iban?: string | null
  bank_account_holder?: string | null
}

function joinParts(parts: Array<string | null | undefined>, sep: string): string {
  return parts.filter((p) => p && String(p).trim()).join(sep)
}

function buildBrandedEmailHtml(body: string, s: EmailBrandSettings = {}): string {
  const BRAND = '#16a34a', BRAND_DARK = '#166534', INK = '#1e293b', MUTED = '#64748b', LINE = '#e2e8f0', CANVAS = '#f1f5f9'
  const company = (s.company_name || '').trim() || 'Melek Halal Food'

  const header = s.company_logo_url
    ? `<img src="${escapeHtml(s.company_logo_url)}" alt="${escapeHtml(company)}" width="150" style="display:block;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(company)}</span>`

  const addressLine = joinParts([s.company_address, joinParts([joinParts([s.company_postal_code, s.company_city], ' '), s.company_country], ', ')], ', ')
  const contactLine = joinParts([
    s.company_phone ? `Tel: ${escapeHtml(s.company_phone)}` : '',
    s.company_email ? escapeHtml(s.company_email) : '',
    s.company_website ? escapeHtml(s.company_website.replace(/^https?:\/\//, '')) : '',
  ], ' &nbsp;•&nbsp; ')
  const legalLine = joinParts([
    s.company_vat_number ? `BTW: ${escapeHtml(s.company_vat_number)}` : '',
    s.company_kvk_number ? `KvK: ${escapeHtml(s.company_kvk_number)}` : '',
  ], ' &nbsp;•&nbsp; ')
  const ibanLine = s.bank_iban
    ? `IBAN: ${escapeHtml(s.bank_iban)}${s.bank_account_holder ? ` &nbsp;•&nbsp; t.n.v. ${escapeHtml(s.bank_account_holder)}` : ''}`
    : ''

  const footerRows = [addressLine, contactLine, legalLine, ibanLine]
    .filter(Boolean)
    .map((line) => `<tr><td style="padding:1px 0;font-size:11px;line-height:1.5;color:${MUTED};">${line}</td></tr>`)
    .join('')

  const bodyHtml = escapeHtml(body).replace(/\r?\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(company)}</title>
</head>
<body style="margin:0;padding:0;background-color:${CANVAS};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE};">
<tr>
<td style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});background-color:${BRAND};padding:22px 28px;">
${header}
</td>
</tr>
<tr>
<td style="padding:28px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${INK};">
${bodyHtml}
</td>
</tr>
<tr>
<td style="padding:20px 28px 0 28px;">
<div style="height:1px;background-color:${LINE};line-height:1px;font-size:0;">&nbsp;</div>
</td>
</tr>
<tr>
<td style="padding:14px 28px 24px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 0 4px 0;font-size:13px;font-weight:700;color:${INK};">${escapeHtml(company)}</td></tr>
${footerRows}
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`
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

function formatDate(iso: string, lang: Lang): string {
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}
