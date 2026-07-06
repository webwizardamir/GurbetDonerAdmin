import { useState, useEffect } from 'react'
import { pdf } from '@react-pdf/renderer'
import { BlobProvider } from '@react-pdf/renderer'
import {
  X,
  Download,
  Loader2,
  FileText,
  Eye,
  Printer,
  Send,
} from 'lucide-react'
import SendDocumentModal from './SendDocumentModal'
import { getDocumentTemplate } from './getDocumentTemplate'
import {
  buildInvoiceData,
  getNextDocumentNumber,
  createDocument,
  fetchLatestDocumentForOrder,
  type InvoiceData,
} from '../../services/documents'
import type { DocumentType } from '../../types'
import { formatPrice } from '../../utils/format'

interface DocumentGeneratorProps {
  orderId: string
  orderNumber: string
  documentType: DocumentType
  onClose: () => void
  onGenerated?: () => void
}

export default function DocumentGenerator({
  orderId,
  orderNumber,
  documentType,
  onClose,
  onGenerated,
}: DocumentGeneratorProps) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showSend, setShowSend] = useState(false)
  // Set when an existing documents row was reused on mount — Download skips
  // the createDocument step, and Send links the audit row to it.
  const [existingDocumentId, setExistingDocumentId] = useState<string | null>(null)

  // Load invoice data
  useEffect(() => {
    loadData()
  }, [orderId, documentType])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, existing] = await Promise.all([
        buildInvoiceData(orderId, documentType),
        fetchLatestDocumentForOrder(orderId, documentType),
      ])
      if (existing) {
        // Reuse the existing document number — generating today and emailing
        // 2 days later must not produce a second invoice with a new number.
        data.documentNumber = existing.document_number
        setExistingDocumentId(existing.id)
      } else {
        const docNumber = await getNextDocumentNumber(documentType)
        data.documentNumber = docNumber
        setExistingDocumentId(null)
      }
      setInvoiceData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document data')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!invoiceData) return

    setGenerating(true)
    setError(null)

    try {
      // Generate PDF blob with correct template
      const blob = await pdf(getDocumentTemplate(documentType, invoiceData)).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceData.documentNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Only insert a new documents row when this is the first download of
      // this type for the order. Subsequent downloads reuse the existing row.
      if (!existingDocumentId) {
        await createDocument(
          orderId,
          documentType,
          invoiceData.documentNumber,
          invoiceData as unknown as Record<string, unknown>,
          undefined, // No storage URL for now
          blob.size
        )
      }

      onGenerated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = async () => {
    if (!invoiceData) return

    // Open the tab synchronously, inside the tap, so mobile browsers don't
    // treat it as a programmatic popup and block it. The PDF is generated
    // afterwards and loaded into this already-open window.
    const printWindow = window.open('', '_blank')

    setGenerating(true)
    try {
      const blob = await pdf(getDocumentTemplate(documentType, invoiceData)).toBlob()
      const url = URL.createObjectURL(blob)

      if (printWindow) {
        // Show the PDF. On desktop we auto-open the print dialog; on mobile the
        // browser ignores print() for PDFs, so the user taps the viewer's own
        // print/share control (one tap away).
        printWindow.location.href = url
        printWindow.onload = () => {
          try {
            printWindow.print()
          } catch {
            // Mobile PDF viewers don't support programmatic print — no-op.
          }
        }
      } else {
        // Popup was blocked — fall back to opening the PDF in the current tab.
        window.location.href = url
      }
    } catch (err) {
      printWindow?.close()
      setError(err instanceof Error ? err.message : 'Failed to generate PDF for print')
    } finally {
      setGenerating(false)
    }
  }

  const getDocumentTitle = () => {
    switch (documentType) {
      case 'invoice': return 'Invoice'
      case 'proforma': return 'Proforma'
      case 'credit_note': return 'Credit Note'
      case 'packing_slip': return 'Packing Slip'
      case 'order_confirmation': return 'Order Confirmation'
      case 'payment_reminder': return 'Payment Reminder'
      default: return 'Document'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col ${
        showPreview ? 'w-full max-w-5xl h-[90vh]' : 'w-full max-w-md'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Generate {getDocumentTitle()}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Order {orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          ) : showPreview && invoiceData ? (
            <div className="h-full">
              <BlobProvider document={getDocumentTemplate(documentType, invoiceData)}>
                {({ url, loading: blobLoading, error: blobError }) =>
                  blobError ? (
                    <div className="flex items-center justify-center h-full p-6 text-sm text-red-700 dark:text-red-300">
                      Voorbeeld kon niet worden geladen
                    </div>
                  ) : blobLoading || !url ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                    </div>
                  ) : (
                    // Show the viewer toolbar so the document opens at a readable
                    // zoom and the user can zoom/print/scroll. (#view=Fit shrank
                    // the whole page to fit and made it unreadable.)
                    <iframe
                      title="document-preview"
                      src={`${url}#toolbar=1&navpanes=0`}
                      className="w-full h-full border-0"
                    />
                  )
                }
              </BlobProvider>
            </div>
          ) : invoiceData ? (
            <div className="p-6 space-y-6">
              {/* Document Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Document Number</span>
                  <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                    {invoiceData.documentNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Customer</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {invoiceData.customer.companyName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Date</span>
                  <span className="text-sm text-slate-900 dark:text-white">
                    {new Date(invoiceData.documentDate).toLocaleDateString('nl-NL')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Due Date</span>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {new Date(invoiceData.dueDate).toLocaleDateString('nl-NL')}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Total</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatPrice(invoiceData.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Items ({invoiceData.items.length})
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {invoiceData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400 truncate flex-1">
                        <span className="inline-block w-6 text-slate-400 dark:text-slate-500 font-mono text-right mr-2">{idx + 1}.</span>
                        {item.quantity}x {item.description}
                      </span>
                      <span className="text-slate-900 dark:text-white font-mono ml-4">
                        {formatPrice(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && !error && invoiceData && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                title={showPreview ? 'Hide preview' : 'Preview'}
                className="inline-flex items-center justify-center w-11 h-11 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrint}
                disabled={generating}
                title="Print"
                className="inline-flex items-center justify-center w-11 h-11 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
              </button>

              {invoiceData && (
                <button
                  onClick={() => setShowSend(true)}
                  disabled={generating}
                  title="Email"
                  className="inline-flex items-center justify-center w-11 h-11 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleDownload}
                disabled={generating}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors whitespace-nowrap"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {generating ? 'Generating...' : 'Download'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showSend && invoiceData && (
        <SendDocumentModal
          orderId={orderId}
          documentType={documentType as import('../../types').EmailDocumentType}
          documentId={existingDocumentId}
          invoiceData={invoiceData}
          pdfElement={getDocumentTemplate(documentType, invoiceData)}
          onClose={() => setShowSend(false)}
          onSent={() => { onGenerated?.() }}
        />
      )}
    </div>
  )
}
