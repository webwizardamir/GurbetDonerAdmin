import { supabase } from './supabase'
import {
  buildDocumentTemplateContext,
  getTemplate,
  renderTemplate,
  sendDocumentEmail,
  fetchSendCountsByOrder,
} from './documentEmail'
import {
  fetchDocumentSettings,
  rebuildDocumentData,
  type DocumentListRow,
  type InvoiceData,
} from './documents'
import type { DocumentSettings, DocumentType } from '../types'
import { blobToBase64 } from '../utils/blobToBase64'

/**
 * Bulk-emailing invoices from the Invoices list.
 *
 * Deliberately JSX-free — PDF rendering is injected as `renderPdf`, the same
 * split `services/batchInvoices.ts` uses. Everything here is plain app code:
 * no migration, no edge function, no new secret, so it reaches both tenants on
 * a push with nothing to apply by hand.
 *
 * THE RULES THAT MATTER (each one has cost us before, see CLAUDE.md):
 *
 *  - Never test `document_sends.status === 'sent'`. That value is transient —
 *    `sync-email-status` rewrites it to the real Resend outcome within ~15 min,
 *    so an equality test reports every historic email as never-sent. That is
 *    exactly how ~55 duplicate invoice emails shipped in July 2026. The
 *    already-sent warning goes through `fetchSendCountsByOrder`, which is built
 *    on `isSuccessfulSend`.
 *  - The AbortSignal is checked ONLY between items and is NEVER handed to the
 *    edge-function call. See `sendInvoiceEmailsSequential`.
 *  - Only a confirmed 429 is retried. Anything ambiguous is reported, never
 *    retried.
 */

// ===========================================================================
// Pre-flight
// ===========================================================================

export type BulkBlockReason =
  | 'not_invoice'
  | 'no_order'
  | 'order_unavailable'
  | 'order_trashed'
  | 'order_not_billable'
  | 'no_customer'
  | 'no_email'
  | 'invalid_email'
  | 'document_missing'

/**
 * An invoice for one of these is not a payment request, so it is never mailed:
 * a Concept is unfinalised (it can still carry an issued invoice — which is
 * exactly why migration 00094 had to hide drafts from the customer portal), and
 * cancelled/refunded orders are not owed. Mirrors NON_ROUTABLE_STATUSES in
 * services/route.ts and DayCloseModal's filter. `completed` (= paid) stays
 * sendable on purpose: a customer asking for a copy of a paid invoice is a
 * normal request.
 */
const NON_BILLABLE_STATUSES = new Set(['draft', 'cancelled', 'refunded'])

export interface BulkEmailTarget {
  /** documents.id — the selection key everywhere in this feature. */
  id: string
  orderId: string | null
  documentNumber: string
  customerName: string
  recipientEmail: string | null
  /** Empty ⇒ sendable. */
  blockedBy: BulkBlockReason[]
  /** Warning, not a block: the admin may deliberately re-send. */
  alreadySent: boolean
  /** Pre-ticked state in the confirm list: false when blocked OR already sent. */
  defaultSelected: boolean
}

export interface BulkEmailPreflight {
  targets: BulkEmailTarget[]
  settings: DocumentSettings | null
  bccEmail: string | null
  iban: string
  /**
   * Batch-level, not per-target: the default NL invoice body says "…over te
   * maken op IBAN {{iban}}", and renderTemplate substitutes '' for a missing
   * value — so an unset document_settings.bank_iban mails "op IBAN ." to every
   * recipient at once. The confirm phase warns before that can happen.
   */
  missingIban: boolean
  counts: { total: number; sendable: number; blocked: number; alreadySent: number }
}

/** The edge function's own validation regex — reject locally rather than
 *  400 mid-run AND leave a useless pending→failed row in the Outbox. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * `.in()` chunk size. Kept well below the 500 used for id-only queries: this
 * query also carries a two-level embed in the select, and 500 UUIDs alone is
 * already ~18 KB of query string — enough to 414 at a gateway and take the
 * whole confirm dialog down with it.
 */
const IN_CHUNK = 200

interface JoinedCustomer { id: string; email: string | null; company_name: string | null }
interface JoinedOrder {
  id: string
  status: string | null
  deleted_at: string | null
  customer_id: string | null
  customer: JoinedCustomer | JoinedCustomer[] | null
}
interface DocJoinRow {
  id: string
  order_id: string | null
  document_type: string
  document_number: string
  order: JoinedOrder | JoinedOrder[] | null
}

