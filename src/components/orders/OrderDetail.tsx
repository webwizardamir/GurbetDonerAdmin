import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Loader2,
  ShoppingCart,
  Building2,
  Calendar,
  Package,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Printer,
  Banknote,
} from 'lucide-react'
import { updateOrderStatus } from '../../services/orders'
import type { OrderStatus, DocumentType, PaymentMethod } from '../../types'
import type { OrderWithItems } from '../../services/orders'
import DocumentGenerator from '../documents/DocumentGenerator'
import PaymentMethodModal from './PaymentMethodModal'
import { formatQuantity } from '../../utils/format'

interface OrderDetailProps {
  order: OrderWithItems
  onClose: () => void
  onStatusChange: () => void
}

// Format price from cents to euros
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Format datetime
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format unit type with translation support
function formatUnitDutch(unitType: string, quantity: number, t?: (key: string) => string): string {
  switch (unitType?.toLowerCase()) {
    case 'kg':
      return 'kg'
    case 'piece':
      if (t) {
        return quantity === 1 ? t('products.units.pieceSingular') : t('products.units.piecePlural')
      }
      return quantity === 1 ? 'stuk' : 'stuks'
    case 'package':
      if (t) {
        return quantity === 1 ? t('products.units.packageSingular') : t('products.units.packagePlural')
      }
      return quantity === 1 ? 'pak' : 'pakken'
    default:
      if (t) {
        return quantity === 1 ? t('products.units.pieceSingular') : t('products.units.piecePlural')
      }
      return quantity === 1 ? 'stuk' : 'stuks'
  }
}

