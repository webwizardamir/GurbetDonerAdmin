import { useState } from 'react'
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

// Format unit type to Dutch
function formatUnitDutch(unitType: string, quantity: number): string {
  switch (unitType?.toLowerCase()) {
    case 'kg':
      return 'kg'
    case 'piece':
      return quantity === 1 ? 'stuk' : 'stuks'
    case 'package':
      return quantity === 1 ? 'pak' : 'pakken'
    default:
      return quantity === 1 ? 'stuk' : 'stuks'
  }
}

// Status badge component - supports both original and new schema statuses
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: {
      label: 'Draft',
      className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    },
    pending_payment: {
      label: 'Pending Payment',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
    on_hold: {
      label: 'On Hold',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    },
    refunded: {
      label: 'Refunded',
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
    // Original schema statuses
    pending: {
      label: 'Pending',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    delivered: {
      label: 'Delivered',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
  }

  const statusConfig = config[status] || {
    label: status || 'Unknown',
    className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  }

  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.className}`}>
      {statusConfig.label}
    </span>
  )
}

export default function OrderDetail({ order, onClose, onStatusChange }: OrderDetailProps) {
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
      ? 'Cancel this order? Stock will be restored.'
      : newStatus === 'refunded'
        ? 'Refund this order? Stock will be restored.'
        : null // No confirmation for completed (already confirmed via modal)

    if (confirmMessage && !confirm(confirmMessage)) return

    setUpdatingStatus(true)
    setError(null)

    try {
      await updateOrderStatus(order.id, newStatus, paymentMethod)
      onStatusChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
      setShowPaymentModal(false)
    }
  }

  const handlePaymentConfirm = async (method: PaymentMethod) => {
    await handleStatusChange('completed', method)
  }

  // Available status transitions
  const statusActions: { status: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { status: 'pending_payment', label: 'Pending', icon: <Clock className="w-4 h-4" />, color: 'amber' },
    { status: 'on_hold', label: 'On Hold', icon: <RefreshCw className="w-4 h-4" />, color: 'blue' },
    { status: 'completed', label: 'Complete', icon: <CheckCircle className="w-4 h-4" />, color: 'green' },
    { status: 'cancelled', label: 'Cancel', icon: <XCircle className="w-4 h-4" />, color: 'red' },
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
                Created {formatDateTime(order.created_at)}
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
                  <><Banknote className="w-3 h-3" /> Cash</>
                ) : (
                  <><Building2 className="w-3 h-3" /> Bank</>
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
                      {action.label}
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
                <span className="text-xs uppercase font-medium">Customer</span>
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
                <span className="text-xs uppercase font-medium">Order Date</span>
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
                Items ({order.items?.length || 0})
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
                      {formatPrice(item.unit_price)} × {item.quantity} {formatUnitDutch(item.unit_type, item.quantity)}
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
                    <span className="text-xs uppercase font-medium">Delivery Notes</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{order.delivery_notes}</p>
                </div>
              )}
              {order.internal_notes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Internal Notes</span>
                  </div>
                  <p className="text-amber-700 dark:text-amber-300">{order.internal_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Order Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <span className="text-slate-900 dark:text-white">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Discount</span>
                <span className="text-red-600 dark:text-red-400">-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Tax (BTW)</span>
              <span className="text-slate-900 dark:text-white">{formatPrice(order.tax_amount)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Delivery</span>
                <span className="text-slate-900 dark:text-white">{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-slate-200 dark:border-slate-600">
              <span className="text-slate-900 dark:text-white">Total</span>
              <span className="text-green-600 dark:text-green-400">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Document Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Printer className="w-4 h-4 text-slate-400" />
              <h3 className="font-medium text-slate-900 dark:text-white">
                Documents
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
            Close
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
