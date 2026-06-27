// Download + (desktop) Preview for a portal document. Re-renders the PDF on demand
// from the document's snapshot (no stored file). Per-instance idle/rendering/error state.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2, Eye, X, AlertCircle } from 'lucide-react'
import { renderDocumentBlob, downloadBlob } from '../utils/renderDocument'

interface RenderableDoc {
  document_type: string
  document_number: string
  snapshot?: Record<string, unknown>
}

export default function PortalDocumentActions({ doc, fullWidth = false }: { doc: RenderableDoc; fullWidth?: boolean }) {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'rendering' | 'error'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const filename = `${doc.document_number}.pdf`

  const handleDownload = async () => {
    setState('rendering')
    try {
      const blob = await renderDocumentBlob(doc as Parameters<typeof renderDocumentBlob>[0])
      downloadBlob(blob, filename)
      setState('idle')
    } catch (e) {
      console.error('Document render failed:', e)
      setState('error')
    }
  }

  const handlePreview = async () => {
    setPreviewOpen(true)
    setState('rendering')
    try {
      const blob = await renderDocumentBlob(doc as Parameters<typeof renderDocumentBlob>[0])
      setPreviewUrl(URL.createObjectURL(blob))
      setState('idle')
    } catch (e) {
      console.error('Document preview failed:', e)
      setState('error')
      setPreviewOpen(false)
    }
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewOpen(false)
  }

  return (
    <div className={`inline-flex items-center gap-2 ${fullWidth ? 'w-full' : 'justify-end'}`}>
      {/* Preview — desktop only (embedded PDF is unreliable on mobile browsers) */}
      <button
        type="button"
        onClick={handlePreview}
        disabled={state === 'rendering'}
        className="hidden md:inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        <Eye className="w-4 h-4" />{t('portal.documents.preview')}
      </button>

      {/* Download */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={state === 'rendering'}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 ${fullWidth ? 'flex-1 py-2.5' : ''} ${
          state === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {state === 'rendering' ? (
          <><Loader2 className="w-4 h-4 animate-spin" />{t('portal.documents.generating')}</>
        ) : state === 'error' ? (
          <><AlertCircle className="w-4 h-4" />{t('portal.documents.retry')}</>
        ) : (
          <><Download className="w-4 h-4" />{t('portal.documents.download')}</>
        )}
      </button>

      {/* Preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePreview} />
          <div className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">{doc.document_number}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDownload} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg">
                  <Download className="w-4 h-4" />{t('portal.documents.download')}
                </button>
                <button type="button" onClick={closePreview} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" aria-label={t('common.close')}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-900">
              {previewUrl ? (
                <iframe src={`${previewUrl}#toolbar=1&navpanes=0`} className="w-full h-full" title={doc.document_number} />
              ) : (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