/** A to-one embed comes back as an object, but PostgREST hands back an array
 *  whenever it reads the relationship as to-many. Normalise rather than bet. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

/**
 * Resolve what can actually be sent, in three round-trips regardless of how many
 * rows were ticked.
 *
 * The document/order/customer read is re-done LIVE rather than trusting the
 * ticked row, for two reasons. It re-evaluates RLS, so a row that has since been
 * deleted — or that belongs to a hidden order the caller may not read — is
 * reported instead of silently mailed from a stale snapshot. And the recipient
 * must come from the live `orders.customer_id → customers.email`, never from
 * `snapshot.customer.id`: the PDF is rebuilt from the live order, so if the
 * order was re-assigned since the invoice was issued, a snapshot-derived address
 * would mail customer B's invoice to customer A. Recipient and PDF share one
 * source of truth or they are not a pair.
 */
export async function resolveBulkEmailTargets(docs: DocumentListRow[]): Promise<BulkEmailPreflight> {
  const ids = docs.map(d => d.id)

  const joined = new Map<string, DocJoinRow>()
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await supabase
      .from('documents')
      .select(
        'id, order_id, document_type, document_number, order:orders!order_id(id, status, deleted_at, customer_id, customer:customers!customer_id(id, email, company_name))',
      )
      .in('id', ids.slice(i, i + IN_CHUNK))
    if (error) throw error
    for (const row of (data as unknown as DocJoinRow[]) ?? []) joined.set(row.id, row)
  }

  const orderIds = [...new Set(
    [...joined.values()].map(r => r.order_id).filter((v): v is string => !!v),
  )]

  // Per-ORDER, per-type='invoice', via isSuccessfulSend. Known and accepted
  // over-warn: an order carrying two invoice documents warns on both. It never
  // under-warns, which is the direction that matters.
  const sendInfo = orderIds.length ? await fetchSendCountsByOrder(orderIds) : {}

  const settings = await fetchDocumentSettings()

  const targets: BulkEmailTarget[] = docs.map(doc => {
    const row = joined.get(doc.id)
    const blockedBy: BulkBlockReason[] = []

    const order = one(row?.order)
    const customer = one(order?.customer)
    const email = (customer?.email ?? '').trim()

    if (!row) {
      blockedBy.push('document_missing')
    } else {
      if (row.document_type !== 'invoice') blockedBy.push('not_invoice')
      if (!row.order_id) blockedBy.push('no_order')
      else if (!order) blockedBy.push('order_unavailable')
      // A trashed order has already had its stock restored and sits in the
      // Prullenbak — its invoice document still exists and still shows in this
      // list, so without this the customer gets a payment request for an order
      // that was thrown away.
      else if (order.deleted_at) blockedBy.push('order_trashed')
      else if (order.status && NON_BILLABLE_STATUSES.has(order.status)) blockedBy.push('order_not_billable')
      else if (!customer) blockedBy.push('no_customer')
      else if (!email) blockedBy.push('no_email')
      else if (!EMAIL_RE.test(email)) blockedBy.push('invalid_email')
    }

    const alreadySent = !!(row?.order_id && sendInfo[row.order_id]?.invoiceSent)

    return {
      id: doc.id,
      orderId: row?.order_id ?? doc.order_id ?? null,
      documentNumber: row?.document_number ?? doc.document_number,
      // Snapshot name is display-only fallback for a row we could not re-read.
      customerName: customer?.company_name ?? doc.customer_name ?? '',
      recipientEmail: email || null,
      blockedBy,
      alreadySent,
      defaultSelected: blockedBy.length === 0 && !alreadySent,
    }
  })

  const blocked = targets.filter(t => t.blockedBy.length > 0).length
  return {
    targets,
    settings,
    bccEmail: settings?.email_bcc ?? null,
    iban: settings?.bank_iban ?? '',
    missingIban: !(settings?.bank_iban ?? '').trim(),
    counts: {
      total: targets.length,
      sendable: targets.length - blocked,
      blocked,
      alreadySent: targets.filter(t => t.alreadySent).length,
    },
  }
}

// ===========================================================================
// Send loop
// ===========================================================================

export type BulkSendStatus = 'sent' | 'failed' | 'skipped' | 'cancelled'

export interface BulkSendItemResult {
  id: string
  documentNumber: string
  customerName: string
  recipientEmail: string | null
  status: BulkSendStatus
  /** document_sends.id — present ⇒ there IS an Outbox row to look at. */
  sendId?: string
  error?: string
  /**
   * The outcome is genuinely UNKNOWN (timeout / network drop). The mail may
   * already be out, so this is never retried and is surfaced separately.
   */
  ambiguous?: boolean
}

