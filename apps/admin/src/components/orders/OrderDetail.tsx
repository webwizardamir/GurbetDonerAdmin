import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
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
  RotateCcw,
  Printer,
  Banknote,
  Info,
  StickyNote,
} from 'lucide-react'
import { updateOrderStatus } from '../../services/orders'
import type { OrderStatus, DocumentType, PaymentMethod } from '../../types'
import type { OrderWithItems } from '../../services/orders'
import DocumentGenerator from '../documents/DocumentGenerator'
import RefundModal from './RefundModal'
import OrderNotesModal from './OrderNotesModal'
import PaymentMethodModal from './PaymentMethodModal'
import StatusBadge from '../ui/StatusBadge'
import { formatQuantity, formatPrice, formatDateTime, formatPercent, profitClass } from '../../utils/format'
import { computeOrderProfit } from '../../utils/orderProfit'
import Modal from '../ui/Modal'
import { isReverseChargeCountry, isImportedOrder } from '../../utils/vat'
import { useAuth } from '../../context/AuthContext'

interface OrderDetailProps {
  order: OrderWithItems
  onClose: () => void
  onStatusChange: () => void
}

// Format date with long month name
function formatDateLong(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
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
    case 'zak':
      if (t) {
        return quantity === 1 ? t('products.units.zakSingular') : t('products.units.zakPlural')
      }
      return quantity === 1 ? 'zak' : 'zakken'
    case 'doos':
      if (t) {
        return quantity === 1 ? t('products.units.doosSingular') : t('products.units.doosPlural')
      }
      return quantity === 1 ? 'doos' : 'dozen'
    default:
      if (t) {
        return quantity === 1 ? t('products.units.pieceSingular') : t('products.units.piecePlural')
      }
      return quantity === 1 ? 'stuk' : 'stuks'
  }
}

