import { supabase } from './supabase'
import type {
  DocumentSend,
  DocumentSendStatus,
  EmailDocumentType,
  EmailLang,
  EmailTemplate,
  EmailTemplateKey,
  EmailTemplateMap,
  LocalizedEmailTemplates,
  PaymentOverviewKey,
} from '../types'
import { FAILED_SEND_STATUSES, isSuccessfulSend } from '../types'
import { sanitizeOrTerm } from '../utils/pgSearch'

// ===========================================================================
// Defaults — used when document_settings.email_templates is empty for a type.
// Dutch for NL/BE customers, English for everyone else (chosen by country; see
// utils/documentLang.ts). The PDFs localize the same way (documentLabels.ts).
// ===========================================================================

const DEFAULT_TEMPLATES_NL: Record<EmailTemplateKey, EmailTemplate> = {
  invoice: {
    subject: 'Factuur {{document_number}} van {{company_name}}',
    body: 'Beste {{customer_name}},\n\nBijgaand ontvangt u factuur {{document_number}} ter waarde van {{total}} met vervaldatum {{due_date}}. Wij verzoeken u vriendelijk het bedrag over te maken op IBAN {{iban}}.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u dit betalingsverzoek als niet verzonden beschouwen. De bijgevoegde factuur blijft uiteraard van belang voor uw administratie.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  proforma: {
    subject: 'Proforma {{document_number}}',
    body: 'Beste {{customer_name}},\n\nIn de bijlage vindt u proforma {{document_number}} ter waarde van {{total}}.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  credit_note: {
    subject: 'Creditnota {{document_number}}',
    body: 'Beste {{customer_name}},\n\nIn de bijlage vindt u creditnota {{document_number}}.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  packing_slip: {
    subject: 'Pakbon {{document_number}}',
    body: 'Beste {{customer_name}},\n\nIn de bijlage vindt u de pakbon voor bestelling {{order_number}}.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  order_confirmation: {
    subject: 'Orderbevestiging {{document_number}}',
    body: 'Beste {{customer_name}},\n\nBedankt voor uw bestelling. In de bijlage vindt u orderbevestiging {{document_number}}.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_reminder: {
    subject: 'Betalingsherinnering {{document_number}}',
    body: 'Beste {{customer_name}},\n\nWij willen u vriendelijk herinneren aan de openstaande factuur {{document_number}} ter waarde van {{total}}, met vervaldatum {{due_date}}.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u deze herinnering als niet verzonden beschouwen.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  // Escalation steps for the client overdue-reminder system (tone increases).
  payment_reminder_1: {
    subject: 'Herinnering: factuur {{document_number}} openstaand',
    body: 'Beste {{customer_name}},\n\nMogelijk is het aan uw aandacht ontsnapt: factuur {{document_number}} ter waarde van {{total}} had vervaldatum {{due_date}} en staat nog open. Wij verzoeken u vriendelijk het bedrag over te maken op IBAN {{iban}}. U kunt de factuur bekijken via {{portal_link}}.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u deze herinnering als niet verzonden beschouwen.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_reminder_2: {
    subject: 'Tweede herinnering: factuur {{document_number}}',
    body: 'Beste {{customer_name}},\n\nOndanks onze eerdere herinnering staat factuur {{document_number}} ({{total}}) nog steeds open. De factuur is inmiddels {{days_overdue}} dagen over de vervaldatum ({{due_date}}). Wij verzoeken u dringend het openstaande bedrag per omgaande te voldoen op IBAN {{iban}}.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u deze herinnering als niet verzonden beschouwen.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  payment_reminder_final: {
    subject: 'Laatste aanmaning: factuur {{document_number}}',
    body: 'Beste {{customer_name}},\n\nDit is onze laatste aanmaning voor factuur {{document_number}} ten bedrage van {{total}}, die nu {{days_overdue}} dagen achterstallig is. Wij verzoeken u het bedrag binnen 7 dagen te voldoen op IBAN {{iban}} om verdere (incasso)kosten te voorkomen.\n\nHeeft u deze factuur inmiddels betaald? Dan kunt u deze aanmaning als niet verzonden beschouwen.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  // Monthly statement of account. NOT a dunning letter — it also goes to
  // customers who are entirely within their payment term, so the tone stays
  // neutral and it never threatens costs.
  payment_overview: {
    subject: 'Betaaloverzicht {{period}} van {{company_name}}',
    body: 'Beste {{customer_name}},\n\nIn de bijlage vindt u uw betaaloverzicht: alle facturen die volgens onze administratie nog openstaan. Het gaat om {{invoice_count}} factuur/facturen met een totaalbedrag van {{total}}.\n\nWij verzoeken u vriendelijk het openstaande bedrag over te maken op IBAN {{iban}}, onder vermelding van het factuurnummer. Uw facturen kunt u ook bekijken via {{portal_link}}.\n\nHeeft u een of meer van deze facturen inmiddels betaald? Dan kunt u die regels als voldaan beschouwen. Betalingen van de afgelopen dagen zijn mogelijk nog niet verwerkt.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
}

const DEFAULT_TEMPLATES_EN: Record<EmailTemplateKey, EmailTemplate> = {
  invoice: {
    subject: 'Invoice {{document_number}} from {{company_name}}',
    body: 'Dear {{customer_name}},\n\nPlease find attached invoice {{document_number}} for {{total}}, due on {{due_date}}. We kindly ask you to transfer the amount to IBAN {{iban}}.\n\nHave you already paid this invoice? If so, you can disregard this payment request. The attached invoice remains relevant for your records.\n\nKind regards,\n{{company_name}}',
  },
  proforma: {
    subject: 'Quotation {{document_number}}',
    body: 'Dear {{customer_name}},\n\nPlease find attached quotation {{document_number}} for {{total}}.\n\nKind regards,\n{{company_name}}',
  },
  credit_note: {
    subject: 'Credit note {{document_number}}',
    body: 'Dear {{customer_name}},\n\nPlease find attached credit note {{document_number}}.\n\nKind regards,\n{{company_name}}',
  },
  packing_slip: {
    subject: 'Packing slip {{document_number}}',
    body: 'Dear {{customer_name}},\n\nPlease find attached the packing slip for order {{order_number}}.\n\nKind regards,\n{{company_name}}',
  },
  order_confirmation: {
    subject: 'Order confirmation {{document_number}}',
    body: 'Dear {{customer_name}},\n\nThank you for your order. Please find attached order confirmation {{document_number}}.\n\nKind regards,\n{{company_name}}',
  },
  payment_reminder: {
    subject: 'Payment reminder {{document_number}}',
    body: 'Dear {{customer_name}},\n\nThis is a friendly reminder of the outstanding invoice {{document_number}} for {{total}}, due on {{due_date}}.\n\nHave you already paid this invoice? If so, please disregard this reminder.\n\nKind regards,\n{{company_name}}',
  },
  payment_reminder_1: {
    subject: 'Reminder: invoice {{document_number}} outstanding',
    body: 'Dear {{customer_name}},\n\nThis may have escaped your attention: invoice {{document_number}} for {{total}} was due on {{due_date}} and is still outstanding. We kindly ask you to transfer the amount to IBAN {{iban}}. You can view the invoice at {{portal_link}}.\n\nHave you already paid this invoice? If so, please disregard this reminder.\n\nKind regards,\n{{company_name}}',
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

const DEFAULTS_BY_LANG: Record<EmailLang, Record<EmailTemplateKey, EmailTemplate>> = {
  nl: DEFAULT_TEMPLATES_NL,
  en: DEFAULT_TEMPLATES_EN,
}

/**
 * Accept either the new language-nested shape `{ nl, en }` or a legacy flat
 * `EmailTemplateMap` (pre-00077) and always return the nested shape. A flat map
 * is treated as the Dutch bucket.
 */
export function normalizeEmailTemplates(
  raw: LocalizedEmailTemplates | EmailTemplateMap | null | undefined
): LocalizedEmailTemplates {
  const r = (raw ?? {}) as Record<string, unknown>
  const looksNested = 'nl' in r || 'en' in r
  if (looksNested) {
    return {
      nl: (r.nl as EmailTemplateMap) ?? {},
      en: (r.en as EmailTemplateMap) ?? {},
    }
  }
  return { nl: (raw as EmailTemplateMap) ?? {}, en: {} }
}

export function getDefaultTemplate(type: EmailTemplateKey, lang: EmailLang = 'nl'): EmailTemplate {
  return { ...DEFAULTS_BY_LANG[lang][type] }
}

/**
 * Resolve a per-type template from the saved map for the given language,
 * falling back to that language's defaults. Accepts nested or legacy-flat maps.
 */
export function getTemplate(
  map: LocalizedEmailTemplates | EmailTemplateMap | null | undefined,
  type: EmailTemplateKey,
  lang: EmailLang = 'nl'
): EmailTemplate {
  const langMap = normalizeEmailTemplates(map)[lang]
  const saved = langMap?.[type]
  const def = DEFAULTS_BY_LANG[lang][type]
  if (saved?.subject || saved?.body) {
    return {
      subject: saved.subject || def.subject,
      body:    saved.body    || def.body,
    }
  }
  return { ...def }
}

// ===========================================================================
// {{placeholder}} substitution
// ===========================================================================

export interface TemplateContext {
  company_name?: string
  customer_name?: string
  document_number?: string
  order_number?: string
  total?: string         // already-formatted (e.g. '€1.234,56')
  due_date?: string      // already-formatted
  days_overdue?: string  // overdue-reminder context
  iban?: string
  portal_link?: string
  period?: string        // statement context: 'juli 2026' / 'July 2026'
  invoice_count?: string // statement context: number of outstanding invoices
}

/** Replace every {{key}} occurrence with the matching context value (or '' if missing). */
export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const v = (ctx as Record<string, string | undefined>)[key]
    return v ?? ''
  })
}

export const PLACEHOLDER_KEYS: Array<keyof TemplateContext> = [
  'company_name',
  'customer_name',
  'document_number',
  'order_number',
  'total',
  'due_date',
  // Resolved from document_settings.bank_iban at send time (SendDocumentModal
  // merges it into the context). The default invoice template uses it, so it
  // must be offered as a placeholder chip in Settings → Email too.
  'iban',
]

// Extra placeholders available specifically to client overdue-reminder steps.
export const REMINDER_PLACEHOLDER_KEYS: Array<keyof TemplateContext> = [
  ...PLACEHOLDER_KEYS,
  'days_overdue',
  'iban',
  'portal_link',
]

// The monthly statement is per-CUSTOMER, not per-document, so document_number /
// order_number / due_date have no meaning there and are deliberately omitted.
export const OVERVIEW_PLACEHOLDER_KEYS: Array<keyof TemplateContext> = [
  'company_name',
  'customer_name',
  'period',
  'invoice_count',
  'total',
  'iban',
  'portal_link',
]

// ===========================================================================
// document_sends queries
// ===========================================================================

export async function fetchDocumentSends(opts: {
  orderId?: string
  status?: DocumentSendStatus
  /** Convenience filter: all delivery-failure statuses at once. */
  failedOnly?: boolean
  limit?: number
} = {}): Promise<DocumentSend[]> {
  let q = supabase
    .from('document_sends')
    .select('*')
    .order('created_at', { ascending: false })
  if (opts.orderId)    q = q.eq('order_id', opts.orderId)
  if (opts.status)     q = q.eq('status', opts.status)
  if (opts.failedOnly) q = q.in('status', FAILED_SEND_STATUSES)
  if (opts.limit)      q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data as DocumentSend[]) ?? []
}

/**
 * Count of emails that failed to reach the customer (bounced / complained /
 * suppressed / hard-failed) within the last `days`. Drives the Dashboard
 * delivery-problem alert. Cheap head-count query.
 */
export async function fetchFailedSendSummary(days = 30): Promise<{ count: number; latest: string | null }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error, count } = await supabase
    .from('document_sends')
    .select('created_at', { count: 'exact' })
    .in('status', FAILED_SEND_STATUSES)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return { count: count ?? 0, latest: (data?.[0]?.created_at as string | undefined) ?? null }
}