export interface BulkSendProgress {
  done: number
  total: number
  current: { id: string; documentNumber: string; customerName: string } | null
  sent: number
  failed: number
  skipped: number
  /** New array each tick so React re-renders. */
  results: BulkSendItemResult[]
}

export interface BulkSendSummary {
  results: BulkSendItemResult[]
  /** Attempted (sent + failed + skipped) — excludes cancelled, so the bar and
   *  counter stay honest about a run that stopped early. */
  done: number
  /** Everything handed to the loop, including what cancelling dropped. */
  total: number
  sent: number
  failed: number
  skipped: number
  cancelled: number
  ambiguous: number
  aborted: boolean
}

export interface SendInvoiceEmailsOptions {
  settings: DocumentSettings | null
  bccEmail: string | null
  iban: string
  /** Injected so this module never imports @react-pdf (utils/renderDocumentBlob). */
  renderPdf: (documentType: DocumentType, data: InvoiceData) => Promise<Blob>
  onProgress?: (p: BulkSendProgress) => void
  signal?: AbortSignal
  /** Minimum ms between the START of two consecutive sends. */
  minIntervalMs?: number
  requestTimeoutMs?: number
  /** Extra attempts, for a confirmed 429 ONLY. */
  rateLimitRetries?: number
}

/**
 * Resend's documented default is ~2 requests/second. 600 ms leaves headroom for
 * clock jitter and for the fact that the edge function's own Resend call happens
 * at an unpredictable offset inside our request. In practice each iteration
 * already costs longer than this (react-pdf render + auth + settings + insert +
 * Resend + update), so the pacer is usually a no-op — it exists for the fast
 * path, where several small invoices could otherwise fire inside one second.
 */
export const BULK_SEND_MIN_INTERVAL_MS = 600

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

/**
 * Retryable means EXACTLY ONE THING: the request was rejected with an HTTP 429
 * before any mail was handed over, so re-sending cannot duplicate.
 *
 * Deliberately NOT a text match on the error message. The edge function relays
 * a Resend failure as a **502** with Resend's text in the body, and that text
 * cannot distinguish "Resend refused the request" from "Resend accepted it and
 * we lost the answer" — the second is `ambiguous`, the mail is already out, and
 * retrying it mails the customer the same invoice twice. That is the July 2026
 * duplicate-invoice failure, re-created.
 */
function isRetryableRateLimit(res: { status?: number; ambiguous?: boolean }): boolean {
  return res.status === 429 && !res.ambiguous
}

/**
 * Mail one invoice per target, strictly sequentially. NEVER throws: every
 * per-item failure becomes a result row, so one bad order cannot abandon the
 * rest of the batch.
 *
 * Ordering inside an item is deliberate — render BEFORE send, so we never mail
 * a body promising an attachment we could not produce. The consequence is that
 * a render failure leaves NO `document_sends` row at all, which the summary has
 * to say out loud or the admin hunts the Outbox for something never attempted.
 */
