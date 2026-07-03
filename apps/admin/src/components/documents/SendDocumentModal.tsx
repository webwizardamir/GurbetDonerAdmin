import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { supabase } from '../../services/supabase'
import { fetchDocumentSettings, type InvoiceData } from '../../services/documents'
import {
  getTemplate,
  renderTemplate,
  sendDocumentEmail,
  type TemplateContext,
} from '../../services/documentEmail'
import type { EmailDocumentType } from '../../types'
import { formatPrice } from '../../utils/format'

interface SendDocumentModalProps {
  orderId: string
  documentType: EmailDocumentType
  documentId: string | null
  invoiceData: InvoiceData
  /** React-pdf document element to convert to base64 — same one used by Download. */
  pdfElement: React.ReactElement
  onClose: () => void
  onSent?: () => void
}

export default function SendDocumentModal({
  orderId,
  documentType,
  documentId,
  invoiceData,
  pdfElement,
  onClose,
  onSent,
}: SendDocumentModalProps) {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [recipient, setRecipient] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Email language follows the document language (NL/BE → nl, else en).
  const lang = invoiceData.lang ?? 'nl'

  // Build the {{placeholder}} substitution context once from invoiceData.
  const ctx: TemplateContext = useMemo(() => ({
    company_name:    invoiceData.company.name,
    customer_name:   invoiceData.customer.companyName,
    document_number: invoiceData.documentNumber,
    order_number:    invoiceData.order.orderNumber,
    total:           formatPrice(invoiceData.grandTotal ?? 0),
    due_date:        invoiceData.dueDate
      ? new Date(invoiceData.dueDate).toLocaleDateString(lang === 'en' ? 'en-GB' : 'nl-NL')
      : '',
  }), [invoiceData, lang])

  // Load settings + customer email + render template defaults.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [settings, { data: customerRow }] = await Promise.all([
          fetchDocumentSettings(),
          supabase.from('customers').select('email').eq('id', invoiceData.customer.id).maybeSingle(),
        ])
        if (cancelled) return

        const tmpl = getTemplate(settings?.email_templates, documentType, lang)
        setSubject(renderTemplate(tmpl.subject, ctx))
        setBody(renderTemplate(tmpl.body, ctx))
        setRecipient(customerRow?.email ?? '')
        setBcc(settings?.email_bcc ?? '')
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [documentType, invoiceData.customer.id, ctx, lang])

  const handleSend = async () => {
    if (!recipient.trim()) {
      setError(t('documents.send.recipientRequired'))
      return
    }
    setSending(true)
    setError(null)
    try {
      // Render the PDF, convert to base64
      const blob = await pdf(pdfElement).toBlob()
      const buffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
      }
      const pdfBase64 = btoa(binary)

      const result = await sendDocumentEmail({
        orderId,
        documentId,
        documentType,
        recipientEmail: recipient.trim(),
        bccEmail:       bcc.trim() || null,
        subject:        subject,
        body:           body,
        pdfBase64,
        pdfFilename:    `${invoiceData.documentNumber || 'document'}.pdf`,
      })

      if (!result.ok) {
        setError(result.error ?? 'Send failed')
        return
      }
      setDone(true)
      onSent?.()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('documents.send.title')} — {invoiceData.documentNumber}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {t('documents.send.sentTo', { recipient })}
              </p>
              {bcc && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('documents.send.bccCopy', { bcc })}
                </p>
              )}
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('documents.send.to')}
                </label>
                <input
                  type="email"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('documents.send.bcc')}
                </label>
                <input
                  type="email"
                  value={bcc}
                  onChange={e => setBcc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('documents.send.subject')}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('documents.send.body')}
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('documents.send.pdfAttached', { filename: `${invoiceData.documentNumber}.pdf` })}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
          {done ? (
            <button onClick={onClose} className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors">
              {t('common.close')}
            </button>
          ) : (
            <>
              <button onClick={onClose} disabled={sending} className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSend}
                disabled={loading || sending || !recipient}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('documents.send.sendButton')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