// Status badge component - supports both original and new schema statuses
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const config: Record<string, { labelKey: string; className: string }> = {
    draft: {
      labelKey: 'orders.status.draft',
      className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    },
    pending_payment: {
      labelKey: 'orders.status.pending_payment',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
    on_hold: {
      labelKey: 'orders.status.on_hold',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    cancelled: {
      labelKey: 'orders.status.cancelled',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    },
    refunded: {
      labelKey: 'orders.status.refunded',
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    },
    completed: {
      labelKey: 'orders.status.completed',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
    // Original schema statuses
    pending: {
      labelKey: 'orders.status.pending',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
    processing: {
      labelKey: 'orders.status.processing',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    delivered: {
      labelKey: 'orders.status.delivered',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
  }

  const statusConfig = config[status] || {
    labelKey: '',
    className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  }

  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.className}`}>
      {statusConfig.labelKey ? t(statusConfig.labelKey) : (status || 'Unknown')}
    </span>
  )
}

export default function OrderDetail({ order, onClose, onStatusChange }: OrderDetailProps) {
  const { t } = useTranslation()
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatingDoc, setGeneratingDoc] = useState<DocumentType | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const handleStatusChange = async (newStatus: OrderStatus, paymentMethod?: PaymentMethod) => {
    if (order.status === newStatus) return

    // If completing without payment method, show modal
    if (newStatus === 'completed' && !paymentMethod) {
      setShowPaymentModal(true)
      return
    }

    const confirmMessage = newStatus === 'cancelled'
      ? t('orders.detail.confirmCancel')
      : newStatus === 'refunded'
        ? t('orders.detail.confirmRefund')
        : null // No confirmation for completed (already confirmed via modal)

    if (confirmMessage && !confirm(confirmMessage)) return

    setUpdatingStatus(true)
    setError(null)

    try {
      await updateOrderStatus(order.id, newStatus, paymentMethod)
      onStatusChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('orders.detail.updateError'))
    } finally {
      setUpdatingStatus(false)
      setShowPaymentModal(false)
    }
  }

  const handlePaymentConfirm = async (method: PaymentMethod) => {
    await handleStatusChange('completed', method)
  }

  // Available status transitions
  const statusActions: { status: OrderStatus; labelKey: string; icon: React.ReactNode; color: string }[] = [
    { status: 'pending_payment', labelKey: 'orders.status.pending', icon: <Clock className="w-4 h-4" />, color: 'amber' },
    { status: 'on_hold', labelKey: 'orders.status.on_hold', icon: <RefreshCw className="w-4 h-4" />, color: 'blue' },
    { status: 'completed', labelKey: 'orders.actions.complete', icon: <CheckCircle className="w-4 h-4" />, color: 'green' },
    { status: 'cancelled', labelKey: 'orders.actions.cancel', icon: <XCircle className="w-4 h-4" />, color: 'red' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {order.order_number}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('orders.detail.created')} {formatDateTime(order.created_at)}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Status & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            {order.payment_method && order.payment_method !== 'none' && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                order.payment_method === 'cash'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}>
                {order.payment_method === 'cash' ? (
                  <><Banknote className="w-3 h-3" /> {t('orders.payment.cash')}</>
                ) : (
                  <><Building2 className="w-3 h-3" /> {t('orders.payment.bank')}</>
                )}
              </span>
            )}
            {order.status !== 'cancelled' && order.status !== 'refunded' && (
              <div className="flex flex-wrap gap-2">
                {statusActions
                  .filter(a => a.status !== order.status)
                  .map(action => (
                    <button
                      key={action.status}
                      onClick={() => handleStatusChange(action.status)}
                      disabled={updatingStatus}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                        ${action.color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' : ''}
                        ${action.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50' : ''}
                        ${action.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50' : ''}
                        ${action.color === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' : ''}
                        disabled:opacity-50
                      `}
                    >
                      {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : action.icon}
                      {t(action.labelKey)}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-xs uppercase font-medium">{t('orders.customer')}</span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {order.customer?.company_name || '-'}
              </p>
              {order.customer?.contact_person && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {order.customer.contact_person}
                </p>
              )}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs uppercase font-medium">{t('orders.orderDate')}</span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {formatDate(order.order_date)}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-slate-400" />
              <h3 className="font-medium text-slate-900 dark:text-white">
                {t('orders.orderItems')} ({order.items?.length || 0})
              </h3>
            </div>
            <div className="space-y-2">
              {order.items?.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {item.product_name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatPrice(item.unit_price)} × {formatQuantity(item.quantity)} {formatUnitDutch(item.unit_type, item.quantity, t)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(item.line_total)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      BTW {item.tax_rate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {(order.delivery_notes || order.internal_notes) && (
            <div className="space-y-3">
              {order.delivery_notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">{t('orders.form.deliveryNotes')}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{order.delivery_notes}</p>
                </div>
              )}
              {order.internal_notes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">{t('orders.form.internalNotes')}</span>
                  </div>
                  <p className="text-amber-700 dark:text-amber-300">{order.internal_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Order Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">{t('orders.subtotal')}</span>
              <span className="text-slate-900 dark:text-white">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t('orders.detail.discount')}</span>
                <span className="text-red-600 dark:text-red-400">-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">{t('orders.tax')}</span>
              <span className="text-slate-900 dark:text-white">{formatPrice(order.tax_amount)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t('orders.detail.delivery')}</span>
                <span className="text-slate-900 dark:text-white">{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-slate-200 dark:border-slate-600">
              <span className="text-slate-900 dark:text-white">{t('orders.total')}</span>
              <span className="text-green-600 dark:text-green-400">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Document Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Printer className="w-4 h-4 text-slate-400" />
              <h3 className="font-medium text-slate-900 dark:text-white">
                {t('orders.detail.documents')}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGeneratingDoc('invoice')}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Factuur
              </button>
              <button
                onClick={() => setGeneratingDoc('proforma')}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Proforma
              </button>
              <button
                onClick={() => setGeneratingDoc('order_confirmation')}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 font-medium rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Orderbevestiging
              </button>
              <button
                onClick={() => setGeneratingDoc('packing_slip')}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Pakbon
              </button>
              <button
                onClick={() => setGeneratingDoc('payment_reminder')}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Herinnering
              </button>
              {(order.status === 'refunded' || order.status === 'cancelled') && (
                <button
                  onClick={() => setGeneratingDoc('credit_note')}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Credit Nota
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>

      {/* Document Generator Modal */}
      {generatingDoc && (
        <DocumentGenerator
          orderId={order.id}
          orderNumber={order.order_number}
          documentType={generatingDoc}
          onClose={() => setGeneratingDoc(null)}
          onGenerated={() => setGeneratingDoc(null)}
        />
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <PaymentMethodModal
          orderNumber={order.order_number}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setShowPaymentModal(false)}
          loading={updatingStatus}
        />
      )}
    </div>
  )
}
