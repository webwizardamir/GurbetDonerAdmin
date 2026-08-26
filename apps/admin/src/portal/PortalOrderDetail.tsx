import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Loader2,
  Package,
  FileText,
  Calendar,
  CreditCard,
  Truck,
} from 'lucide-react'
import { usePortalAuth } from '../context/PortalAuthContext'
import { fetchPortalOrder, type PortalOrder } from '../services/portalOrders'
import { formatQuantityWithUnit, formatPrice } from '../utils/format'
import PortalDocumentActions from './components/PortalDocumentActions'
import { catchWeightPartsOf, formatPieceBreakdown } from '../utils/catchWeight'
interface PortalDocument {
  id: string
  document_number: string
  document_type: string
  pdf_url?: string
  snapshot?: Record<string, unknown>
  created_at: string
  generated_at: string
}

interface PortalOrderItem {
  id: string
  product_name?: string
  quantity: number
  // Catch weight (00117), whitelisted into get_portal_order. Present only on
  // lines counted in pieces; the customer must read the same "35 x 7 kg" here
  // as on the invoice PDF they were emailed.
  piece_count?: number | string | null
  piece_weight_kg?: number | string | null
  unit_price_cents: number
  line_total_cents: number
  product?: { name: string; unit_type: string }
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_payment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const documentTypeColors: Record<string, string> = {
  invoice: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  proforma: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  order_confirmation: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  packing_slip: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  credit_note: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  payment_reminder: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function PortalOrderDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = usePortalAuth()
  const [order, setOrder] = useState<PortalOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id || !user?.customer.id) return

    const loadOrder = async () => {
      try {
        const data = await fetchPortalOrder(id, user.customer.id)
        if (!data) {
          setNotFound(true)
        } else {
          setOrder(data)
        }
      } catch (err) {
        console.error('Error loading order:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [id, user?.customer.id])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'long',
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

  if (notFound || !order) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          {t('errors.notFound')}
        </p>
        <Link
          to="/portal/orders"
          className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('portal.orderDetail.backToOrders')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/portal/orders"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {order.order_number}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t('portal.orderDetail.title')}
          </p>
        </div>
        <span
          className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${
            statusColors[order.status] || statusColors.draft
          }`}
        >
          {t(`orders.status.${order.status}`)}
        </span>
      </div>

      {/* Order Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.orderDetail.orderDate')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {formatDate(order.order_date || order.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.orderDetail.paymentMethod')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {order.payment_method
                  ? t(`orders.payment.${order.payment_method}`)
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.orderDetail.items')}
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {order.items?.length || 0} {t('common.items')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Notes */}
      {order.delivery_notes && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                {t('portal.orderDetail.deliveryNotes')}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {order.delivery_notes}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {t('portal.orderDetail.items')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                  {t('portal.orderDetail.product')}
                </th>
                <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                  {t('portal.orderDetail.quantity')}
                </th>
                <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                  {t('portal.orderDetail.unitPrice')}
                </th>
                <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                  {t('portal.orderDetail.total')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {(order.items as unknown as PortalOrderItem[])?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {item.product?.name || item.product_name || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {formatQuantityWithUnit(
                      item.quantity,
                      item.product?.unit_type || 'piece',
                      t
                    )}
                    {formatPieceBreakdown(catchWeightPartsOf(item)) && (
                      <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                        {formatPieceBreakdown(catchWeightPartsOf(item))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {formatPrice(item.unit_price_cents)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                    {formatPrice(item.line_total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 dark:border-slate-700">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                  {t('portal.orderDetail.subtotal')}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                  {formatPrice(order.subtotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                  {t('portal.orderDetail.tax')}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                  {formatPrice(order.tax)}
                </td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-700/50">
                <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                  {t('portal.orderDetail.orderTotal')}
                </td>
                <td className="px-4 py-3 text-right text-lg font-bold text-green-600 dark:text-green-400">
                  {formatPrice(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {t('portal.orderDetail.documents')}
          </h2>
        </div>
        <div className="p-4">
          {!order.documents || order.documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                {t('portal.orderDetail.noDocuments')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(order.documents as unknown as PortalDocument[]).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600">
                      <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {doc.document_number}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            documentTypeColors[doc.document_type] || documentTypeColors.invoice
                          }`}
                        >
                          {t(`portal.documents.types.${doc.document_type}`)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <PortalDocumentActions doc={doc} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
