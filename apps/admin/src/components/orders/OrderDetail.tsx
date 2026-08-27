import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
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
  CreditCard,
  Loader2,
  Info,
  StickyNote,
} from 'lucide-react'
import { updateOrderStatus, updateOrderPaymentMethod } from '../../services/orders'
import { ensureOrderInvoice } from '../../services/documents'
import { fetchDocumentSends } from '../../services/documentEmail'
import type { OrderStatus, DocumentType, PaymentMethod } from '../../types'
import { isSuccessfulSend } from '../../types'
import type { OrderWithItems } from '../../services/orders'
import DocumentGenerator from '../documents/DocumentGenerator'
import RefundModal from './RefundModal'
import OrderNotesModal from './OrderNotesModal'
import PaymentMethodModal from './PaymentMethodModal'
import StatusBadge from '../ui/StatusBadge'
import OrderStatusPicker from './OrderStatusPicker'
import { formatQuantity, formatPrice, formatDateTime, formatPercent, profitClass } from '../../utils/format'
import { formatPieceBreakdown } from '../../utils/catchWeight'
import { computeOrderProfit } from '../../utils/orderProfit'
import Modal from '../ui/Modal'
import { isReverseChargeCountry, isImportedOrder } from '../../utils/vat'
import { useAuth } from '../../context/AuthContext'

