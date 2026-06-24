import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Mail, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Search,
} from 'lucide-react'
import { fetchDocumentSends } from '../services/documentEmail'
import type { DocumentSend, DocumentSendStatus } from '../types'

type StatusFilter = 'all' | DocumentSendStatus

export default function Outbox() {
  const { t } = useTranslation()
  const [sends, setSends] = useState<DocumentSend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchDocumentSends({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 500,
      })
      setSends(rows)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [statusFilter])

  const filtered = sends.filter(s => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.recipient_email.toLowerCase().includes(q) ||
      s.subject.toLowerCase().includes(q) ||
      (s.error_message ?? '').toLowerCase().includes(q)
    )
  })

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
          {(['all', 'sent', 'failed', 'pending', 'bounced'] as const).map((s, i) => (
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Mail className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{t('outbox.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
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
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
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
                        <Link to={`/orders/${s.order_id}/edit`} className="text-green-600 dark:text-green-400 hover:underline">
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
    </div>
  )
}

function StatusIcon({ status }: { status: DocumentSendStatus }) {
  switch (status) {
    case 'sent':
      return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    case 'pending':
      return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
    case 'bounced':
      return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
  }
}