export default function OrderDetail({ order, onClose, onStatusChange }: OrderDetailProps) {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatingDoc, setGeneratingDoc] = useState<DocumentType | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)

  // Owner-only per-order profit (revenue = subtotal, ex-VAT; cost = Σ cost_cents×qty).
  const orderProfit = computeOrderProfit(order)

  const refundAmount = order.refund_amount ?? 0
  // A refund is possible while the order isn't cancelled and something is still
  // refundable. Refunds never flip status to 'refunded' (see migration 00050),
  // so "fully refunded" is detected via refund_amount, not the status column.
  const canRefund = order.status !== 'cancelled' && refundAmount < order.total
  const isRefunded = refundAmount > 0

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
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
      }
      maxWidth="max-w-2xl"
    >
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Reverse-charge banner: shown when an app-native order goes to a non-NL customer.
              Imported orders skip this — they keep whatever VAT they had originally. */}
          {!isImportedOrder(order) && order.customer && isReverseChargeCountry(order.customer.billing_country) && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {t('orders.vat.reverseChargeBanner', {
                  country: t(`customers.countries.${order.customer.billing_country}`, order.customer.billing_country || ''),
                  vatNumber: order.customer.vat_number?.trim() || '—',
                })}
              </p>
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
            {isRefunded && refundAmount < order.total && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                <RotateCcw className="w-3 h-3" />
                {t('orders.refund.partiallyRefunded')}
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
            {canRefund && (
              <button
                onClick={() => setShowRefundModal(true)}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {t('orders.actions.refund')}
              </button>
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
                {formatDateLong(order.order_date)}
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
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {item.product_name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatPrice(item.unit_price)} × {formatQuantity(item.quantity)} {formatUnitDutch(item.unit_type, item.quantity, t)}
                    </p>
                    {isOwner && (item.cost_cents ?? 0) > 0 && (
                      <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                        {t('orders.itemsTable.cogShort')} {formatPrice(item.cost_cents!)} × {formatQuantity(item.quantity)}
                      </p>
                    )}
                    {item.notes?.trim() && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                        <span className="italic">{item.notes}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(item.line_total)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      BTW {item.tax_rate}%
                    </p>
                    {isOwner && (item.cost_cents ?? 0) > 0 && (() => {
                      // Revenue base is ex-VAT (line_total includes BTW; cost_cents is ex-VAT).
                      const revenueExVat = item.line_total - item.tax_amount
                      const lp = revenueExVat - (item.cost_cents ?? 0) * item.quantity
                      const lm = revenueExVat > 0 ? (lp / revenueExVat) * 100 : 0
                      return (
                        <p className={`text-[11px] font-medium tabular-nums ${profitClass(lp)}`}>
                          {t('orders.profit.label')} {formatPrice(lp)} · {formatPercent(lm)}
                        </p>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes — editable in any status (notes-only, no stock impact) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="font-medium text-slate-900 dark:text-white">{t('orders.notes.title')}</h3>
              </div>
              <button
                onClick={() => setShowNotesModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <StickyNote className="w-3.5 h-3.5" />
                {t('orders.notes.editNotes')}
              </button>
            </div>
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
            {!order.delivery_notes && !order.internal_notes && !order.items?.some(i => i.notes?.trim()) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.notes.empty')}</p>
            )}
          </div>

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
              <span className="text-slate-600 dark:text-slate-400">
                {t('orders.tax')}
                {!isImportedOrder(order) && order.customer && isReverseChargeCountry(order.customer.billing_country) && (
                  <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-500">({t('orders.vat.reverseChargeSuffix')})</span>
                )}
              </span>
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
            {isOwner && orderProfit.totalCost > 0 && (
              <div className="flex justify-between items-center text-sm pt-2 mt-1 border-t border-slate-200 dark:border-slate-600">
                <span className="font-medium text-slate-600 dark:text-slate-400">{t('orders.profit.label')}</span>
                <span className={`font-semibold tabular-nums ${profitClass(orderProfit.profit)}`}>
                  {formatPrice(orderProfit.profit)}
                  <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
                    {t('orders.profit.marginShort', { pct: formatPercent(orderProfit.margin).replace('%', '') })}
                  </span>
                </span>
              </div>
            )}
            {(order.refund_amount ?? 0) > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Terugbetaald</span>
                  <span className="text-red-600 dark:text-red-400">-{formatPrice(order.refund_amount ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-900 dark:text-white">Netto</span>
                  <span className="text-slate-900 dark:text-white">{formatPrice(order.total - (order.refund_amount ?? 0))}</span>
                </div>
              </>
            )}
          </div>

          {/* Refunds */}
          {(order.refunds?.length ?? 0) > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 rounded-xl space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h3 className="font-medium text-slate-900 dark:text-white">Terugbetalingen ({order.refunds!.length})</h3>
              </div>
              {order.refunds!
                .slice()
                .sort((a, b) => new Date(b.refund_date).getTime() - new Date(a.refund_date).getTime())
                .map(r => (
                  <div key={r.id} className="flex items-start justify-between text-sm py-1 border-t border-red-200 dark:border-red-900/40 first:border-t-0 first:pt-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-700 dark:text-slate-300">{formatDateLong(r.refund_date)}</div>
                      {r.woo_credit_note_number && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">Credit Nota #{r.woo_credit_note_number}</div>
                      )}
                      {r.reason && <div className="text-xs text-slate-500 dark:text-slate-400 italic">"{r.reason}"</div>}
                    </div>
                    <span className="text-red-600 dark:text-red-400 font-medium shrink-0">-{formatPrice(r.amount)}</span>
                  </div>
                ))}
            </div>
          )}

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
              {(order.status === 'refunded' || order.status === 'cancelled' || isRefunded) && (
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

      {/* Refund Modal */}
      {showRefundModal && (
        <RefundModal
          order={order}
          onClose={() => setShowRefundModal(false)}
          onRefunded={() => {
            setShowRefundModal(false)
            onStatusChange()
          }}
        />
      )}

      {/* Notes Modal — safe notes-only editor, works in any status */}
      {showNotesModal && (
        <OrderNotesModal
          order={order}
          onClose={() => setShowNotesModal(false)}
          onSaved={() => {
            setShowNotesModal(false)
            onStatusChange()
          }}
        />
      )}
    </Modal>
  )
}
