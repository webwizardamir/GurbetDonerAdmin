import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, StickyNote, Package, Info } from 'lucide-react'
import Modal from '../ui/Modal'
import { updateOrderNotes } from '../../services/orders'
import type { OrderWithItems } from '../../services/orders'

interface OrderNotesModalProps {
  order: OrderWithItems
  onClose: () => void
  onSaved: () => void
}

/**
 * Safe notes editor — edits the per-product note (the "notitie" that prints on
 * documents) plus the order-level delivery/internal notes, without touching
 * quantities, prices or the item set. Usable in EVERY order status, including
 * cancelled/refunded where the full editor would corrupt stock.
 */
export default function OrderNotesModal({ order, onClose, onSaved }: OrderNotesModalProps) {
  const { t } = useTranslation()
  const [deliveryNotes, setDeliveryNotes] = useState(order.delivery_notes || '')
  const [internalNotes, setInternalNotes] = useState(order.internal_notes || '')
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries((order.items || []).map(i => [i.id, i.notes || '']))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // Only send line notes that actually changed
      const changedItemNotes = (order.items || [])
        .filter(i => (itemNotes[i.id] ?? '') !== (i.notes || ''))
        .map(i => ({ id: i.id, notes: itemNotes[i.id] ?? '' }))

      await updateOrderNotes(
        order.id,
        {
          ...(deliveryNotes !== (order.delivery_notes || '') ? { delivery_notes: deliveryNotes } : {}),
          ...(internalNotes !== (order.internal_notes || '') ? { internal_notes: internalNotes } : {}),
        },
        changedItemNotes
      )
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('orders.notes.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidth="max-w-xl"
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <StickyNote className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('orders.notes.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{order.order_number}</p>
          </div>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Per-product notes — these print on documents */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-slate-400" />
            <h3 className="font-medium text-slate-900 dark:text-white">{t('orders.notes.productNotes')}</h3>
          </div>
          <div className="flex items-start gap-2 p-3 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">{t('orders.notes.productNotesHint')}</p>
          </div>
          {(order.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.notes.noItems')}</p>
          ) : (
            <div className="space-y-2">
              {order.items!.map(item => (
                <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-1.5 truncate" title={item.product_name}>
                    {item.product_name}
                  </p>
                  <input
                    type="text"
                    value={itemNotes[item.id] ?? ''}
                    onChange={e => setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder={t('orders.form.linePlaceholder')}
                    className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order-level notes */}
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('orders.form.deliveryNotes')}
            </label>
            <textarea
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              rows={2}
              placeholder={t('orders.form.deliveryPlaceholder')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('orders.form.internalNotes')}
            </label>
            <textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              rows={2}
              placeholder={t('orders.form.internalPlaceholder')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:bg-green-400"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
          {saving ? t('orders.notes.saving') : t('common.save')}
        </button>
      </div>
    </Modal>
  )
}
