import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Mail, ReceiptText } from 'lucide-react'
import type { OrderDocumentInfo } from '../../services/documents'

interface OrderRowIndicatorsProps {
  order: { id: string; order_number: string }
  docInfo?: OrderDocumentInfo
  /** Structural, not services/documentEmail's OrderSendInfo: OrdersTable has its
   *  own near-identical shape with invoiceSent optional. */
  sendInfo?: { sent: number; failed: number; total: number; invoiceSent?: boolean }
  /** Opens the order detail scrolled to its documents section. */
  onOpenDocuments: () => void
  /**
   * Legacy WooCommerce invoice number. Imported orders carry one without having
   * a `documents` row, so without this they'd show no document indicator at all
   * once the number was removed from the card header.
   */
  legacyInvoiceNumber?: string | number | null
  /**
   * 'icons' - compact icon buttons with a count badge, for desktop table rows.
   * 'chips' - labelled pills, for mobile cards. Native `title` never fires on
   *           touch, and once these navigate, "tap to reveal a tooltip" and
   *           "tap to go somewhere" would fight for the same gesture. A visible
   *           label sidesteps both.
   */
  variant?: 'icons' | 'chips'
}

/**
 * The document / email / invoice-sent indicators on an order row.
 *
 * Extracted because Orders.tsx and OrdersTable.tsx had drifted into two
 * divergent copies (the second still had hardcoded English titles).
 *
 * Counts render from 1, not from 2. The old `docInfo.count > 1` threshold meant
 * an order with exactly one document - i.e. almost every order, since the
 * invoice is auto-generated - showed no icon and no number at all, which is why
 * the badges looked like they had disappeared.
 */
export default function OrderRowIndicators({
  order,
  docInfo,
  sendInfo,
  onOpenDocuments,
  legacyInvoiceNumber,
  variant = 'icons',
}: OrderRowIndicatorsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const docCount = docInfo?.count ?? 0
  const legacyInvoice = docCount === 0 && legacyInvoiceNumber ? String(legacyInvoiceNumber) : null
  const total = sendInfo?.total ?? 0
  const failed = sendInfo?.failed ?? 0
  const sent = sendInfo?.sent ?? 0
  const allOk = failed === 0

  if (docCount === 0 && total === 0 && !sendInfo?.invoiceSent && !legacyInvoice) return null

  // The Outbox filters on order_id; orderNo is display-only, because
  // document_sends has no order-number column to search.
  const outbox = (type?: string) =>
    `/outbox?order=${order.id}&orderNo=${encodeURIComponent(order.order_number)}${type ? `&type=${type}` : ''}`

  const mailTitle = allOk
    ? t('orders.emailsSentTooltip', { sent, total })
    : t('orders.emailsFailedTooltip', { sent, total, failed })

  // Name the documents rather than counting them: "1 document(en)" said nothing
  // about WHICH one. Falls back to the count if the list isn't loaded.
  const docNames = legacyInvoice
    ? [`${t('documents.types.invoice')} ${legacyInvoice}`]
    : (docInfo?.docs ?? []).map(d => {
      const label = t(`documents.types.${d.type}`, { defaultValue: d.type })
      return d.number ? `${label} ${d.number}` : label
    })
  const docTitle = docNames.length
    ? `${docNames.join(' · ')}. ${t('orders.docsOpenHint')}`
    : t('orders.docsTooltip', { count: docCount })
  // Short form for the mobile chip: name the single document, else count them.
  const docChipLabel = docNames.length === 1
    ? docNames[0]
    : t('orders.indicators.docs', { count: docCount })

  if (variant === 'chips') {
    const chip = 'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors'
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {(docCount > 0 || legacyInvoice) && (
          <button type="button" onClick={onOpenDocuments} aria-label={docTitle} title={docTitle}
            className={`${chip} bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 max-w-full`}>
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{docChipLabel}</span>
          </button>
        )}
        {total > 0 && (
          <button type="button" onClick={() => navigate(outbox())} aria-label={mailTitle}
            className={`${chip} ${allOk
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
            <Mail className="w-3.5 h-3.5 shrink-0" />
            {allOk
              ? t('orders.indicators.emails', { sent, total })
              : t('orders.indicators.emailsFailed', { failed })}
          </button>
        )}
        {sendInfo?.invoiceSent && (
          <button type="button" onClick={() => navigate(outbox('invoice'))} aria-label={t('orders.invoiceEmailedTooltip')}
            className={`${chip} bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300`}>
            <ReceiptText className="w-3.5 h-3.5 shrink-0" />
            {t('orders.indicators.invoiceSent')}
          </button>
        )}
      </div>
    )
  }

  const badge = 'absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums'

  return (
    <>
      {(docCount > 0 || legacyInvoice) && (
        <button type="button" onClick={onOpenDocuments}
          className="relative p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
          title={docTitle}
          aria-label={docTitle}>
          <FileText className="w-4 h-4 text-violet-500" />
          {docCount > 0 && <span className={`${badge} bg-violet-500`}>{docCount}</span>}
        </button>
      )}
      {total > 0 && (
        <button type="button" onClick={() => navigate(outbox())}
          className="relative p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer"
          title={mailTitle} aria-label={mailTitle}>
          <Mail className={`w-4 h-4 ${allOk ? 'text-emerald-500' : 'text-red-500'}`} />
          <span className={`${badge} ${allOk ? 'bg-emerald-500' : 'bg-red-500'}`}>{total}</span>
        </button>
      )}
      {sendInfo?.invoiceSent && (
        <button type="button" onClick={() => navigate(outbox('invoice'))}
          className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer"
          title={t('orders.invoiceEmailedTooltip')} aria-label={t('orders.invoiceEmailedTooltip')}>
          <ReceiptText className="w-4 h-4 text-emerald-600" />
        </button>
      )}
    </>
  )
}
