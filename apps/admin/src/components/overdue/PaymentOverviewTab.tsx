import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  MailWarning,
  Search,
  Send,
  Users,
} from 'lucide-react'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import ListToolbar from '../ui/ListToolbar'
import SortableTh from '../ui/SortableTh'
import type { FilterDef } from '../ui/filterTypes'
import { useTableSort } from '../../hooks/useTableSort'
import { StatusIcon } from '../documents/EmailViewModal'
import { formatDate, formatDateTime, formatPrice } from '../../utils/format'
import {
  buildPaymentOverviewData,
  currentPeriod,
  fetchPaymentOverviewById,
  fetchPaymentOverviewCustomers,
  formatPeriodLabel,
  savePaymentOverview,
} from '../../services/paymentOverview'
import { getTemplate, renderTemplate, sendDocumentEmail } from '../../services/documentEmail'
import { fetchDocumentSettings } from '../../services/documents'
import type { DocumentSettings, PaymentOverviewCustomer, PaymentOverviewData } from '../../types'
import { isSuccessfulSend } from '../../types'

// ===========================================================================
// Betaaloverzicht tab (/overdue?tab=overview) — OWNER ONLY.
//
// One row per customer with anything outstanding. Two things the owner asked
// for, and the reason this screen exists at all:
//   1. "what is going to be sent"  -> Voorbeeld renders the LIVE data through
//      the exact builder the cron uses, so the preview IS the document.
//   2. "when it was sent + see that document" -> a sent row re-renders the
//      FROZEN snapshot, not today's data, so it reproduces what the customer
//      actually received even after the balance has moved on.
//
// The PDF and the mail both go out client-side here (render -> base64 ->
// send-document-email), so a manual send needs NO Vercel renderer env. Only
// the automatic 1st-of-month run depends on RENDER_ENDPOINT_URL/RENDER_SECRET.
// ===========================================================================

type Busy = { id: string; what: 'preview' | 'send' | 'view' } | null
type SortKey = 'customer' | 'invoices' | 'oldestDue' | 'amount' | 'status'

/** Render a statement to a Blob. Lazy imports keep @react-pdf off this page's chunk. */
async function renderOverviewBlob(data: PaymentOverviewData): Promise<Blob> {
  const [{ pdf }, { PaymentOverviewTemplate }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../documents/PaymentOverviewTemplate'),
  ])
  return pdf(<PaymentOverviewTemplate data={data} />).toBlob()
}

function blobToBase64(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then(buf => {
    const bytes = new Uint8Array(buf)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
    }
    return btoa(binary)
  })
}

