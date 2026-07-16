import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, Search, RefreshCw } from 'lucide-react'
import { fetchDocumentSendsPaged, syncEmailStatus } from '../services/documentEmail'
import { fetchDocumentSettings } from '../services/documents'
import EmailViewModal, { StatusIcon } from '../components/documents/EmailViewModal'
import Pagination from '../components/ui/Pagination'
import type { DocumentSend, DocumentSettings } from '../types'

// 'problems' groups every delivery-failure status (bounced/complained/suppressed/failed).
type StatusFilter = 'all' | 'delivered' | 'sent' | 'pending' | 'problems'
const FILTERS: StatusFilter[] = ['all', 'delivered', 'sent', 'pending', 'problems']
const PAGE_SIZE = 50

export default function Outbox() {
  const { t } = useTranslation()
  const [sends, setSends] = useState<DocumentSend[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
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

  // Any filter/search change resets to page 1.
  useEffect(() => { setPage(1) }, [statusFilter, debouncedSearch])

  useEffect(() => { void load() }, [statusFilter, debouncedSearch, page])

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
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('outbox.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          {FILTERS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-green-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              } ${i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}
            >
              {t(`outbox.status.${s}`)}
            </button>
          ))}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          title={t('outbox.refreshHint')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? t('outbox.refreshing') : t('outbox.refresh')}
        </button>
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
        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={total} onPageChange={setPage} />
      )}

      {selected && (
        <EmailViewModal send={selected} settings={settings} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
