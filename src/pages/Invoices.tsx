import { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  Loader2,
  Download,
  Trash2,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { fetchDocuments, type InvoiceData } from '../services/documents'
import { supabase } from '../services/supabase'
import type { Document, DocumentType } from '../types'
import { usePermission } from '../hooks/usePermission'
import { InvoiceTemplate } from '../components/documents/InvoiceTemplate'
import { ProformaTemplate } from '../components/documents/ProformaTemplate'
import { OrderConfirmationTemplate } from '../components/documents/OrderConfirmationTemplate'
import { PaymentReminderTemplate } from '../components/documents/PaymentReminderTemplate'
import { CreditNoteTemplate } from '../components/documents/CreditNoteTemplate'
import { PackingSlipTemplate } from '../components/documents/PackingSlipTemplate'

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Document type badge
function TypeBadge({ type }: { type: DocumentType }) {
  const config: Record<DocumentType, { label: string; className: string }> = {
    invoice: {
      label: 'Factuur',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
    proforma: {
      label: 'Proforma',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    credit_note: {
      label: 'Credit Nota',
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    },
    packing_slip: {
      label: 'Pakbon',
      className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    },
    order_confirmation: {
      label: 'Orderbevestiging',
      className: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
    },
    payment_reminder: {
      label: 'Herinnering',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
  }

  const { label, className } = config[type]

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${className}`}>
      {label}
    </span>
  )
}

export default function Invoices() {
  const { canDelete } = usePermission('documents')
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDocuments()
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    if (typeFilter && doc.document_type !== typeFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return doc.document_number.toLowerCase().includes(query)
    }
    return true
  })

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete ${doc.document_number}? This cannot be undone.`)) return

    setDeleting(doc.id)
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (error) throw error
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (doc: Document) => {
    // If we have a PDF URL stored, open it
    if (doc.pdf_url) {
      window.open(doc.pdf_url, '_blank')
      return
    }

    // Otherwise regenerate from snapshot
    if (doc.snapshot) {
      try {
        const data = doc.snapshot as unknown as InvoiceData

        // Get the appropriate template based on document type
        let template
        switch (doc.document_type) {
          case 'invoice':
            template = <InvoiceTemplate data={data} />
            break
          case 'proforma':
            template = <ProformaTemplate data={data} />
            break
          case 'order_confirmation':
            template = <OrderConfirmationTemplate data={data} />
            break
          case 'payment_reminder':
            template = <PaymentReminderTemplate data={data} />
            break
          case 'credit_note':
            template = <CreditNoteTemplate data={data} />
            break
          case 'packing_slip':
            template = <PackingSlipTemplate data={data} />
            break
          default:
            template = <InvoiceTemplate data={data} />
        }

        // Generate PDF blob
        const blob = await pdf(template).toBlob()

        // Create download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${doc.document_number}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Failed to regenerate PDF:', err)
        setError('Failed to generate PDF. Please try again.')
      }
    } else {
      setError('No snapshot data available for this document.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by document number..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Type Filter */}
        <div className="relative w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as DocumentType | '')}
            className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="invoice">Invoices</option>
            <option value="proforma">Proformas</option>
            <option value="credit_note">Credit Notes</option>
            <option value="packing_slip">Packing Slips</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || typeFilter
                ? 'No documents match your filters'
                : 'No documents yet. Generate documents from order details.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredDocuments.map(doc => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold font-mono text-slate-900 dark:text-white">
                            {doc.document_number}
                          </p>
                          {doc.order_id && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Order linked
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TypeBadge type={doc.document_type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{formatDateTime(doc.generated_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={deleting === doc.id}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            {deleting === doc.id ? (
                              <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || typeFilter
                ? 'No documents match your filters'
                : 'No documents yet'}
            </p>
          </div>
        ) : (
          filteredDocuments.map(doc => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold font-mono text-slate-900 dark:text-white">
                      {doc.document_number}
                    </p>
                    <TypeBadge type={doc.document_type} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deleting === doc.id}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      {deleting === doc.id ? (
                        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5 text-red-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4" />
                {formatDateTime(doc.generated_at)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          To generate new documents, go to <strong>Orders</strong>, open an order, and click the document buttons (Invoice, Proforma, Packing Slip).
        </p>
      </div>
    </div>
  )
}