/**
 * Ask the sync-email-status edge function to refresh delivery outcomes from
 * Resend on demand (the cron does this every 15 min automatically). A wide
 * `days` also backfills historical rows. Returns the function's summary.
 */
export async function syncEmailStatus(days = 120): Promise<{ checked: number; updated: number; readKeyRestricted: boolean }> {
  const { data, error } = await supabase.functions.invoke('sync-email-status', {
    body: { days },
  })
  if (error) throw error
  return {
    checked: data?.checked ?? 0,
    updated: data?.updated ?? 0,
    readKeyRestricted: !!data?.readKeyRestricted,
  }
}

/**
 * Server-side paged + searched Outbox query. Search (recipient / subject /
 * error) and the status filter run in the DB across the WHOLE table, so a match
 * on page 30 still surfaces — the page size never limits what search can find.
 */
export async function fetchDocumentSendsPaged(opts: {
  status?: DocumentSendStatus
  failedOnly?: boolean
  search?: string
  /**
   * Scope to one order. Used by the Orders row indicators, which link to
   * /outbox?order=<id>. NOTE this cannot be done through `search`:
   * document_sends has no order-number column, and the search clause only
   * covers recipient_email / subject / error_message.
   */
  orderId?: string
  documentType?: EmailDocumentType
  page?: number
  pageSize?: number
} = {}): Promise<{ rows: DocumentSend[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? 50
  const from = (page - 1) * pageSize

  let q = supabase
    .from('document_sends')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (opts.status)       q = q.eq('status', opts.status)
  if (opts.failedOnly)   q = q.in('status', FAILED_SEND_STATUSES)
  // idx_document_sends_order already covers this (migration 00048).
  if (opts.orderId)      q = q.eq('order_id', opts.orderId)
  if (opts.documentType) q = q.eq('document_type', opts.documentType)

  const term = sanitizeOrTerm(opts.search ?? '')
  if (term) {
    q = q.or(`recipient_email.ilike.%${term}%,subject.ilike.%${term}%,error_message.ilike.%${term}%`)
  }

  const { data, error, count } = await q.range(from, from + pageSize - 1)
  if (error) throw error
  return { rows: (data as DocumentSend[]) ?? [], total: count ?? 0 }
}

/**
 * Per-order send counts — used by the envelope-icon indicator on the Orders
 * list page. Scoped to the given order IDs (the current page, ~50) so it stays
 * a bounded query instead of scanning the whole document_sends table.
 */
export interface OrderSendInfo {
  total: number
  sent: number
  failed: number
  /** True once the INVOICE specifically has been emailed (status 'sent'). */
  invoiceSent: boolean
}

export async function fetchSendCountsByOrder(orderIds: string[]): Promise<Record<string, OrderSendInfo>> {
  if (orderIds.length === 0) return {}
  const { data, error } = await supabase
    .from('document_sends')
    .select('order_id, status, document_type')
    .in('order_id', orderIds)
  if (error) throw error

  const out: Record<string, OrderSendInfo> = {}
  const failed = new Set<string>(FAILED_SEND_STATUSES)
  // 'sent' (accepted, awaiting confirmation) and 'delivered' both count as a
  // successful send; the delivery-failure statuses do not. Shared helper — do
  // not re-inline a `=== 'sent'` test (see isSuccessfulSend).
  const ok = isSuccessfulSend
  for (const row of (data as { order_id: string | null; status: string; document_type: string }[]) ?? []) {
    if (!row.order_id) continue
    const bucket = out[row.order_id] ??= { total: 0, sent: 0, failed: 0, invoiceSent: false }
    bucket.total += 1
    if (ok(row.status))          bucket.sent   += 1
    if (failed.has(row.status))  bucket.failed += 1
    if (row.document_type === 'invoice' && ok(row.status)) bucket.invoiceSent = true
  }
  return out
}

// ===========================================================================
// Edge function caller
// ===========================================================================

export interface SendDocumentEmailInput {
  /**
   * Null ONLY for a 'payment_overview', which spans many orders and therefore
   * belongs to none. Every other document type must supply it.
   */
  orderId: string | null
  documentId: string | null
  documentType: EmailDocumentType | PaymentOverviewKey
  recipientEmail: string
  bccEmail?: string | null
  subject: string
  body: string
  pdfBase64: string
  pdfFilename: string
  /**
   * Statement only: the `payment_overviews` row this mail belongs to. The edge
   * function writes `document_send_id` back onto it after a successful send, so
   * the /overdue tab can show when it went out and re-render exactly what was
   * sent from the frozen snapshot.
   */
  paymentOverviewId?: string | null
}

export interface SendDocumentEmailResult {
  ok: boolean
  sendId?: string
  resendMessageId?: string | null
  error?: string
}

/**
 * Call the send-document-email edge function. Returns ok=false with a
 * surface-able error string when anything goes wrong, instead of throwing,
 * so the Send modal can show it in its error banner without a try/catch.
 */
export async function sendDocumentEmail(input: SendDocumentEmailInput): Promise<SendDocumentEmailResult> {
  const { data, error } = await supabase.functions.invoke('send-document-email', {
    body: {
      order_id:        input.orderId,
      document_id:     input.documentId,
      document_type:   input.documentType,
      recipient_email: input.recipientEmail,
      bcc_email:       input.bccEmail ?? null,
      subject:         input.subject,
      body:            input.body,
      pdf_base64:      input.pdfBase64,
      pdf_filename:    input.pdfFilename,
      payment_overview_id: input.paymentOverviewId ?? null,
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  const body = (data ?? {}) as { error?: string; send_id?: string; resend_message_id?: string | null }
  if (body.error) {
    return { ok: false, sendId: body.send_id, error: body.error }
  }
  return { ok: true, sendId: body.send_id, resendMessageId: body.resend_message_id ?? null }
}
