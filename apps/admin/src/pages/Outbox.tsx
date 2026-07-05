import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Mail, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Search, X,
} from 'lucide-react'
import { fetchDocumentSends } from '../services/documentEmail'
import { fetchDocumentSettings } from '../services/documents'
import { buildBrandedEmailHtml, type EmailBrandSettings } from '../utils/emailHtml'
import type { DocumentSend, DocumentSendStatus, DocumentSettings } from '../types'

type StatusFilter = 'all' | DocumentSendStatus

export default function Outbox() {
  const { t } = useTranslation()
  const [sends, setSends] = useState<DocumentSend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [settings, setSettings] = useState<DocumentSettings | null>(null)
  const [selected, setSelected] = useState<DocumentSend | null>(null)

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

  // Company branding for the email preview — loaded once, non-fatal on failure.
  useEffect(() => {
    void (async () => {
      try {
        setSettings(await fetchDocumentSettings())
      } catch { /* preview falls back to plain branding */ }
    })()
  }, [])

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
                {filtered.map(s => (
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

      {selected && (
        <EmailViewModal send={selected} settings={settings} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function EmailViewModal({
  send,
  settings,
  onClose,
}: {
  send: DocumentSend
  settings: DocumentSettings | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  const html = useMemo(
    () => buildBrandedEmailHtml(send.body ?? '', (settings ?? {}) as EmailBrandSettings),
    [send.body, settings],
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate" title={send.subject}>
              {send.subject}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t(`documents.types.${send.document_type}`)} · {new Date(send.sent_at ?? send.created_at).toLocaleString('nl-NL', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 space-y-1 text-sm">
          <MetaRow label={t('outbox.view.status')}>
            <span className="inline-flex items-center gap-1.5">
              <StatusIcon status={send.status} />
              <span className="text-slate-700 dark:text-slate-300">{t(`outbox.status.${send.status}`)}</span>
            </span>
          </MetaRow>
          <MetaRow label={t('outbox.view.to')}>
            <span className="text-slate-700 dark:text-slate-300">{send.recipient_email}</span>
          </MetaRow>
          {send.bcc_email && (
            <MetaRow label="BCC">
              <span className="text-slate-700 dark:text-slate-300">{send.bcc_email}</span>
            </MetaRow>
          )}
          {send.error_message && (
            <MetaRow label={t('outbox.view.errorLabel')}>
              <span className="text-red-600 dark:text-red-400">{send.error_message}</span>
            </MetaRow>
          )}
        </div>

        {/* Rendered email preview */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            {t('outbox.view.previewLabel')}
          </p>
          <iframe
            title={t('outbox.view.previewLabel')}
            srcDoc={html}
            className="w-full h-[420px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-slate-400 dark:text-slate-500">{label}</span>
      <span className="min-w-0">{children}</span>
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
