import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react'
import ListToolbar from '../components/ui/ListToolbar'
import { fetchDocumentSendsPaged, syncEmailStatus } from '../services/documentEmail'
import { fetchDocumentSettings } from '../services/documents'
import EmailViewModal, { StatusIcon } from '../components/documents/EmailViewModal'
import Pagination from '../components/ui/Pagination'
import { useUrlListState } from '../hooks/useUrlListState'
import type { DocumentSend, DocumentSettings, EmailDocumentType } from '../types'

// 'problems' groups every delivery-failure status (bounced/complained/suppressed/failed).
type StatusFilter = 'all' | 'delivered' | 'sent' | 'pending' | 'problems'
const FILTERS: StatusFilter[] = ['all', 'delivered', 'sent', 'pending', 'problems']
const PAGE_SIZE = 50

export default function Outbox() {
  const { t } = useTranslation()
  // View state lives in the URL so opening an email and coming back restores the
  // page + filter (see useUrlListState).
  // `order`/`orderNo`/`type` come from the Orders row indicators. orderNo is
  // display-only: document_sends has no order-number column, so the id does the
  // filtering and the number is passed along purely to label the chip.
  const [urlInit, setUrlState] = useUrlListState({
    page: 1, q: '', status: 'all', order: '', orderNo: '', type: '',
  })

  const [sends, setSends] = useState<DocumentSend[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(urlInit.page)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(urlInit.status as StatusFilter)
  const [searchQuery, setSearchQuery] = useState(urlInit.q)
  const [debouncedSearch, setDebouncedSearch] = useState(urlInit.q)
  const [orderFilter, setOrderFilter] = useState({
    id: urlInit.order,
    number: urlInit.orderNo,
    type: urlInit.type,
  })
  const clearOrderFilter = () => {
    setOrderFilter({ id: '', number: '', type: '' })
    setPage(1)
    setUrlState({ order: '', orderNo: '', type: '', page: 1 })
  }

  const goToPage = (next: number) => { setPage(next); setUrlState({ page: next }) }
  const [settings, setSettings] = useState<DocumentSettings | null>(null)
  const [selected, setSelected] = useState<DocumentSend | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { rows, total } = await fetchDocumentSendsPaged({
        status: statusFilter === 'delivered' || statusFilter === 'sent' || statusFilter === 'pending'
          ? statusFilter
          : undefined,
        failedOnly: statusFilter === 'problems',
        search: debouncedSearch,
        orderId: orderFilter.id || undefined,
        documentType: (orderFilter.type || undefined) as EmailDocumentType | undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setSends(rows)
      setTotal(total)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Debounce the search box so we query the DB ~300ms after typing stops.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  // Any filter/search change resets to page 1 and mirrors into the URL. The
  // initial run is skipped: it would otherwise reset the page we just restored
  // from the URL back to 1, and write the URL on mount.
  const filtersInitRef = useRef(true)
  useEffect(() => {
    if (filtersInitRef.current) { filtersInitRef.current = false; return }
    setPage(1)
    setUrlState({ page: 1, q: debouncedSearch, status: statusFilter })
  }, [statusFilter, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load() }, [statusFilter, debouncedSearch, page, orderFilter.id, orderFilter.type])

  // Pull the real delivery outcomes from Resend now (the cron also does this
  // every 15 min). A wide window backfills older rows too.
  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const { checked, updated, readKeyRestricted } = await syncEmailStatus(120)
      setSyncMsg(readKeyRestricted
        ? t('outbox.refreshNeedsKey')
        : t('outbox.refreshResult', { checked, updated }))
      await load()
    } catch (e) {
      setSyncMsg((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  // Company branding for the email preview — loaded once, non-fatal on failure.
  useEffect(() => {
    void (async () => {
      try {
        setSettings(await fetchDocumentSettings())
      } catch { /* preview falls back to plain branding */ }
    })()
  }, [])

  return (
    <div className="space-y-4">
      {/* Scoped to one order (arrived from an Orders row indicator). */}
      {orderFilter.id && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
            {orderFilter.type === 'invoice'
              ? t('outbox.filteredByOrderInvoice', { number: orderFilter.number })
              : t('outbox.filteredByOrder', { number: orderFilter.number })}
            <button
              type="button"
              onClick={clearOrderFilter}
              aria-label={t('outbox.clearOrderFilter')}
              className="p-0.5 -mr-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Toolbar. The status strip is a `segmented` filter, so on mobile it
          moves into the sheet (full width) instead of overflowing the row. */}
      <ListToolbar
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: t('outbox.searchPlaceholder') }}
        filters={[{
          id: 'status',
          kind: 'segmented',
          label: t('outbox.status.all'),
          value: statusFilter,
          onChange: v => setStatusFilter(v as StatusFilter),
          options: FILTERS.map(s => ({ value: s, label: t(`outbox.status.${s}`) })),
        }]}
        actions={[{
          id: 'sync',
          label: syncing ? t('outbox.refreshing') : t('outbox.refresh'),
          icon: RefreshCw,
          priority: 'secondary',
          onClick: handleSync,
          busy: syncing,
        }]}
        resultCount={total}
        resultsLoading={loading}
        renderResultLabel={n => t('common.filters.showResults', { count: n })}
      />
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status text, not a control — kept out of the toolbar row. */}
        {syncMsg && (
          <span className="text-xs text-slate-500 dark:text-slate-400">{syncMsg}</span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : sends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Mail className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{t('outbox.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">{t('outbox.columns.status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('outbox.columns.sentAt')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('outbox.columns.type')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('outbox.columns.recipient')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('outbox.columns.subject')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('outbox.columns.order')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sends.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-4 py-3">
                      <StatusIcon status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {new Date(s.sent_at ?? s.created_at).toLocaleString('nl-NL', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {t(`documents.types.${s.document_type}`)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {s.recipient_email}
                      {s.bcc_email && (
                        <div className="text-xs text-slate-500 dark:text-slate-500">BCC: {s.bcc_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-md truncate" title={s.subject}>
                      {s.subject}
                      {s.error_message && (
                        <div className="text-xs text-red-600 dark:text-red-400 truncate" title={s.error_message}>
                          {s.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {s.order_id ? (
                        <Link
                          to={`/orders/${s.order_id}/edit`}
                          onClick={e => e.stopPropagation()}
                          className="text-green-600 dark:text-green-400 hover:underline"
                        >
                          {t('outbox.viewOrder')}
                        </Link>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={total} onPageChange={goToPage} />
      )}

      {selected && (
        <EmailViewModal send={selected} settings={settings} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
