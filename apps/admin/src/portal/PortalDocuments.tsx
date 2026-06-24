import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  FileText,
  Loader2,
  Download,
  Filter,
  ExternalLink,
} from 'lucide-react'
import { usePortalAuth } from '../context/PortalAuthContext'
import { fetchPortalDocuments } from '../services/portalOrders'
import { formatPrice } from '../utils/format'

const documentTypeColors: Record<string, string> = {
  invoice: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  proforma: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  order_confirmation: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  packing_slip: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  credit_note: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  payment_reminder: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function PortalDocuments() {
  const { t } = useTranslation()
  const { user } = usePortalAuth()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    if (!user?.customer.id) return

    const loadDocuments = async () => {
      try {
        const data = await fetchPortalDocuments(user.customer.id)
        setDocuments(data)
      } catch (err) {
        console.error('Error loading documents:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDocuments()
  }, [user?.customer.id])

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (!doc.document_number.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      // Type filter
      if (typeFilter !== 'all' && doc.document_type !== typeFilter) {
        return false
      }
      return true
    })
  }, [documents, search, typeFilter])


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('portal.documents.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t('portal.documents.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('portal.documents.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none pl-9 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">{t('portal.documents.allTypes')}</option>
            <option value="invoice">{t('portal.documents.types.invoice')}</option>
            <option value="proforma">{t('portal.documents.types.proforma')}</option>
            <option value="order_confirmation">{t('portal.documents.types.order_confirmation')}</option>
            <option value="packing_slip">{t('portal.documents.types.packing_slip')}</option>
            <option value="credit_note">{t('portal.documents.types.credit_note')}</option>
            <option value="payment_reminder">{t('portal.documents.types.payment_reminder')}</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {documents.length === 0
              ? t('portal.documents.noDocuments')
              : t('portal.documents.noDocumentsMatch')}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.documents.documentNumber')}
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.documents.type')}
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.documents.date')}
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.documents.order')}
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.documents.amount')}
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {doc.document_number}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            documentTypeColors[doc.document_type] || documentTypeColors.invoice
                          }`}
                        >
                          {t(`portal.documents.types.${doc.document_type}`)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                        {formatDate(doc.generated_at)}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          to={`/portal/orders/${doc.order?.id}`}
                          className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                        >
                          {doc.order?.order_number}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-900 dark:text-white">
                        {formatPrice(doc.order?.total || 0)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {doc.pdf_url ? (
                          <a
                            href={doc.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            {t('portal.documents.download')}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {doc.document_number}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(doc.generated_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      documentTypeColors[doc.document_type] || documentTypeColors.invoice
                    }`}
                  >
                    {t(`portal.documents.types.${doc.document_type}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <Link
                    to={`/portal/orders/${doc.order?.id}`}
                    className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                  >
                    {doc.order?.order_number}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatPrice(doc.order?.total || 0)}
                  </span>
                </div>
                {doc.pdf_url && (
                  <a
                    href={doc.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t('portal.documents.download')}
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
