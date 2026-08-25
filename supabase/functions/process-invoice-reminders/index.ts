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
//   REMINDER_CRON_SECRET, RESEND_API_KEY, RESEND_FROM_ADDRESS, APP_URL,
//   RENDER_ENDPOINT_URL (the Vercel /api/render-invoice URL) + RENDER_SECRET
//   (shared with that function — used to fetch the invoice PDF to attach).
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Emails are HTML/text only (NO PDF attachment) — @react-pdf can't run here. The
// body links to the customer portal (/portal/documents) where the PDF lives.
// Both manual sends (send-document-email) and these auto sends log to
// document_sends, so reminder counts stay unified.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// The service-role client as this file uses it: no generated Database types in
// the edge runtime, so rows come back loosely typed.
// deno-lint-ignore no-explicit-any
type AdminClient = SupabaseClient<any>
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>

interface ReminderStep { days_after_due: number; template_key: string; tone: string }
interface ReminderConfig {
  auto_send_enabled: boolean
  send_hour: number
  working_days_only: boolean
  repeat_interval_days: number
  max_count: number
  steps: ReminderStep[]
  // Auto-email the invoice (PDF attached) ~24h after the order DATE (not the
  // creation time — a future-dated order sends the day after its order_date).
  // OPT-IN (treated as false when absent). Toggled in Settings → Reminders.
  initial_invoice_send_enabled?: boolean
  // Email every customer with outstanding orders a single Betaaloverzicht
  // (statement of account) on the FIRST WORKING DAY of the month, at send_hour.
  // Independent of auto_send_enabled — a statement is not a dunning letter.
  // OPT-IN (treated as false when absent).
  monthly_overview_enabled?: boolean
  // Daily digest naming customers who stopped ordering (migration 00115). Goes
  // to the OWNER, not to a customer, so it has its own hour and is independent
  // of auto_send_enabled. OPT-IN (treated as false when absent).
  inactive_alert?: InactiveAlertConfig
}
interface InactiveAlertConfig {
  enabled?: boolean
  hour?: number
  working_days_only?: boolean
  // How often the digest is SENT. 'weekly' fires on `weekday` (0 = Sunday …
  // 6 = Saturday, the amsterdamParts convention), 'monthly' on the first
  // working day. Distinct from repeat_days, which thins a DAILY mail.
  frequency?: 'daily' | 'weekly' | 'monthly'
  weekday?: number
  recipients?: string[]
  repeat_days?: number
  attach_pdf?: boolean
  include_never_ordered?: boolean
  default_days?: number | null
  by_type?: Record<string, number | null>
}
interface Template { subject: string; body: string }
type Lang = 'nl' | 'en'