export async function sendInvoiceEmailsSequential(
  targets: BulkEmailTarget[],
  opts: SendInvoiceEmailsOptions,
): Promise<BulkSendSummary> {
  const {
    settings, bccEmail, iban, renderPdf, onProgress, signal,
    requestTimeoutMs = 60_000,
    rateLimitRetries = 2,
  } = opts

  let minInterval = opts.minIntervalMs ?? BULK_SEND_MIN_INTERVAL_MS
  // Earliest wall-clock time the next send may START. A single gate rather than
  // "last start + interval" so the retry back-off actually composes: an item
  // that took 2.5s would otherwise make every later `wait` negative and the
  // doubled interval would never be applied.
  let nextAllowedAt = 0
  let aborted = false

  const results: BulkSendItemResult[] = []
  const tally = () => ({
    sent:    results.filter(r => r.status === 'sent').length,
    failed:  results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
  })

  // Cancelled rows are recorded (so the summary can say what was dropped) but
  // are NOT progress: counting them would snap the bar to 100% and the counter
  // to "20 van 20" the instant the user cancels after four.
  const doneCount = () => results.filter(r => r.status !== 'cancelled').length

  const emit = (current: BulkSendProgress['current']) => {
    if (!onProgress) return
    onProgress({
      done: doneCount(),
      total: targets.length,
      current,
      ...tally(),
      results: [...results],
    })
  }

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]

    // Cancellation is checked HERE and nowhere else. The signal is never passed
    // to the edge-function call: aborting an in-flight invoke does not stop the
    // function, which has already written a pending document_sends row and may
    // already have handed the mail to Resend. Aborting mid-flight would mail the
    // customer while the UI claims it cancelled.
    if (signal?.aborted) {
      aborted = true
      for (const rest of targets.slice(i)) {
        results.push({
          id: rest.id,
          documentNumber: rest.documentNumber,
          customerName: rest.customerName,
          recipientEmail: rest.recipientEmail,
          status: 'cancelled',
        })
      }
      emit(null)
      break
    }

    if (t.blockedBy.length > 0 || !t.recipientEmail) {
      results.push({
        id: t.id,
        documentNumber: t.documentNumber,
        customerName: t.customerName,
        recipientEmail: t.recipientEmail,
        status: 'skipped',
        error: t.blockedBy[0] ?? 'no_email',
      })
      emit(null)
      continue // costs no pacing — nothing was sent
    }

    emit({ id: t.id, documentNumber: t.documentNumber, customerName: t.customerName })

    try {
      // Rebuild LIVE, exactly like the page's Download, so the customer is
      // mailed the same PDF the admin can see. No frozen-snapshot fallback here
      // on purpose: a throw means the order is gone/hidden or settings are
      // unconfigured, and mailing a stale document in that state is worse than
      // reporting it.
      const data = await rebuildDocumentData({
        id: t.id,
        // Non-null in practice — pre-flight blocks a document with no order —
        // and rebuildDocumentData throws if it ever is.
        order_id: t.orderId ?? undefined,
        document_type: 'invoice',
        document_number: t.documentNumber,
      })

      // Scoped to this iteration so the blob and its ~1.33× base64 string fall
      // out of scope immediately — 200 retained invoices is tens of MB.
      const pdfBase64 = await blobToBase64(await renderPdf('invoice', data))

      const ctx = buildDocumentTemplateContext(data, { iban })
      const tmpl = getTemplate(settings?.email_templates, 'invoice', data.lang ?? 'nl')
      const subject = renderTemplate(tmpl.subject, ctx)
      const body = renderTemplate(tmpl.body, ctx)

      let attempt = 0
      let res: Awaited<ReturnType<typeof sendDocumentEmail>>
      for (;;) {
        const wait = nextAllowedAt - Date.now()
        if (wait > 0) await sleep(wait)
        nextAllowedAt = Date.now() + minInterval

        res = await sendDocumentEmail({
          orderId: t.orderId,
          documentId: t.id,
          documentType: 'invoice',
          recipientEmail: t.recipientEmail,
          bccEmail,
          subject,
          body,
          pdfBase64,
          pdfFilename: `${data.documentNumber || 'factuur'}.pdf`,
          timeoutMs: requestTimeoutMs,
        })

        // Retrying is safe ONLY for a confirmed rate-limit: Resend rejected the
        // request outright, so no mail went out and a retry cannot duplicate.
        // Anything else — a bad address, a timeout, a dropped connection — is
        // either hopeless or ambiguous, and re-sending it is how you mail a
        // customer the same invoice twice.
        if (res.ok || !isRetryableRateLimit(res) || attempt >= rateLimitRetries) break
        attempt++
        // One rate-limit means the assumption about this account's ceiling was
        // wrong for the WHOLE run, not just this item — slow the rest down too.
        minInterval = Math.min(minInterval * 2, 3000)
        nextAllowedAt = Date.now() + 1000 * attempt
      }

      results.push({
        id: t.id,
        documentNumber: t.documentNumber,
        customerName: t.customerName,
        recipientEmail: t.recipientEmail,
        status: res.ok ? 'sent' : 'failed',
        sendId: res.sendId,
        error: res.ok ? undefined : res.error,
        ambiguous: res.ok ? undefined : res.ambiguous,
      })
    } catch (e) {
      // Build/render failure — no document_sends row exists for this one.
      results.push({
        id: t.id,
        documentNumber: t.documentNumber,
        customerName: t.customerName,
        recipientEmail: t.recipientEmail,
        status: 'failed',
        error: (e as Error).message,
      })
    }

    emit(null)
  }

  return {
    results,
    ...tally(),
    done: doneCount(),
    total: targets.length,
    cancelled: results.filter(r => r.status === 'cancelled').length,
    ambiguous: results.filter(r => r.ambiguous).length,
    aborted,
  }
}
