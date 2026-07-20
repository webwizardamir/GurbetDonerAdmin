import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, CheckCircle2, MailCheck, Clock, XCircle, AlertCircle, AlertTriangle, Ban } from 'lucide-react'
import { buildBrandedEmailHtml, type EmailBrandSettings } from '../../utils/emailHtml'
import type { DocumentSend, DocumentSendStatus, DocumentSettings } from '../../types'

/**
 * Read-only viewer for a single sent email (document_sends row): status/meta +
 * a branded HTML preview of exactly what the customer received. Shared by the
 * Outbox page and the reminder-history modal so the preview never drifts.
 */
export default function EmailViewModal({
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
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

export function StatusIcon({ status }: { status: DocumentSendStatus }) {
  switch (status) {
    case 'delivered':
      return <MailCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    case 'sent':
      return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    case 'pending':
      return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
    case 'bounced':
      return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
    case 'complained':
      return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
    case 'suppressed':
      return <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
    default:
      return <Clock className="w-5 h-5 text-slate-400" />
  }
}