// Cash = green, bank = blue (same pairing as ui/PaymentBadge); unset is neutral
// so an order with no method reads as "nothing chosen yet", not as a third kind.
const paymentBadgeClass = (m?: PaymentMethod | null) =>
  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ' +
  (m === 'cash'
    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : m === 'bank'
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300')

interface OrderDetailProps {
  order: OrderWithItems
  onClose: () => void
  onStatusChange: () => void
  /** Called after a document is generated/sent so the parent list can refresh
   *  its invoice-number + send-status columns without a full page refresh. */
  onDocGenerated?: () => void
  /**
   * Scroll straight to a section on open. Set when the user clicked the row's
   * document indicator rather than the row itself. The panel is one long scroll
   * container, not tabs, so this is a scrollIntoView on a ref.
   */
  focusSection?: 'documents'
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

export default function OrderDetail({ order, onClose, onStatusChange, onDocGenerated, focusSection }: OrderDetailProps) {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatingDoc, setGeneratingDoc] = useState<DocumentType | null>(null)
  const [invoiceSentAt, setInvoiceSentAt] = useState<string | null | undefined>(undefined)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentEdit, setShowPaymentEdit] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)

  // Deep-link to the documents section (row document indicator -> here).
  const docsRef = useRef<HTMLDivElement>(null)
  const [highlightDocs, setHighlightDocs] = useState(false)
  useEffect(() => {
    if (focusSection !== 'documents') return
    // rAF, not a synchronous call: Modal mounts through a portal and the node
    // has no layout yet on the first commit, so scrollIntoView would no-op.
    const raf = requestAnimationFrame(() => {
      docsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      setHighlightDocs(true)
    })
    const off = setTimeout(() => setHighlightDocs(false), 1600)
    return () => { cancelAnimationFrame(raf); clearTimeout(off) }
  }, [focusSection])

  // Invoice email status — undefined while loading, null = not sent yet, else the
  // timestamp it was sent (manual or the 24h auto-send).
  useEffect(() => {
    let alive = true
    fetchDocumentSends({ orderId: order.id })
      .then(rows => {
        if (!alive) return
        const inv = rows.find(s => s.document_type === 'invoice' && isSuccessfulSend(s.status))
        setInvoiceSentAt(inv ? (inv.sent_at ?? inv.created_at) : null)
      })
      .catch(() => { if (alive) setInvoiceSentAt(null) })
    return () => { alive = false }
  }, [order.id])

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

    // Reviving a cancelled order RE-DEDUCTS stock (handle_order_status_change
    // restores on the way in and deducts again on the way out). That was one of
    // five pills before; with the picker it is a single tap, so it gets its own
    // confirmation naming the stock effect.
    const revivingCancelled =
      order.status === 'cancelled' && !['cancelled', 'refunded'].includes(newStatus)

    const confirmMessage = newStatus === 'cancelled'
      ? t('orders.detail.confirmCancel')
      : newStatus === 'refunded'
        ? t('orders.detail.confirmRefund')
        : revivingCancelled
          ? t('orders.detail.confirmRevive')
          : null // No confirmation for completed (already confirmed via modal)

    if (confirmMessage && !confirm(confirmMessage)) return

    setUpdatingStatus(true)
    setError(null)

    try {
      const wasDraft = order.status === 'draft'
      await updateOrderStatus(order.id, newStatus, paymentMethod)
      // Finalising a draft (→ any live status other than draft/cancelled/refunded)
      // issues the invoice + number now, since drafts deliberately get none.
      // Best-effort, non-imported only; never block the status change.
      if (wasDraft && !isImportedOrder(order) &&
          newStatus !== 'draft' && newStatus !== 'cancelled' && newStatus !== 'refunded') {
        void ensureOrderInvoice(order.id).catch(e => console.error('Auto invoice generation failed:', e))
      }
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

  // Payment-method correction, independent of status. Deliberately does NOT go
  // through handleStatusChange: that returns early when the status is unchanged,
  // which is exactly why an already-completed order was stuck on its first
  // choice. Writing only payment_method also avoids re-triggering the stock and
  // invoice-paid-date triggers that a status round-trip would fire.
  const handlePaymentEdit = async (method: PaymentMethod) => {
    if (method === order.payment_method) { setShowPaymentEdit(false); return }
    setUpdatingPayment(true)
    setError(null)
    try {
      await updateOrderPaymentMethod(order.id, method)
      setShowPaymentEdit(false)
      onStatusChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('orders.detail.updateError'))
    } finally {
      setUpdatingPayment(false)
    }
  }

  // A TRASHED order is stored as status='cancelled' + deleted_at, with its real
  // status parked in pre_trash_status. Editing its status from here was both
  // harmful and pointless: leaving 'cancelled' RE-DEDUCTS stock for an order
  // sitting in the bin, and restore_order overwrites status with
  // pre_trash_status anyway, so the change silently vanished on restore. The bin
  // has its own Restore action; this panel is read-only for those.
  const isTrashed = !!order.deleted_at

  // Gates the payment badge below. A trashed order carries status='cancelled',
  // so this is false for the bin whatever it was before.
  const isCompleted = order.status === 'completed'

  // Available status transitions
  // "Concept" (draft) parks an order: no invoice, no auto-email, out of analytics
  // revenue. It is offered for early/live statuses AND for cancelled — reviving a
  // cancelled order to Concept is the SAFEST revive there is (nothing is issued
  // and it stays out of the books), so blocking it while allowing cancelled →
  // completed had it backwards. Stock is correct either way: the trigger's
  // "leaving cancelled" branch re-deducts regardless of target, and drafts hold
  // stock. handleStatusChange's revive confirmation already covers this path.
  // Still excluded for completed/refunded: un-finalising a paid order should take
  // the deliberate two steps (→ on hold → concept), not one tap.
  const canMarkDraft = ['pending', 'pending_payment', 'on_hold', 'draft', 'cancelled'].includes(order.status)
  const statusActions: { status: OrderStatus; labelKey: string; icon: React.ReactNode; color: string }[] = [
    ...(canMarkDraft ? [{ status: 'draft' as OrderStatus, labelKey: 'orders.actions.markDraft', icon: <FileText className="w-4 h-4" />, color: 'slate' }] : []),
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

          {/* Status & Actions. The status pill IS the picker (see
              OrderStatusPicker) — it used to be a read-only badge followed by a
              select showing the same value. Refunded is terminal and trashed is
              read-only (see isTrashed), so both keep the plain badge — trashed
              shows the status it will return to, matching the list's column. */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isTrashed ? (
              <StatusBadge status={order.pre_trash_status || order.status} />
            ) : order.status === 'refunded' ? (
              <StatusBadge status={order.status} />
            ) : (
              <OrderStatusPicker
                current={order.status}
                options={statusActions.map(a => a.status)}
                onSelect={handleStatusChange}
                busy={updatingStatus}
              />
            )}
            {/* The payment badge IS the picker, mirroring the status pill, but
                it belongs to the COMPLETED status: it records how this order was
                paid, and 00118 clears the column on the way out of completed
                (invoice_paid_at always worked that way). So it is editable on a
                completed order — cash-then-actually-bank is a normal correction,
                and the → completed transition used to be its only writer — and a
                read-only badge on refunded / trashed, which keep their method and
                are read-only anyway. Anywhere else it is absent: offering it on an
                order that is still waiting for payment recreates the
                "Wacht op betaling + Bank" pair this fixes, one tap later. */}
            {isCompleted && !isTrashed ? (
              <button
                type="button"
                onClick={() => setShowPaymentEdit(true)}
                disabled={updatingPayment}
                title={t('orders.paymentModal.editTitle')}
                className={`${paymentBadgeClass(order.payment_method)} hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 dark:hover:ring-slate-500 dark:hover:ring-offset-slate-800 transition-all disabled:opacity-50`}
              >
                {updatingPayment ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : order.payment_method === 'cash' ? (
                  <Banknote className="w-3 h-3" />
                ) : order.payment_method === 'bank' ? (
                  <Building2 className="w-3 h-3" />
                ) : (
                  <CreditCard className="w-3 h-3" />
                )}
                {order.payment_method === 'cash'
                  ? t('orders.payment.cash')
                  : order.payment_method === 'bank'
                    ? t('orders.payment.bank')
                    : t('orders.payment.notSet')}
              </button>
            ) : (
              order.payment_method && order.payment_method !== 'none' && (
                <span className={paymentBadgeClass(order.payment_method)}>
                  {order.payment_method === 'cash' ? (
                    <><Banknote className="w-3 h-3" /> {t('orders.payment.cash')}</>
                  ) : (
                    <><Building2 className="w-3 h-3" /> {t('orders.payment.bank')}</>
                  )}
                </span>
              )
            )}
            {isRefunded && refundAmount < order.total && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                <RotateCcw className="w-3 h-3" />
                {t('orders.refund.partiallyRefunded')}
              </span>
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
                    {/* Catch weight: the price line above stays the kilos (what
                        the line is billed on); this says how they were counted.
                        Renders nothing for an ordinary line. */}
                    {formatPieceBreakdown({ pieceCount: item.piece_count, pieceWeightKg: item.piece_weight_kg }) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatPieceBreakdown({ pieceCount: item.piece_count, pieceWeightKg: item.piece_weight_kg })}
                      </p>
                    )}
                    {isOwner && (item.cost_cents ?? 0) > 0 && (() => {
                      // Per-unit difference: sold unit price − unit cost (both ex-VAT).
                      const perUnit = item.unit_price - (item.cost_cents ?? 0)
                      return (
                        <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                          {t('orders.itemsTable.cogShort')} {formatPrice(item.cost_cents!)}{' '}
                          <span className={`font-medium ${profitClass(perUnit)}`}>
                            ({perUnit >= 0 ? '+' : ''}{formatPrice(perUnit)})
                          </span>
                          {' '}× {formatQuantity(item.quantity)}
                        </p>
                      )
                    })()}
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
                      // Total line profit — base is ex-VAT (line_total includes BTW; cost_cents ex-VAT).
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
                <span className="text-slate-600 dark:text-slate-400">{t('orders.form.shipping')}</span>
                <span className="text-slate-900 dark:text-white">{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-slate-200 dark:border-slate-600">
              <span className="text-slate-900 dark:text-white">{t('orders.total')}</span>
              <span className="text-green-600 dark:text-green-400">{formatPrice(order.total)}</span>
            </div>
            {/* OWNER ONLY — cost of goods + profit. Set apart from the customer
                -facing totals by its own divider, so an internal figure is
                never read as part of the order amount. Profit is the sum of the
                per-line profits above; both use the ex-VAT, post-discount base. */}
            {isOwner && orderProfit.totalCost > 0 && (
              <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-600 space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{t('orders.profit.cogTotal')}</span>
                  <span className="tabular-nums text-slate-700 dark:text-slate-300">
                    {formatPrice(orderProfit.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-600 dark:text-slate-400">{t('orders.profit.label')}</span>
                  <span className={`font-semibold tabular-nums ${profitClass(orderProfit.profit)}`}>
                    {formatPrice(orderProfit.profit)}
                    <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
                      {t('orders.profit.marginShort', { pct: formatPercent(orderProfit.margin).replace('%', '') })}
                    </span>
                  </span>
                </div>
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
          <div
            ref={docsRef}
            className={`scroll-mt-4 rounded-xl transition-shadow ${
              highlightDocs ? 'ring-2 ring-violet-400 dark:ring-violet-500' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Printer className="w-4 h-4 text-slate-400" />
              <h3 className="font-medium text-slate-900 dark:text-white">
                {t('orders.detail.documents')}
              </h3>
            </div>

            {/* Invoice email status — only a factual "sent on <date>" (manual or
                the 24h auto-send) or a neutral "not sent yet". We deliberately do
                NOT promise a scheduled send here: whether the auto-send fires
                depends on settings (opt-in toggle) + opt-out state the panel
                doesn't know, so a "will be sent on…" line could be a lie. */}
            {invoiceSentAt !== undefined && !isImportedOrder(order) && (
              invoiceSentAt ? (
                <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {t('orders.detail.invoiceSentOn', { date: formatDateTime(invoiceSentAt) })}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {t('orders.detail.invoiceNotSent')}
                </div>
              )
            )}

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
          onGenerated={() => {
            setGeneratingDoc(null)
            onDocGenerated?.()
            // Refresh the local invoice-sent status too.
            fetchDocumentSends({ orderId: order.id })
              .then(rows => {
                const inv = rows.find(s => s.document_type === 'invoice' && isSuccessfulSend(s.status))
                setInvoiceSentAt(inv ? (inv.sent_at ?? inv.created_at) : null)
              })
              .catch(() => {})
          }}
        />
      )}

      {/* Payment Method Modal — asked while completing */}
      {showPaymentModal && (
        <PaymentMethodModal
          orderNumber={order.order_number}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setShowPaymentModal(false)}
          loading={updatingStatus}
        />
      )}

      {/* Payment Method Modal — correcting it afterwards */}
      {showPaymentEdit && (
        <PaymentMethodModal
          mode="edit"
          current={order.payment_method ?? null}
          orderNumber={order.order_number}
          onConfirm={handlePaymentEdit}
          onCancel={() => setShowPaymentEdit(false)}
          loading={updatingPayment}
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