// Kept in sync with apps/admin/src/services/documentEmail.ts (the edge function
// can't import from the app). NL for NL/BE customers, EN for everyone else.
const DEFAULT_TEMPLATES_NL: Record<string, Template> = {
  invoice: {
    subject: 'Factuur {{document_number}} van {{company_name}}',
    body: 'Beste {{customer_name}},\n\nBijgaand ontvangt u factuur {{document_number}} ter waarde van {{total}} met vervaldatum {{due_date}}. Wij verzoeken u vriendelijk het bedrag over te maken op IBAN {{iban}}.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u dit betalingsverzoek als niet verzonden beschouwen. De bijgevoegde factuur blijft uiteraard van belang voor uw administratie.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_reminder_1: {
    subject: 'Herinnering: factuur {{document_number}} openstaand',
    body: 'Beste {{customer_name}},\n\nMogelijk is het aan uw aandacht ontsnapt: factuur {{document_number}} ter waarde van {{total}} had vervaldatum {{due_date}} en staat nog open. Wij verzoeken u vriendelijk het bedrag over te maken op IBAN {{iban}}.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u deze herinnering als niet verzonden beschouwen.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_reminder_2: {
    subject: 'Tweede herinnering: factuur {{document_number}}',
    body: 'Beste {{customer_name}},\n\nOndanks onze eerdere herinnering staat factuur {{document_number}} ({{total}}) nog steeds open. De factuur is inmiddels {{days_overdue}} dagen over de vervaldatum ({{due_date}}). Wij verzoeken u dringend het openstaande bedrag per omgaande te voldoen op IBAN {{iban}}.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u deze herinnering als niet verzonden beschouwen.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_reminder_final: {
    subject: 'Laatste aanmaning: factuur {{document_number}}',
    body: 'Beste {{customer_name}},\n\nDit is onze laatste aanmaning voor factuur {{document_number}} ten bedrage van {{total}}, die nu {{days_overdue}} dagen achterstallig is. Wij verzoeken u het bedrag binnen 7 dagen te voldoen op IBAN {{iban}} om verdere (incasso)kosten te voorkomen.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u deze aanmaning als niet verzonden beschouwen.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_overview: {
    subject: 'Betaaloverzicht {{period}} van {{company_name}}',
    body: 'Beste {{customer_name}},\n\nIn de bijlage vindt u uw betaaloverzicht: alle facturen die volgens onze administratie nog openstaan. Het gaat om {{invoice_count}} factuur/facturen met een totaalbedrag van {{total}}.\n\nWij verzoeken u vriendelijk het openstaande bedrag over te maken op IBAN {{iban}}, onder vermelding van het factuurnummer. Uw facturen kunt u ook bekijken via {{portal_link}}.\n\nHeeft u een of meer van deze facturen inmiddels betaald? Dan kunt u die regels als voldaan beschouwen. Betalingen van de afgelopen dagen zijn mogelijk nog niet verwerkt.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
}

const DEFAULT_TEMPLATES_EN: Record<string, Template> = {
  invoice: {
    subject: 'Invoice {{document_number}} from {{company_name}}',
    body: 'Dear {{customer_name}},\n\nPlease find attached invoice {{document_number}} for {{total}}, due on {{due_date}}. We kindly ask you to transfer the amount to IBAN {{iban}}.\n\nHave you already paid this invoice? If so, you can disregard this payment request. The attached invoice remains relevant for your records.\n\nKind regards,\n{{company_name}}',
  },
  payment_reminder_1: {
    subject: 'Reminder: invoice {{document_number}} outstanding',
    body: 'Dear {{customer_name}},\n\nThis may have escaped your attention: invoice {{document_number}} for {{total}} was due on {{due_date}} and is still outstanding. We kindly ask you to transfer the amount to IBAN {{iban}}.\n\nHave you already paid this invoice? If so, please disregard this reminder.\n\nKind regards,\n{{company_name}}',
  },
  payment_reminder_2: {
    subject: 'Second reminder: invoice {{document_number}}',
    body: 'Dear {{customer_name}},\n\nDespite our earlier reminder, invoice {{document_number}} ({{total}}) is still outstanding. It is now {{days_overdue}} days past the due date ({{due_date}}). We urgently request that you pay the outstanding amount immediately to IBAN {{iban}}.\n\nHave you already paid this invoice? If so, please disregard this reminder.\n\nKind regards,\n{{company_name}}',
  },
  payment_reminder_final: {
    subject: 'Final notice: invoice {{document_number}}',
    body: 'Dear {{customer_name}},\n\nThis is our final notice for invoice {{document_number}} for {{total}}, now {{days_overdue}} days overdue. We request that you pay the amount within 7 days to IBAN {{iban}} to avoid further (collection) costs.\n\nHave you already paid this invoice? If so, please disregard this notice.\n\nKind regards,\n{{company_name}}',
  },
  payment_overview: {
    subject: 'Statement of account {{period}} from {{company_name}}',
    body: 'Dear {{customer_name}},\n\nPlease find attached your statement of account: all invoices that, according to our records, are still outstanding. This covers {{invoice_count}} invoice(s) for a total of {{total}}.\n\nWe kindly ask you to transfer the outstanding amount to IBAN {{iban}}, quoting the invoice number. You can also view your invoices at {{portal_link}}.\n\nHave you already paid one or more of these invoices? Please consider those lines settled. Payments made in the last few days may not yet be processed.\n\nKind regards,\n{{company_name}}',
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

/**
 * Resolve a template with PER-FIELD fallback, mirroring getTemplate() in
 * apps/admin/src/services/documentEmail.ts. This must not be a whole-template
 * `saved ?? default`: the Settings UI stores whatever is typed, so saving only
 * a custom subject leaves `body: ''` — a whole-template fallback would then
 * email the customer an EMPTY body, while the admin UI showed the default.
 */
function resolveTemplate(
  bucket: Record<string, Template>,
  defaults: Record<string, Template>,
  key: string,
): Template {
  const def = defaults[key] ?? defaults.payment_reminder_1
  const saved = bucket[key]
  if (!saved) return def
  return {
    subject: saved.subject || def.subject,
    body: saved.body || def.body,
  }
}

/**
 * document_sends.status values that mean "this email was already handed to
 * Resend" — i.e. it must NOT be sent again.
 *
 * Do NOT match on `status = 'sent'`. `sent` is only the status for the first
 * ~15 minutes: the sync-email-status cron polls Resend and rewrites it in place
 * to the real outcome (delivered / bounced / suppressed / complained). An
 * `eq('status','sent')` dedup therefore stops matching once the row is synced,
 * the send looks like it never happened, and the invoice is re-emailed every
 * run (this shipped ~55 duplicate invoices over 15-17 Jul 2026).
 *
 * Only `pending` (mid-flight) and `failed` (Resend rejected it) may retry, so
 * the guard is expressed as an exclusion — any status added later counts as
 * sent by default, which fails safe (no duplicate mail).
 *
 * `bounced`/`suppressed` deliberately count as sent: those addresses are dead,
 * and retrying daily just re-mails a dead mailbox. They surface in the Outbox
 * "problems" filter + the Dashboard delivery alert for a human to fix instead.
 */
const NOT_YET_SENT_STATUSES = '(pending,failed)'

/** How many SEND days an unsent invoice stays a candidate. See sendWindowFloorISO. */
const INVOICE_SEND_ATTEMPTS = 3

const DEFAULT_CONFIG: ReminderConfig = {
  auto_send_enabled: false,
  send_hour: 8,
  working_days_only: true,
  repeat_interval_days: 7,
  max_count: 3,
  // OPT-IN: stays off until the owner enables it in Settings → Reminders (after
  // the Vercel PDF renderer env is wired). Prevents a rollout mass-send and any
  // surprise customer mail.
  initial_invoice_send_enabled: false,
  // OPT-IN for the same reason: enabling it mails EVERY customer with an open
  // balance at once. Owner flips it in Settings → Reminders after reviewing a
  // sample in /overdue?tab=overview.
  monthly_overview_enabled: false,
  // OPT-IN. Note the thresholds themselves live in the DB config and are read
  // by get_customer_activity, NOT here: the RPC resolves the rule chain for
  // both the cron and the browser so the screen can never promise a rule the
  // digest does not honour. What this object gates is WHEN and TO WHOM.
  inactive_alert: {
    enabled: false, hour: 8, working_days_only: true,
    frequency: 'daily', weekday: 1, repeat_days: 0, attach_pdf: true,
  },
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
  const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') || 'debiteuren@melekhalalfood.nl'
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
  const result = {
    clientSent: 0, clientFailed: 0, clientSkipped: 0, adminSent: 0,
    invoiceSent: 0, invoiceFailed: 0, invoiceSkipped: 0,
    overviewSent: 0, overviewFailed: 0, overviewSkipped: 0,
    inactiveReported: 0, inactiveSent: 0, inactiveFailed: 0, inactiveSkipped: 0,
  }

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
      .not('status', 'in', '(draft,completed,cancelled,refunded)')
      .eq('reminders_opted_out', false)

    // Active snoozes — a snoozed invoice must NOT receive automatic reminders
    // until the snooze expires (mirrors the in-app "Gesnoozed" state). Batch-
    // loaded once to avoid an N+1 in the per-order loop.
    const nowISO = new Date().toISOString()
    const { data: snoozeRows } = await admin
      .from('invoice_reminder_state')
      .select('order_id')
      .gt('snoozed_until', nowISO)
    const snoozedSet = new Set((snoozeRows ?? []).map((r) => (r as { order_id: string }).order_id))

    for (const o of (orders ?? []) as Record<string, unknown>[]) {
      if (snoozedSet.has(o.id as string)) { result.clientSkipped++; continue }
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
      // the spacing guard. Counts every non-retryable status, not just 'sent'
      // — see NOT_YET_SENT_STATUSES.
      const { data: priorSends } = await admin
        .from('document_sends')
        .select('created_at')
        .eq('order_id', o.id as string)
        .eq('document_type', 'payment_reminder')
        .not('status', 'in', NOT_YET_SENT_STATUSES)
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
      const tmpl = resolveTemplate(bucket, defaults, step.template_key)
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

      // Attach the invoice PDF (rendered by the Vercel function) so the customer
      // receives the actual invoice, not just a link. Best-effort.
      const reminderPdf = await fetchInvoicePdf(o.id as string)
      const { ok, resendId, error } = await sendResend(RESEND_API_KEY, FROM_ADDRESS, email, subject, body, brand, reminderPdf)

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

  // 6. Initial invoice auto-send — email the invoice (PDF attached) once, ~24h
  //    after the order DATE. Sent in the SAME window as the reminders
  //    (cfg.send_hour on working days), so no 03:00/Sunday mail. Gates, all of
  //    which must hold:
  //      - cfg.initial_invoice_send_enabled === true  (OPT-IN; off by default)
  //      - renderConfigured  (Vercel PDF renderer wired → never a PDF-less email)
  //      - hourOk && dayOk    (business-hours send window)
  //    Candidate window is keyed on order_date (the delivery/order date the user
  //    sets), NOT created_at: an order entered on 13 Jul for an order_date of
  //    16 Jul must send on 17 Jul (day after the order date), never 14 Jul.
  //    order_date is a DATE column, so compare against date strings. The send
  //    opens the day after order_date (order_date <= yesterday) and the floor
  //    (3 SEND days back, sendWindowFloorISO) keeps the band narrow: no rollout
  //    blast of old orders, still 3 real retries on every weekday — a calendar
  //    floor gave a Friday order only one. Drafts are excluded (an unfinalized order
  //    must not be auto-emailed); cancelled/refunded/trashed too. Idempotent on a
  //    SUCCESSFUL send only, so a transient failure retries next day instead of
  //    permanently blocking the invoice.
  const renderConfigured = !!Deno.env.get('RENDER_ENDPOINT_URL') && !!Deno.env.get('RENDER_SECRET')
  if (cfg.initial_invoice_send_enabled === true && renderConfigured && hourOk && dayOk) {
    const upperDate = dateOffsetISO(-1)   // yesterday — order_date on/before this
    // Floor counted in SEND days, not calendar days. See sendWindowFloorISO.
    // 🚨 `!!cfg.working_days_only` mirrors `dayOk` above EXACTLY. dayOk reads
    // `!cfg.working_days_only`, so an absent flag means "send every day" and the
    // floor must then stay calendar-based. Defaulting it to true here (as the
    // Klantactiviteit block does with its own config) would widen the window on
    // a tenant that sends daily, and a wider window is more mail.
    const lowerDate = sendWindowFloorISO(INVOICE_SEND_ATTEMPTS, !!cfg.working_days_only)
    const { data: newOrders } = await admin
      .from('orders')
      .select('id, order_number, total, order_date, invoice_due_date, reminders_opted_out, customer:customers!customer_id(id, company_name, email, billing_country, reminders_opted_out)')
      .lte('order_date', upperDate)
      .gte('order_date', lowerDate)
      .is('deleted_at', null)
      .not('status', 'in', '(draft,cancelled,refunded)')
      .eq('reminders_opted_out', false)
      .limit(100)

    for (const o of (newOrders ?? []) as Record<string, unknown>[]) {
      const customer = (o.customer ?? {}) as Record<string, unknown>
      const email = customer.email as string | undefined
      if (!email || customer.reminders_opted_out) { result.invoiceSkipped++; continue }

      // First invoice only: skip if the invoice was already handed to Resend
      // (manual send or a prior auto run). A 'failed'/'pending' row does NOT
      // block a retry — otherwise one transient error kills the send forever.
      // Must NOT match on status='sent' alone; see NOT_YET_SENT_STATUSES.
      const { data: sentInvoice } = await admin
        .from('document_sends')
        .select('id')
        .eq('order_id', o.id as string)
        .eq('document_type', 'invoice')
        .not('status', 'in', NOT_YET_SENT_STATUSES)
        .limit(1)
      if (sentInvoice && sentInvoice.length > 0) { result.invoiceSkipped++; continue }

      // Require an issued invoice document (auto-generated on save).
      const { data: invDoc } = await admin
        .from('documents')
        .select('id, document_number')
        .eq('order_id', o.id as string)
        .eq('document_type', 'invoice')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!invDoc) { result.invoiceSkipped++; continue }

      // Render the PDF FIRST — it's the whole point of this send. If it's
      // unavailable (renderer hiccup), skip WITHOUT logging a send, so we never
      // email an invoice whose body says "attached" with nothing attached, and
      // the order simply retries on the next run.
      const pdf = await fetchInvoicePdf(o.id as string)
      if (!pdf) { result.invoiceFailed++; continue }

      const lang = resolveLang(customer.billing_country as string | undefined)
      const bucket = langBucket(rawTemplates, lang)
      const defaults = DEFAULTS_BY_LANG[lang]
      const tmpl = resolveTemplate(bucket, defaults, 'invoice')
      const ctx = {
        company_name: companyName,
        customer_name: (customer.company_name as string) ?? '',
        document_number: invDoc.document_number as string,
        order_number: o.order_number as string,
        total: formatEuro(o.total as number),
        due_date: o.invoice_due_date ? formatDate(o.invoice_due_date as string, lang) : '',
        days_overdue: '0',
        iban,
        portal_link: portalLink,
      }
      const subject = render(tmpl.subject, ctx)
      const body = render(tmpl.body, ctx)

      // Log a pending row FIRST (untracked send would re-fire next run).
      const { data: sendRow, error: sendInsertErr } = await admin.from('document_sends').insert({
        document_id: invDoc.id as string,
        order_id: o.id as string,
        document_type: 'invoice',
        recipient_email: email,
        bcc_email: null,
        subject, body,
        status: 'pending',
      }).select('id').single()
      if (sendInsertErr || !sendRow) { result.invoiceFailed++; continue }

      const { ok, resendId, error } = await sendResend(RESEND_API_KEY, FROM_ADDRESS, email, subject, body, brand, pdf)

      await admin.from('document_sends').update(
        ok
          ? { status: 'sent', resend_message_id: resendId, sent_at: new Date().toISOString() }
          : { status: 'failed', error_message: error },
      ).eq('id', sendRow.id)

      if (ok) result.invoiceSent++
      else result.invoiceFailed++
    }
  }

  // 7. Monthly Betaaloverzicht — ONE statement of account per customer listing
  //    every still-unpaid, billed order, on the FIRST WORKING DAY of the month.
  //
  //    Why it lives here and not in its own cron: this function already runs
  //    hourly, holds the settings, the branding, the Resend helper and the
  //    renderer client — and, decisively, a separate function would need its own
  //    Vault entries and secrets on BOTH tenants. Nothing new to provision.
  //
  //    Gates, all of which must hold:
  //      - cfg.monthly_overview_enabled === true  (OPT-IN; off by default)
  //      - renderConfigured   (never a PDF-less "see attached" email)
  //      - hourOk && dayOk    (the shared business-hours send window)
  //      - first working day of the month
  //    Deliberately NOT gated on cfg.auto_send_enabled: that is the dunning
  //    kill-switch, and a statement is a courtesy summary, not a dunning letter.
  //
  //    Enabling mid-month does NOT backfill — the day test simply won't match
  //    again until next month, so flipping the toggle can never blast every
  //    customer the same afternoon.
  if (
    cfg.monthly_overview_enabled === true &&
    renderConfigured &&
    hourOk && dayOk &&
    isFirstWorkingDayOfMonth(nowParts, cfg.working_days_only)
  ) {
    const period = currentPeriod(nowParts)

    // Same RPC the admin tab previews from, so a preview cannot disagree with
    // what is mailed. Callable here because auth.uid() is NULL under the service
    // role and the function admits that case explicitly (migration 00103).
    const { data: candidates, error: candErr } = await admin
      .rpc('get_payment_overview_customers', { p_period: period })

    if (candErr) {
      result.overviewFailed++
    } else {
      for (const c of (candidates ?? []) as Record<string, unknown>[]) {
        const customerId = c.customer_id as string
        const email = ((c.email as string) ?? '').trim()
        if (!email || c.reminders_opted_out === true) { result.overviewSkipped++; continue }
        if (Number(c.open_count ?? 0) <= 0) { result.overviewSkipped++; continue }

        // NOTHING OVERDUE → no statement this month.
        //
        // The statement itself deliberately lists EVERY open invoice, including
        // ones still within terms — that is what makes the "totaal openstaand"
        // a figure the customer can reconcile against their own ledger. But a
        // customer whose invoices are ALL still within terms owes nothing yet,
        // and mailing them a payment overview reads as chasing. Luiten Food was
        // the case that surfaced this: one invoice, €56.854,40, not due for
        // another 12 days, and it would have been their entire statement.
        //
        // So the gate is on SENDING, not on the contents. overdue_count comes
        // from the same RPC the admin tab lists from (COUNT FILTER
        // days_overdue > 0), so the tab's "Heeft verlopen facturen" filter is
        // exactly the set that gets mail. An invoice due TODAY counts as not
        // overdue, which is correct — it is not late yet.
        if (Number(c.overdue_count ?? 0) <= 0) { result.overviewSkipped++; continue }

        // Already handed to Resend for this period? Skip. Expressed as an
        // EXCLUSION of the retryable statuses — never `= 'sent'`, which the
        // sync-email-status cron rewrites within ~15 minutes (see
        // NOT_YET_SENT_STATUSES). A failed/pending send still retries.
        if (c.last_overview_id && c.last_send_status) {
          const s = c.last_send_status as string
          if (s !== 'pending' && s !== 'failed') { result.overviewSkipped++; continue }
        }

        // Freeze the snapshot for (customer, period). Upsert on the unique index
        // so a retry re-uses the row instead of issuing a second statement.
        const { data: lines, error: linesErr } = await admin
          // p_overdue_only: the statement lists only what is actually late
          // (migration 00107). Must match buildPaymentOverviewData in the app,
          // or the tab's preview stops being the document that gets mailed.
          .rpc('get_payment_overview_orders', { p_customer_id: customerId, p_overdue_only: true })
        if (linesErr || !lines || (lines as unknown[]).length === 0) {
          result.overviewSkipped++
          continue
        }

        const snapshot = await buildOverviewSnapshot(
          admin, customerId, period, lines as Record<string, unknown>[], settings ?? {},
        )
        if (!snapshot) { result.overviewFailed++; continue }

        const { data: ovRow, error: ovErr } = await admin
          .from('payment_overviews')
          .upsert({
            customer_id: customerId,
            period,
            snapshot,
            total_cents: snapshot.totalCents,
            order_count: snapshot.lines.length,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'customer_id,period' })
          .select('id')
          .single()
        if (ovErr || !ovRow) { result.overviewFailed++; continue }

        // PDF FIRST, from the row we just wrote — identical to Step 6's rule.
        const pdf = await fetchOverviewPdf(ovRow.id as string)
        if (!pdf) { result.overviewFailed++; continue }

        const lang = snapshot.lang
        const bucket = langBucket(rawTemplates, lang)
        const tmpl = resolveTemplate(bucket, DEFAULTS_BY_LANG[lang], 'payment_overview')
        const ctx = {
          company_name: companyName,
          customer_name: snapshot.customer.companyName,
          period: formatPeriodLabel(period, lang),
          invoice_count: String(snapshot.lines.length),
          total: formatEuro(snapshot.totalCents),
          iban,
          portal_link: portalLink,
        }
        const subject = render(tmpl.subject, ctx)
        const body = render(tmpl.body, ctx)

        // order_id / document_id stay NULL: a statement spans many orders and
        // belongs to none. payment_overviews.document_send_id is the link back.
        const { data: sendRow, error: sendInsertErr } = await admin
          .from('document_sends')
          .insert({
            document_id: null,
            order_id: null,
            document_type: 'payment_overview',
            recipient_email: email,
            bcc_email: null,
            subject, body,
            status: 'pending',
          })
          .select('id')
          .single()
        if (sendInsertErr || !sendRow) { result.overviewFailed++; continue }

        const { ok, resendId, error } = await sendResend(
          RESEND_API_KEY, FROM_ADDRESS, email, subject, body, brand, pdf,
        )

        await admin.from('document_sends').update(
          ok
            ? { status: 'sent', resend_message_id: resendId, sent_at: new Date().toISOString() }
            : { status: 'failed', error_message: error },
        ).eq('id', sendRow.id)

        // Link on success only — pointing at a failed row would make the next
        // run's dedup read it as already sent and drop the retry.
        if (ok) {
          await admin
            .from('payment_overviews')
            .update({ document_send_id: sendRow.id, updated_at: new Date().toISOString() })
            .eq('id', ovRow.id as string)
          result.overviewSent++
        } else {
          result.overviewFailed++
        }
      }
    }
  }

  // 8. Klantactiviteit — the daily "these customers stopped ordering" digest.
  //    Folded in here rather than given its own cron for the same reason as
  //    Step 7: a separate function needs its own Vault entries and secrets on
  //    BOTH tenants. It has its own hour and its own working-day switch, and is
  //    deliberately NOT under auto_send_enabled: this mail goes to the owner.
  const ia = cfg.inactive_alert ?? {}
  const iaHourOk = nowParts.hour === (ia.hour ?? 8)
  const iaFreq = ia.frequency ?? 'daily'
  // A chosen weekday IS the choice, so `working_days_only` deliberately does not
  // also apply to it: picking Saturday must mean Saturday. It only governs the
  // daily rhythm, where "not in the weekend" is the useful default.
  const iaDayOk =
    iaFreq === 'weekly'
      ? nowParts.weekday === (ia.weekday ?? 1)
      : iaFreq === 'monthly'
        ? isFirstWorkingDayOfMonth(nowParts, ia.working_days_only !== false)
        : (ia.working_days_only === false || (nowParts.weekday >= 1 && nowParts.weekday <= 5))

  if (ia.enabled === true && iaHourOk && iaDayOk) {
    const runDate = amsterdamYmd()

    // The cron wakes hourly; without this the 08:00 digest would mail again at
    // 09:00. UNIQUE(run_date) makes it impossible even if two runs overlap.
    const { data: existing } = await admin
      .from('customer_inactivity_digests')
      .select('id')
      .eq('run_date', runDate)
      .maybeSingle()

    if (existing) {
      result.inactiveSkipped++
    } else {
      // p_only_due = true: exactly the rows the screen calls "wordt gemeld".
      // The rule chain (customer override → type → default) lives in the RPC.
      const { data: dueRows, error: dueErr } = await admin
        .rpc('get_customer_activity', { p_only_due: true })

      let rows = (dueRows ?? []) as ActivityRow[]
      if (dueErr) {
        result.inactiveFailed++
        rows = []
      }

      // Optional suppression, DAILY ONLY: with repeat_days > 0 a customer named
      // in a recent digest is held back so consecutive mornings do not repeat
      // the same names. A weekly or monthly digest ignores it — a periodic
      // report that silently omits customers is worse than a repetitive one.
      const repeatDays = iaFreq === 'daily' ? Math.max(0, ia.repeat_days ?? 0) : 0
      if (rows.length > 0 && repeatDays > 0) {
        const since = dateOffsetISO(-repeatDays)
        const { data: recent } = await admin
          .from('customer_inactivity_digests')
          .select('customer_ids')
          .gte('run_date', since)
        const seen = new Set<string>()
        for (const d of (recent ?? [])) {
          for (const id of ((d.customer_ids ?? []) as string[])) seen.add(id)
        }
        rows = rows.filter(r => !seen.has(r.customer_id))
      }

      if (rows.length === 0) {
        // Nothing to report is the good case. Send no mail and write no row, so
        // "no digest today" never has to be read as "the job did not run".
        result.inactiveSkipped++
      } else {
        result.inactiveReported = rows.length

        // Recipients: the configured list, else the owner's own login address.
        let recipients = (ia.recipients ?? []).map(e => e.trim()).filter(Boolean)
        if (recipients.length === 0) recipients = await ownerEmails(admin)

        if (recipients.length === 0) {
          result.inactiveFailed++
        } else {
          const subject = rows.length === 1
            ? '1 klant heeft te lang niets besteld'
            : `${rows.length} klanten hebben te lang niets besteld`
          const body = buildInactivityBody(rows, runDate)

          // Insert BEFORE sending: never mail something we cannot account for.
          const { data: digest, error: digestErr } = await admin
            .from('customer_inactivity_digests')
            .insert({
              run_date: runDate,
              recipients,
              customer_ids: rows.map(r => r.customer_id),
              snapshot: rows,
              customer_count: rows.length,
              status: 'pending',
            })
            .select('id')
            .single()

          if (digestErr || !digest) {
            result.inactiveFailed++
          } else {
            // Best-effort attachment. Unlike the statement, a missing PDF must
            // NOT cancel the send: here the body is itself the report, and
            // Gurbet has no renderer configured at all.
            const pdf = ia.attach_pdf === false
              ? null
              : await fetchActivityPdf(digest.id as string)

            let anyOk = false
            let lastError: string | null = null
            let lastId: string | null = null
            for (const to of recipients) {
              const { ok, resendId, error } = await sendResend(
                RESEND_API_KEY, FROM_ADDRESS, to, subject, body, brand, pdf,
              )
              if (ok) { anyOk = true; lastId = resendId ?? null }
              else lastError = error ?? 'unknown'
            }

            await admin.from('customer_inactivity_digests').update(
              anyOk
                ? { status: 'sent', resend_message_id: lastId, sent_at: new Date().toISOString() }
                : { status: 'failed', error_message: lastError },
            ).eq('id', digest.id)

            if (anyOk) {
              result.inactiveSent++
              // One row in the existing per-user reminders table per owner, so
              // this lands in the header bell beside their own reminders rather
              // than becoming a second notification surface to check.
              await notifyOwnersInBell(admin, subject, rows)
            } else {
              result.inactiveFailed++
            }
          }
        }
      }
    }
  }

  return json({ ok: true, ...result, ranAt: new Date().toISOString() }, 200)
})

// --- Klantactiviteit helpers (Step 8) --------------------------------------

interface ActivityRow {
  customer_id: string
  company_name: string
  customer_type: string | null
  email: string | null
  phone: string | null
  city: string | null
  last_order_date: string | null
  order_count: number
  days_since: number
  threshold_days: number | null
  rule_source: string
  is_due: boolean
}

/** Owner login addresses, the fallback when no recipient is configured. */
async function ownerEmails(admin: AdminClient): Promise<string[]> {
  const { data: owners } = await admin.from('profiles').select('id').eq('role', 'owner')
  const out: string[] = []
  for (const o of ((owners ?? []) as Row[])) {
    const { data: u } = await admin.auth.admin.getUserById(o.id as string)
    const email = u?.user?.email
    if (email) out.push(email)
  }
  return out
}

/** DD-MM-YYYY, the format every screen and document in this app uses. */
function formatDateNl(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}-${m}-${y}`
}

/**
 * 🚨 Grouping kept in sync with groupActivityRows() in
 * apps/admin/src/services/customerActivity.ts, which shapes the same rows for
 * the PDF and the screen. Never-ordered customers stand apart: a name with no
 * history is a different job than a regular who went quiet.
 */
function groupForDigest(rows: ActivityRow[]): { label: string; threshold: number | null; rows: ActivityRow[] }[] {
  const labels: Record<string, string> = {
    horeca: 'Horeca', supermarkt: 'Supermarkt', other: 'Overig',
    untagged: 'Zonder klanttype', never: 'Nog nooit besteld',
  }
  const buckets = new Map<string, ActivityRow[]>()
  for (const r of rows) {
    const key = r.order_count === 0 ? 'never' : (r.customer_type ?? 'untagged')
    const list = buckets.get(key) ?? []
    list.push(r)
    buckets.set(key, list)
  }
  return ['horeca', 'supermarkt', 'other', 'untagged', 'never']
    .filter(k => buckets.has(k))
    .map(k => {
      const list = buckets.get(k)!.sort((a, b) => b.days_since - a.days_since)
      return {
        label: labels[k],
        threshold: k === 'never' ? null : (list.find(r => r.rule_source === 'type')?.threshold_days ?? null),
        rows: list,
      }
    })
}

/**
 * The mail body. Plain text (the branded shell wraps it at send time), Dutch
 * only — this is an internal document, like the route list. Every line carries
 * the three facts that make it actionable: when they last ordered, how long ago
 * that was, and how to reach them.
 */
function buildInactivityBody(rows: ActivityRow[], runDate: string): string {
  const groups = groupForDigest(rows)
  const out: string[] = [
    rows.length === 1
      ? `Deze klant heeft te lang niets besteld (peildatum ${formatDateNl(runDate)}):`
      : `Deze ${rows.length} klanten hebben te lang niets besteld (peildatum ${formatDateNl(runDate)}):`,
    '',
  ]
  for (const g of groups) {
    out.push(g.threshold != null ? `${g.label} (regel: ${g.threshold} dagen)` : g.label)
    for (const r of g.rows) {
      const when = r.last_order_date
        ? `laatste bestelling ${formatDateNl(r.last_order_date)}`
        : 'nog nooit besteld'
      const extras: string[] = [`${r.days_since} dagen`]
      // Name the exception, not the rule: an own rule is why this row is here
      // on a day its type-mates are not.
      if (r.rule_source === 'customer' && r.threshold_days != null) extras.push(`eigen regel: ${r.threshold_days} dagen`)
      if (r.phone) extras.push(`tel. ${r.phone}`)
      else if (r.email) extras.push(r.email)
      out.push(`  ${r.company_name}: ${when}, ${extras.join(', ')}`)
    }
    out.push('')
  }
  out.push('Open Klantactiviteit in de app om een klant een eigen regel te geven of uit te zetten.')
  return out.join('\n')
}

/** One bell notification per owner, in the reminders table they already use. */
async function notifyOwnersInBell(
  admin: AdminClient,
  title: string,
  rows: ActivityRow[],
): Promise<void> {
  const { data: owners } = await admin.from('profiles').select('id').eq('role', 'owner')
  if (!owners || owners.length === 0) return
  const names = rows.slice(0, 5).map(r => `${r.company_name} (${r.days_since} d)`).join(', ')
  const notes = rows.length > 5 ? `${names} en ${rows.length - 5} meer` : names
  const now = new Date().toISOString()
  await admin.from('reminders').insert(
    (owners as Row[]).map(o => ({
      user_id: o.id as string,
      title,
      notes,
      remind_at: now,
      category: 'customer_inactive',
      // The mail already went out; this is the in-app copy of it.
      email_enabled: false,
    })),
  )
}

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

async function sendResend(
  apiKey: string, from: string, to: string, subject: string, body: string,
  brand: EmailBrandSettings = {},
  attachment?: { base64: string; filename: string } | null,
) {
  try {
    const payload: Record<string, unknown> = {
      from, to: [to], subject,
      html: buildBrandedEmailHtml(body, brand),
    }
    if (attachment) {
      payload.attachments = [{ filename: attachment.filename, content: attachment.base64 }]
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json() as { id?: string; message?: string; name?: string }
    if (!r.ok) return { ok: false, error: data.message || data.name || `Resend ${r.status}` }
    return { ok: true, resendId: data.id ?? null }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Fetch the rendered invoice PDF (base64) for an order from the Vercel renderer
 * (RENDER_ENDPOINT_URL) — the Deno runtime can't render @react-pdf itself.
 * Best-effort: returns null on any failure so the caller can still send the
 * email without an attachment rather than losing it entirely.
 */
async function fetchRenderedPdf(
  payload: Record<string, unknown>,
  fallbackName: string,
): Promise<{ base64: string; filename: string } | null> {
  const url = Deno.env.get('RENDER_ENDPOINT_URL')
  const secret = Deno.env.get('RENDER_SECRET')
  if (!url || !secret) return null
  // Hard timeout so a slow/hanging renderer can't stall the whole cron run and
  // starve the remaining orders in the batch.
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Render-Secret': secret },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    if (!r.ok) return null
    const data = await r.json() as { pdf_base64?: string; filename?: string }
    if (!data.pdf_base64) return null
    return { base64: data.pdf_base64, filename: data.filename ?? fallbackName }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function fetchInvoicePdf(orderId: string) {
  return fetchRenderedPdf({ orderId }, `Factuur-${orderId}.pdf`)
}

// ===========================================================================
// Betaaloverzicht snapshot builder.
//
// 🚨 KEPT IN SYNC with buildPaymentOverviewData() in
// apps/admin/src/services/paymentOverview.ts. Both must produce the SAME
// PaymentOverviewData shape, because both write it into
// payment_overviews.snapshot and the one PDF template renders whatever is
// there. If they drift, a manually sent statement and an automatic one look
// different for the same customer.
//
// The LINE data is not duplicated — both call get_payment_overview_orders, so
// "which orders qualify" has exactly one definition (migration 00103).
// ===========================================================================
interface OverviewSnapshot {
  lang: Lang
  period: string
  asAtDate: string
  company: Record<string, string | undefined>
  customer: { id: string; companyName: string; [k: string]: string | undefined }
  lines: Record<string, unknown>[]
  totalCents: number
  overdueCents: number
  overdueCount: number
}

async function buildOverviewSnapshot(
  admin: AdminClient,
  customerId: string,
  period: string,
  lines: Record<string, unknown>[],
  settings: Record<string, unknown>,
): Promise<OverviewSnapshot | null> {
  const { data: c } = await admin
    .from('customers')
    .select('id, company_name, contact_person, billing_street, billing_postal_code, billing_city, billing_country, vat_number')
    .eq('id', customerId)
    .maybeSingle()
  if (!c) return null

  const cust = c as Record<string, string | null>
  const lang = resolveLang(cust.billing_country)
  const undef = (v: string | null | undefined) => (v ?? undefined) || undefined

  const totalCents = lines.reduce((s, l) => s + Number(l.amount_cents ?? 0), 0)
  const overdue = lines.filter(l => Number(l.days_overdue ?? 0) > 0)
  const overdueCents = overdue.reduce((s, l) => s + Number(l.amount_cents ?? 0), 0)

  return {
    lang,
    period,
    // The balance is taken NOW, not at the period start — the statement goes out
    // on the 1st and reports what is open on the 1st.
    asAtDate: amsterdamYmd(),
    company: {
      name: (settings.company_name as string) ?? '',
      address: undef(settings.company_address as string),
      postalCode: undef(settings.company_postal_code as string),
      city: undef(settings.company_city as string),
      country: undef(settings.company_country as string),
      phone: undef(settings.company_phone as string),
      email: undef(settings.company_email as string),
      website: undef(settings.company_website as string),
      logoUrl: undef(settings.company_logo_url as string),
      vatNumber: undef(settings.company_vat_number as string),
      kvkNumber: undef(settings.company_kvk_number as string),
      iban: undef(settings.bank_iban as string),
      accountHolder: undef(settings.bank_account_holder as string),
    },
    // Explicit whitelist, never a spread — an internal column must not be able
    // to reach a customer-facing snapshot.
    customer: {
      id: cust.id as string,
      companyName: (cust.company_name as string) || 'Onbekende klant',
      contactPerson: undef(cust.contact_person),
      street: undef(cust.billing_street),
      postalCode: undef(cust.billing_postal_code),
      city: undef(cust.billing_city),
      country: undef(cust.billing_country),
      vatNumber: undef(cust.vat_number),
    },
    lines,
    totalCents,
    overdueCents,
    overdueCount: overdue.length,
  }
}

/** Today in Amsterdam as YYYY-MM-DD (never toISOString — that is UTC). */
function amsterdamYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/** Monthly Betaaloverzicht, rendered from payment_overviews.snapshot. */
function fetchOverviewPdf(overviewId: string) {
  return fetchRenderedPdf(
    { type: 'payment_overview', overviewId },
    `Betaaloverzicht-${overviewId}.pdf`,
  )
}

/** Klantactiviteit digest, rendered from customer_inactivity_digests.snapshot.
 *  Returns null when no renderer is configured (Gurbet), and Step 8 sends the
 *  mail anyway — the body is the report, the PDF is the readable copy. */
function fetchActivityPdf(digestId: string) {
  return fetchRenderedPdf(
    { type: 'customer_activity', digestId },
    `Klantactiviteit-${digestId}.pdf`,
  )
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
  const company = (s.company_name || '').trim() || 'Gurbet Doner'

  // Height-first, capped on both axes so a SQUARE logo does not render as a
  // 150x142 tile in the header band. `height` attribute = Outlook desktop (it
  // ignores max-*); never add a `width` attribute beside it. Kept identical to
  // src/utils/emailHtml.ts — that one documents the reasoning in full.
  const header = s.company_logo_url
    ? `<img src="${escapeHtml(s.company_logo_url)}" alt="${escapeHtml(company)}" height="70" style="display:block;height:auto;max-height:70px;width:auto;max-width:150px;border:0;outline:none;text-decoration:none;" />`
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

// Date (YYYY-MM-DD) offset by `days` from today, for comparing against DATE
// columns like order_date. Negative = past (e.g. -1 = yesterday).
function dateOffsetISO(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0]
}

/** Is `days` from now a day the cron would send on? Weekday read in Amsterdam. */
function isSendDay(days: number): boolean {
  const wd = new Date(Date.now() + days * 86400000)
    .toLocaleDateString('en-US', { timeZone: 'Europe/Amsterdam', weekday: 'short' })
  return wd !== 'Sat' && wd !== 'Sun'
}

/**
 * Floor of the initial-invoice send window: the date `attempts` SEND days back.
 *
 * 🚨 Counting CALENDAR days here is what silently loses Thursday and Friday
 * orders. With working_days_only on, the cron sends Mon-Fri only, so a calendar
 * floor of 3 buys an order dated Friday exactly ONE attempt: Saturday and
 * Sunday are skipped and by Tuesday it has already dropped out of the window.
 * One bad morning then loses that invoice for good, and because Step 6 skips
 * WITHOUT writing a document_sends row, there is nothing left to notice. That
 * is precisely how FC-08734 and FC-08739 were never emailed (2026-08-10, the
 * morning the PDF renderer was down).
 *
 * Walking back over send days makes "3" mean three real attempts on every day
 * of the week. Reach is bounded at 5 calendar days: the widest case is a Monday
 * run, which stops at the previous Wednesday.
 *
 * Widening a window is the one change here that can produce EXTRA mail, so note
 * what stops it: the dedup above skips any order that already has an invoice
 * `document_sends` row in a status other than pending/failed. Orders in the
 * newly reachable band that were sent normally are therefore untouched; only a
 * genuinely never-sent invoice is picked up, which is the whole point.
 */
function sendWindowFloorISO(attempts: number, workingDaysOnly: boolean): string {
  if (!workingDaysOnly) return dateOffsetISO(-attempts)
  let counted = 0
  let offset = 0
  // Bounded walk. If it ever fails to find enough send days it stops early,
  // which NARROWS the window — the safe direction for a mail-sending loop.
  while (counted < attempts && offset < attempts + 5) {
    offset++
    if (isSendDay(-offset)) counted++
  }
  return dateOffsetISO(-offset)
}

function daysBetween(dueISO: string): number {
  const due = new Date(dueISO + 'T00:00:00Z').getTime()
  const now = new Date(todayISO() + 'T00:00:00Z').getTime()
  return Math.floor((now - due) / 86400000)
}

function daysSinceTs(tsISO: string): number {
  return Math.floor((Date.now() - new Date(tsISO).getTime()) / 86400000)
}

function amsterdamParts(): { hour: number; weekday: number; day: number; month: number; year: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    hour: 'numeric', hour12: false, weekday: 'short',
    day: 'numeric', month: 'numeric', year: 'numeric',
  })
  const parts = fmt.formatToParts(new Date())
  const num = (type: string, fallback = 0) =>
    Number(parts.find(p => p.type === type)?.value ?? String(fallback))
  const hour = num('hour') % 24
  const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const weekday = wkMap[parts.find(p => p.type === 'weekday')?.value ?? 'Sun'] ?? 0
  return { hour, weekday, day: num('day', 1), month: num('month', 1), year: num('year', 1970) }
}

/**
 * Is TODAY the first working day of the month, in Amsterdam?
 *
 * The statement is due "on the 1st", but with working_days_only the 1st can be
 * a Saturday or Sunday — and skipping it would silently drop a whole month.
 * So the send rolls forward: the 1st when it is a weekday, else the following
 * Monday (2nd if the 1st was a Sunday, 3rd if it was a Saturday).
 *
 * With working_days_only off this is simply "the 1st", which is why the weekend
 * arithmetic is guarded on the flag rather than assumed.
 */
function isFirstWorkingDayOfMonth(
  p: { day: number; weekday: number },
  workingDaysOnly: boolean,
): boolean {
  if (!workingDaysOnly) return p.day === 1
  if (p.weekday === 0 || p.weekday === 6) return false // never on a weekend
  if (p.day === 1) return true
  // Monday the 2nd  -> the 1st was a Sunday.
  // Monday the 3rd  -> the 1st was a Saturday.
  return p.weekday === 1 && (p.day === 2 || p.day === 3)
}

/** First day of the current Amsterdam month as YYYY-MM-DD (the statement period). */
function currentPeriod(p: { year: number; month: number }): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}-01`
}

/** 'juli 2026' / 'July 2026' for the {{period}} placeholder. */
function formatPeriodLabel(period: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nl-NL', {
    month: 'long', year: 'numeric',
  }).format(new Date(period + 'T00:00:00Z'))
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
