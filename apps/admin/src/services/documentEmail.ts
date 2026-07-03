import { supabase } from './supabase'
import type {
  DocumentSend,
  EmailDocumentType,
  EmailLang,
  EmailTemplate,
  EmailTemplateKey,
  EmailTemplateMap,
  LocalizedEmailTemplates,
} from '../types'

// ===========================================================================
// Defaults — used when document_settings.email_templates is empty for a type.
// Dutch for NL/BE customers, English for everyone else (chosen by country; see
// utils/documentLang.ts). The PDFs localize the same way (documentLabels.ts).
// ===========================================================================

const DEFAULT_TEMPLATES_NL: Record<EmailTemplateKey, EmailTemplate> = {
  invoice: {
    subject: 'Factuur {{document_number}} van {{company_name}}',
    body: 'Beste {{customer_name}},\n\nIn de bijlage vindt u factuur {{document_number}} ter waarde van {{total}}.\n\nGelieve te voldoen voor {{due_date}}.\n\nMet vriendelijke groet,\n{{company_name}}',
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
    body: 'Beste {{customer_name}},\n\nWij willen u vriendelijk herinneren aan de openstaande factuur {{document_number}} ter waarde van {{total}}, met vervaldatum {{due_date}}.\n\nMet vriendelijke groet,\n{{company_name}}',
  },
  // Escalation steps for the client overdue-reminder system (tone increases).
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

const DEFAULT_TEMPLATES_EN: Record<EmailTemplateKey, EmailTemplate> = {
  invoice: {
    subject: 'Invoice {{document_number}} from {{company_name}}',
    body: 'Dear {{customer_name}},\n\nPlease find attached invoice {{document_number}} for {{total}}.\n\nKindly settle before {{due_date}}.\n\nKind regards,\n{{company_name}}',
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
    body: 'Dear {{customer_name}},\n\nThis is a friendly reminder of the outstanding invoice {{document_number}} for {{total}}, due on {{due_date}}.\n\nKind regards,\n{{company_name}}',
  },
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
]

// Extra placeholders available specifically to client overdue-reminder steps.
export const REMINDER_PLACEHOLDER_KEYS: Array<keyof TemplateContext> = [
  ...PLACEHOLDER_KEYS,
  'days_overdue',
  'iban',
  'portal_link',
]

// ===========================================================================
// document_sends queries
// ===========================================================================

export async function fetchDocumentSends(opts: {
  orderId?: string
  status?: 'pending' | 'sent' | 'failed' | 'bounced'
  limit?: number
} = {}): Promise<DocumentSend[]> {
  let q = supabase
    .from('document_sends')
    .select('*')
    .order('created_at', { ascending: false })
  if (opts.orderId) q = q.eq('order_id', opts.orderId)
  if (opts.status)  q = q.eq('status', opts.status)
  if (opts.limit)   q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data as DocumentSend[]) ?? []
}

/**
 * Per-order send counts — used by the envelope-icon indicator on the Orders
 * list page. Scoped to the given order IDs (the current page, ~50) so it stays
 * a bounded query instead of scanning the whole document_sends table.
 */
export async function fetchSendCountsByOrder(orderIds: string[]): Promise<Record<string, { total: number; sent: number; failed: number }>> {
  if (orderIds.length === 0) return {}
  const { data, error } = await supabase
    .from('document_sends')
    .select('order_id, status')
    .in('order_id', orderIds)
  if (error) throw error

  const out: Record<string, { total: number; sent: number; failed: number }> = {}
  for (const row of (data as { order_id: string | null; status: string }[]) ?? []) {
    if (!row.order_id) continue
    const bucket = out[row.order_id] ??= { total: 0, sent: 0, failed: 0 }
    bucket.total += 1
    if (row.status === 'sent')   bucket.sent   += 1
    if (row.status === 'failed') bucket.failed += 1
  }
  return out
}

// ===========================================================================
// Edge function caller
// ===========================================================================

export interface SendDocumentEmailInput {
  orderId: string
  documentId: string | null
  documentType: EmailDocumentType
  recipientEmail: string
  bccEmail?: string | null
  subject: string
  body: string
  pdfBase64: string
  pdfFilename: string
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