export default function PaymentOverviewTab() {
  const { t } = useTranslation()
  const period = useMemo(() => currentPeriod(), [])

  const [rows, setRows] = useState<PaymentOverviewCustomer[]>([])
  const [settings, setSettings] = useState<DocumentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [confirmFor, setConfirmFor] = useState<PaymentOverviewCustomer | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Search + filters are CLIENT-side: the RPC returns every customer with a
  // balance in one shot (tens of rows, not thousands), so there is nothing to
  // paginate and a round-trip per keystroke would be pure latency.
  const [search, setSearch] = useState('')
  const [sendFilter, setSendFilter] = useState('')      // '' | 'notSent' | 'sent'
  const [overdueFilter, setOverdueFilter] = useState('') // '' | 'overdue' | 'current'
  const [emailFilter, setEmailFilter] = useState('')     // '' | 'with' | 'without'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<SortKey>('amount', 'desc')

  // Object URLs are only released on replace/close — revoking eagerly kills the
  // iframe that is still displaying them.
  const urlRef = useRef<string | null>(null)
  const setPreview = (url: string | null, title = '') => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = url
    setPreviewUrl(url)
    setPreviewTitle(title)
  }
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, s] = await Promise.all([
        fetchPaymentOverviewCustomers(period),
        fetchDocumentSettings(),
      ])
      setRows(list)
      setSettings(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { void load() }, [load])

  // Stats describe the WHOLE month, not the current filter — they are the
  // "where do I stand" figures, and having them move as you type a search
  // would make them useless for the decision they support.
  const stats = useMemo(() => {
    const outstanding = rows.reduce((s, r) => s + Number(r.total_cents || 0), 0)
    const sent = rows.filter(r => r.last_send_status && isSuccessfulSend(r.last_send_status)).length
    const noEmail = rows.filter(r => !r.email?.trim()).length
    return { outstanding, customers: rows.length, sent, noEmail }
  }, [rows])

  const wasSent = (r: PaymentOverviewCustomer) =>
    !!r.last_send_status && isSuccessfulSend(r.last_send_status)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = rows.filter(r => {
      if (q && !`${r.company_name} ${r.email ?? ''}`.toLowerCase().includes(q)) return false
      if (sendFilter === 'sent' && !wasSent(r)) return false
      if (sendFilter === 'notSent' && wasSent(r)) return false
      if (overdueFilter === 'overdue' && r.overdue_count === 0) return false
      if (overdueFilter === 'current' && r.overdue_count > 0) return false
      if (emailFilter === 'with' && !r.email?.trim()) return false
      if (emailFilter === 'without' && r.email?.trim()) return false
      return true
    })
    return sortBy(filtered, {
      customer: r => r.company_name,
      invoices: r => r.open_count,
      oldestDue: r => r.oldest_due_date,
      amount: r => Number(r.total_cents || 0),
      // Sorting by "delivery" means grouping not-yet-sent first, which is the
      // actionable end — the raw status string would sort alphabetically and
      // scatter them.
      status: r => (wasSent(r) ? 1 : 0),
    })
  }, [rows, search, sendFilter, overdueFilter, emailFilter, sortBy])

  const filterDefs: FilterDef[] = useMemo(() => [
    {
      id: 'send',
      kind: 'select',
      label: t('paymentOverview.filters.send'),
      value: sendFilter,
      onChange: setSendFilter,
      allLabel: t('paymentOverview.filters.sendAll'),
      options: [
        { value: 'notSent', label: t('paymentOverview.filters.notSent'), count: rows.filter(r => !wasSent(r)).length },
        { value: 'sent', label: t('paymentOverview.filters.sent'), count: rows.filter(wasSent).length },
      ],
    },
    {
      id: 'overdue',
      kind: 'select',
      label: t('paymentOverview.filters.overdue'),
      value: overdueFilter,
      onChange: setOverdueFilter,
      allLabel: t('paymentOverview.filters.overdueAll'),
      options: [
        { value: 'overdue', label: t('paymentOverview.filters.hasOverdue'), count: rows.filter(r => r.overdue_count > 0).length },
        { value: 'current', label: t('paymentOverview.filters.noOverdue'), count: rows.filter(r => r.overdue_count === 0).length },
      ],
    },
    {
      id: 'email',
      kind: 'select',
      label: t('paymentOverview.filters.email'),
      value: emailFilter,
      onChange: setEmailFilter,
      allLabel: t('paymentOverview.filters.emailAll'),
      options: [
        { value: 'with', label: t('paymentOverview.filters.withEmail'), count: rows.filter(r => r.email?.trim()).length },
        { value: 'without', label: t('paymentOverview.filters.withoutEmail'), count: rows.filter(r => !r.email?.trim()).length },
      ],
    },
  ], [t, rows, sendFilter, overdueFilter, emailFilter])

  const handlePreview = async (row: PaymentOverviewCustomer) => {
    setBusy({ id: row.customer_id, what: 'preview' })
    setError(null)
    try {
      const data = await buildPaymentOverviewData(row.customer_id, period)
      const blob = await renderOverviewBlob(data)
      setPreview(URL.createObjectURL(blob), row.company_name)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  /** Re-render the statement that was actually mailed, from its frozen snapshot. */
  const handleViewSent = async (row: PaymentOverviewCustomer) => {
    if (!row.last_overview_id) return
    setBusy({ id: row.customer_id, what: 'view' })
    setError(null)
    try {
      const record = await fetchPaymentOverviewById(row.last_overview_id)
      if (!record) throw new Error(t('paymentOverview.errors.snapshotMissing'))
      const blob = await renderOverviewBlob(record.snapshot)
      setPreview(URL.createObjectURL(blob), row.company_name)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const handleSend = async (row: PaymentOverviewCustomer) => {
    const email = row.email?.trim()
    if (!email) return
    setBusy({ id: row.customer_id, what: 'send' })
    setError(null)
    try {
      // Same order of operations as the cron: freeze the snapshot, render from
      // the data we just froze, then mail. Never mail a body promising an
      // attachment we could not produce.
      const data = await buildPaymentOverviewData(row.customer_id, period)
      const record = await savePaymentOverview(row.customer_id, period, data)
      const blob = await renderOverviewBlob(data)
      const pdfBase64 = await blobToBase64(blob)

      const tpl = getTemplate(settings?.email_templates, 'payment_overview', data.lang)
      const ctx = {
        company_name: data.company.name,
        customer_name: data.customer.companyName,
        period: formatPeriodLabel(period, data.lang),
        invoice_count: String(data.lines.length),
        total: formatPrice(data.totalCents),
        iban: data.company.iban ?? '',
        portal_link: `${window.location.origin}/portal/documents`,
      }

      const res = await sendDocumentEmail({
        orderId: null,
        documentId: null,
        documentType: 'payment_overview',
        recipientEmail: email,
        bccEmail: settings?.email_bcc ?? null,
        subject: renderTemplate(tpl.subject, ctx),
        body: renderTemplate(tpl.body, ctx),
        pdfBase64,
        pdfFilename: `Betaaloverzicht-${data.customer.companyName.replace(/[^\w-]+/g, '-')}-${period}.pdf`,
        paymentOverviewId: record.id,
      })
      if (!res.ok) throw new Error(res.error || 'send failed')

      setToast(t('paymentOverview.sentToast', { email }))
      setTimeout(() => setToast(null), 4000)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {toast && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">{toast}</p>
        </div>
      )}

      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          {t('paymentOverview.intro', { period: formatPeriodLabel(period) })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<AlertTriangle className="w-5 h-5" />} tone="red"
          label={t('paymentOverview.stats.outstanding')} value={formatPrice(stats.outstanding)} />
        <Stat icon={<Users className="w-5 h-5" />} tone="blue"
          label={t('paymentOverview.stats.customers')} value={String(stats.customers)} />
        <Stat icon={<CheckCircle2 className="w-5 h-5" />} tone="green"
          label={t('paymentOverview.stats.sentThisMonth')} value={String(stats.sent)} />
        <Stat icon={<MailWarning className="w-5 h-5" />} tone="amber"
          label={t('paymentOverview.stats.noEmail')} value={String(stats.noEmail)} />
      </div>

      <ListToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('paymentOverview.searchPlaceholder'),
        }}
        filters={filterDefs}
        resultCount={visible.length}
        renderResultLabel={n => t('common.filters.showResults', { count: n })}
      />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-base font-medium text-slate-900 dark:text-white">
            {t('paymentOverview.empty.title')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('paymentOverview.empty.subtitle')}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-900 dark:text-white">
            {t('paymentOverview.noMatch.title')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('paymentOverview.noMatch.subtitle')}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {visible.map(row => (
              <div
                key={row.customer_id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/customers/${row.customer_id}`}
                      className="font-medium text-slate-900 dark:text-white hover:text-green-600 truncate block"
                    >
                      {row.company_name}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('paymentOverview.openCount', { count: row.open_count })}
                      {row.overdue_count > 0 && ` · ${t('paymentOverview.overdueCount', { count: row.overdue_count })}`}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white shrink-0">
                    {formatPrice(row.total_cents)}
                  </p>
                </div>
                <SendState row={row} />
                <div className="flex gap-2">
                  <ActionButton
                    onClick={() => handlePreview(row)}
                    busy={busy?.id === row.customer_id && busy.what === 'preview'}
                    icon={<Eye className="w-4 h-4" />}
                    label={t('paymentOverview.actions.preview')}
                    className="flex-1"
                  />
                  <ActionButton
                    onClick={() => setConfirmFor(row)}
                    disabled={!row.email?.trim()}
                    busy={busy?.id === row.customer_id && busy.what === 'send'}
                    icon={<Send className="w-4 h-4" />}
                    label={t('paymentOverview.actions.send')}
                    primary
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="min-w-[860px] w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <SortableTh sortKey="customer" current={sortKey} dir={sortDir} onToggle={toggleSort}>
                    {t('paymentOverview.cols.customer')}
                  </SortableTh>
                  <SortableTh sortKey="invoices" current={sortKey} dir={sortDir} onToggle={toggleSort}>
                    {t('paymentOverview.cols.invoices')}
                  </SortableTh>
                  <SortableTh sortKey="oldestDue" current={sortKey} dir={sortDir} onToggle={toggleSort}>
                    {t('paymentOverview.cols.oldestDue')}
                  </SortableTh>
                  <SortableTh sortKey="amount" current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">
                    {t('paymentOverview.cols.amount')}
                  </SortableTh>
                  <SortableTh sortKey="status" current={sortKey} dir={sortDir} onToggle={toggleSort}>
                    {t('paymentOverview.cols.status')}
                  </SortableTh>
                  <Th align="right">{t('paymentOverview.cols.actions')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {visible.map(row => (
                  <tr
                    key={row.customer_id}
                    onClick={() => handlePreview(row)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/customers/${row.customer_id}`}
                        onClick={e => e.stopPropagation()}
                        className="font-medium text-slate-900 dark:text-white hover:text-green-600 dark:hover:text-green-400"
                      >
                        {row.company_name}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.email?.trim() || t('paymentOverview.noEmail')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {row.open_count}
                      {row.overdue_count > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <Clock className="w-3 h-3" />
                          {t('paymentOverview.overdueCount', { count: row.overdue_count })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {row.oldest_due_date ? formatDate(row.oldest_due_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900 dark:text-white">
                      {formatPrice(row.total_cents)}
                    </td>
                    <td className="px-4 py-3"><SendState row={row} /></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {row.last_overview_id && row.last_send_status && (
                          <IconButton
                            title={t('paymentOverview.actions.viewSent')}
                            busy={busy?.id === row.customer_id && busy.what === 'view'}
                            onClick={() => handleViewSent(row)}
                            icon={<FileText className="w-4 h-4" />}
                          />
                        )}
                        <IconButton
                          title={t('paymentOverview.actions.preview')}
                          busy={busy?.id === row.customer_id && busy.what === 'preview'}
                          onClick={() => handlePreview(row)}
                          icon={<Eye className="w-4 h-4" />}
                        />
                        <IconButton
                          title={
                            row.email?.trim()
                              ? t('paymentOverview.actions.send')
                              : t('paymentOverview.noEmail')
                          }
                          disabled={!row.email?.trim()}
                          busy={busy?.id === row.customer_id && busy.what === 'send'}
                          onClick={() => setConfirmFor(row)}
                          icon={<Send className="w-4 h-4" />}
                          primary
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* PDF preview — native viewer toolbar, matching DocumentGenerator */}
      <Modal
        isOpen={!!previewUrl}
        onClose={() => setPreview(null)}
        title={`${t('paymentOverview.title')} · ${previewTitle}`}
        maxWidth="max-w-5xl"
      >
        <div className="h-[70vh] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
          {previewUrl && (
            <iframe
              title="payment-overview-preview"
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmFor}
        title={t('paymentOverview.confirm.title')}
        message={
          confirmFor
            ? t('paymentOverview.confirm.message', {
                customer: confirmFor.company_name,
                email: confirmFor.email,
                amount: formatPrice(confirmFor.total_cents),
                count: confirmFor.open_count,
              })
            : ''
        }
        confirmLabel={t('paymentOverview.actions.send')}
        onCancel={() => setConfirmFor(null)}
        onConfirm={() => {
          const row = confirmFor
          setConfirmFor(null)
          if (row) void handleSend(row)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function SendState({ row }: { row: PaymentOverviewCustomer }) {
  const { t } = useTranslation()
  if (!row.last_send_status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        {t('paymentOverview.notSent')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
      <StatusIcon status={row.last_send_status} />
      {row.last_sent_at ? formatDateTime(row.last_sent_at) : t(`outbox.status.${row.last_send_status}`)}
    </span>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function IconButton({
  icon, title, onClick, busy, disabled, primary,
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || busy}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        primary
          ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    </button>
  )
}

function ActionButton({
  icon, label, onClick, busy, disabled, primary, className = '',
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  primary?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        primary
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
      } ${className}`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}

const TONES: Record<string, string> = {
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
}

function Stat({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone: keyof typeof TONES }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${TONES[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}
