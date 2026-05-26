import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, RotateCcw, AlertCircle, Info } from 'lucide-react'
import Modal from '../ui/Modal'
import type { OrderWithItems } from '../../services/orders'
import { createOrderRefund, fetchRefundedQuantities } from '../../services/orders'
import { formatPrice, formatQuantity } from '../../utils/format'

interface RefundModalProps {
  order: OrderWithItems
  onClose: () => void
  onRefunded: (result: { fully_refunded: boolean }) => void
}

// Accept both "1.5" and Dutch "1,5"; clamp NaN to 0.
function parseQty(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export default function RefundModal({ order, onClose, onRefunded }: RefundModalProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [alreadyRefunded, setAlreadyRefunded] = useState<Record<string, number>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().split('T')[0])
  const [restoreStock, setRestoreStock] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchRefundedQuantities(order.id)
      .then(map => { if (!cancelled) setAlreadyRefunded(map) })
      .catch(e => { if (!cancelled) setError((e as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [order.id])

  // Remaining refundable units per line.
  const remainingById = useMemo(() => {
    const out: Record<string, number> = {}
    for (const item of order.items) {
      out[item.id] = Math.max(0, item.quantity - (alreadyRefunded[item.id] ?? 0))
    }
    return out
  }, [order.items, alreadyRefunded])

  const anyRefundable = useMemo(
    () => order.items.some(i => remainingById[i.id] > 0.0005),
    [order.items, remainingById]
  )

  // Gross (incl. VAT) refund for a line, proportional to its recorded total.
  const lineRefund = (itemId: string): number => {
    const item = order.items.find(i => i.id === itemId)
    if (!item || item.quantity <= 0) return 0
    const q = Math.min(parseQty(quantities[itemId] ?? ''), remainingById[itemId])
    if (q <= 0) return 0
    return Math.round(item.line_total * (q / item.quantity))
  }

  const totalRefund = useMemo(
    () => order.items.reduce((sum, i) => sum + lineRefund(i.id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order.items, quantities, remainingById]
  )

  const selectedCount = useMemo(
    () => order.items.filter(i => parseQty(quantities[i.id] ?? '') > 0).length,
    [order.items, quantities]
  )

  const setFullRefund = () => {
    const next: Record<string, string> = {}
    for (const item of order.items) {
      const rem = remainingById[item.id]
      if (rem > 0.0005) next[item.id] = String(rem)
    }
    setQuantities(next)
  }

  const handleSubmit = async () => {
    setError(null)
    const items = order.items
      .map(i => ({ order_item_id: i.id, quantity: Math.min(parseQty(quantities[i.id] ?? ''), remainingById[i.id]) }))
      .filter(i => i.quantity > 0)

    if (items.length === 0) {
      setError(t('orders.refund.noneSelected'))
      return
    }

    setSubmitting(true)
    try {
      const result = await createOrderRefund({
        orderId: order.id,
        reason: reason.trim() || undefined,
        refundDate,
        restoreStock,
        items,
      })
      onRefunded({ fully_refunded: result.fully_refunded })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('orders.refund.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{order.order_number}</p>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {!anyRefundable ? (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-300">{t('orders.refund.nothingToRefund')}</p>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('orders.orderItems')} ({order.items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={setFullRefund}
                    className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    {t('orders.refund.fullRefund')}
                  </button>
                </div>

                <div className="space-y-2">
                  {order.items.map(item => {
                    const remaining = remainingById[item.id]
                    const refunded = alreadyRefunded[item.id] ?? 0
                    const disabled = remaining <= 0.0005
                    const isKg = item.unit_type === 'kg'
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          disabled
                            ? 'border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 opacity-60'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{item.product_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatPrice(item.unit_price)} · {t('orders.refund.ordered')} {formatQuantity(item.quantity)}
                            {refunded > 0 && (
                              <> · {t('orders.refund.alreadyRefunded')} {formatQuantity(refunded)}</>
                            )}
                          </p>
                        </div>
                        {disabled ? (
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">
                            {t('orders.refund.lineFullyRefunded')}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <input
                                type="number"
                                min={0}
                                max={remaining}
                                step={isKg ? 'any' : 1}
                                value={quantities[item.id] ?? ''}
                                onChange={e => setQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                                placeholder="0"
                                className="w-20 px-2 py-1.5 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {t('orders.refund.max')} {formatQuantity(remaining)}
                              </p>
                            </div>
                            <span className="w-20 text-right text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                              {formatPrice(lineRefund(item.id))}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Reason + date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('orders.refund.date')}
                    </label>
                    <input
                      type="date"
                      value={refundDate}
                      onChange={e => setRefundDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('orders.refund.reason')}
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder={t('orders.refund.reasonPlaceholder')}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Restore stock */}
                <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreStock}
                    onChange={e => setRestoreStock(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">
                      {t('orders.refund.restoreStock')}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {t('orders.refund.restoreStockHint')}
                    </span>
                  </span>
                </label>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            {anyRefundable && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('orders.refund.total')}
                </span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  -{formatPrice(totalRefund)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !anyRefundable || selectedCount === 0 || totalRefund <= 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {submitting ? t('orders.refund.submitting') : t('orders.refund.submit')}
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
