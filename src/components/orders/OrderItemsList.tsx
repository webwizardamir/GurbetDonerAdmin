// Order items list for the order form.
// Dense table on md+, compact cards on mobile. No internal scroll cap — the
// outer page provides the scroll context, so 15 rows are visible without
// scrolling-within-scrolling.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Trash2, Package, MessageSquare, X } from 'lucide-react'
import type { UnitType } from '../../types'
import { formatPrice } from '../../utils/format'

export interface OrderLineItem {
  lineId: string
  product: {
    id: string
    name: string
  }
  selectedUnitType: UnitType
  quantity: number
  unit_price: number
  tax_rate: number
  notes?: string
  availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
}

interface OrderItemsListProps {
  items: OrderLineItem[]
  subtotal: number
  taxTotal: number
  total: number
  reverseCharge?: boolean
  onUpdateQuantity: (lineId: string, delta: number) => void
  onSetQuantity: (lineId: string, quantity: number) => void
  onRemoveItem: (lineId: string) => void
  onChangeUnitType: (lineId: string, unitType: UnitType) => void
  onSetPrice?: (lineId: string, priceInCents: number) => void
  onSetNotes?: (lineId: string, notes: string) => void
}

// Price input that keeps the user's typed string while focused and only
// commits the parsed cents value on blur / Enter. Prevents the parent from
// reformatting mid-edit (the source of the "can't edit decimals" bug).
function PriceInput({
  valueCents,
  onCommit,
  className = '',
}: {
  valueCents: number
  onCommit: (cents: number) => void
  className?: string
}) {
  const formatted = (valueCents / 100).toFixed(2)
  const [draft, setDraft] = useState(formatted)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(formatted)
  }, [formatted, focused])

  const commit = () => {
    const normalized = draft.replace(',', '.').trim()
    const n = parseFloat(normalized)
    if (Number.isFinite(n) && n >= 0) {
      onCommit(Math.round(n * 100))
    } else {
      setDraft(formatted)
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onFocus={e => { setFocused(true); e.target.select() }}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { setFocused(false); commit() }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.currentTarget.blur() }
        if (e.key === 'Escape') { setDraft(formatted); e.currentTarget.blur() }
      }}
      className={`text-sm px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-right text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500 ${className}`}
    />
  )
}

// Quantity input that keeps the user's typed string while focused so the field
// can be fully cleared (empty / intermediate states) without snapping back to
// the old value. Commits the parsed number on every valid keystroke and on
// blur; blurring while empty / ≤ 0 removes the line. Mirrors PriceInput above.
function QtyInput({
  quantity,
  onCommit,
  onRemove,
  className = '',
}: {
  quantity: number
  onCommit: (qty: number) => void
  onRemove: () => void
  className?: string
}) {
  const [draft, setDraft] = useState(String(quantity))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(quantity))
  }, [quantity, focused])

  // text + inputMode=decimal (not type=number) so a comma never makes the
  // browser report an empty value, and the field can be fully cleared mid-edit.
  // We commit off the draft string on both change and blur — never off the raw
  // DOM value — so a valid value is never dropped or the line wrongly removed.
  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : String(quantity)}
      onFocus={e => { setFocused(true); setDraft(String(quantity)); e.target.select() }}
      onChange={e => {
        const raw = e.target.value
        setDraft(raw)
        const val = parseFloat(raw.replace(',', '.'))
        if (Number.isFinite(val) && val > 0) onCommit(val)
      }}
      onBlur={() => {
        setFocused(false)
        const val = parseFloat(draft.replace(',', '.'))
        if (!Number.isFinite(val) || val <= 0) onRemove()
      }}
      className={className}
    />
  )
}

// Notes icon button. Coloured when notes exist, neutral when empty.
// Click opens the shared notes editor modal (managed at the list level).
function NotesButton({
  value,
  onClick,
  title,
}: {
  value: string
  onClick: () => void
  title: string
}) {
  const hasNotes = (value || '').trim().length > 0
  return (
    <button
      type="button"
      onClick={onClick}
      title={hasNotes ? value : title}
      className={
        hasNotes
          ? 'p-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded'
          : 'p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded'
      }
    >
      <MessageSquare className="w-4 h-4" />
    </button>
  )
}

// Modal editor for line notes. Opens when a row's notes button is clicked.
function NotesEditorModal({
  productName,
  value,
  placeholder,
  onSave,
  onClose,
}: {
  productName: string
  value: string
  placeholder: string
  onSave: (v: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('orders.form.linePlaceholder')}</p>
            <p className="font-medium text-slate-900 dark:text-white truncate">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={5}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
          />
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => { onSave(draft); onClose() }}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OrderItemsList({
  items,
  subtotal,
  taxTotal,
  total,
  reverseCharge,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onChangeUnitType,
  onSetPrice,
  onSetNotes,
}: OrderItemsListProps) {
  const { t } = useTranslation()
  const [notesEditorLineId, setNotesEditorLineId] = useState<string | null>(null)

  const getUnitTypeLabel = (unitType: UnitType): string => {
    return t(`products.form.unitTypes.${unitType}`)
  }

  const editingItem = notesEditorLineId
    ? items.find(i => i.lineId === notesEditorLineId) || null
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('orders.orderItems')} ({items.length})
        </label>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
          <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('orders.form.searchAndAdd')}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: dense table */}
          <div className="hidden md:block bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-2 text-left w-8">#</th>
                  <th className="px-2 py-2 text-left">{t('orders.itemsTable.product')}</th>
                  <th className="px-2 py-2 text-left">{t('orders.itemsTable.unit')}</th>
                  <th className="px-2 py-2 text-right w-24">{t('orders.itemsTable.price')}</th>
                  <th className="px-2 py-2 text-center w-28">{t('orders.itemsTable.qty')}</th>
                  <th className="px-2 py-2 text-right w-24">{t('orders.itemsTable.total')}</th>
                  <th className="px-2 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item, idx) => {
                  const lineTotal = item.unit_price * item.quantity
                  return (
                    <tr key={item.lineId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-2 py-2 text-slate-400 dark:text-slate-500 align-middle">{idx + 1}</td>
                      <td className="px-2 py-2 align-middle">
                        <div className="font-medium text-slate-900 dark:text-white truncate" title={item.product.name}>
                          {item.product.name}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        {item.availableUnitTypes.length > 1 ? (
                          <select
                            value={item.selectedUnitType}
                            onChange={e => onChangeUnitType(item.lineId, e.target.value as UnitType)}
                            className="text-sm px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                          >
                            {item.availableUnitTypes.map(ut => (
                              <option key={ut.unitType} value={ut.unitType}>
                                {getUnitTypeLabel(ut.unitType)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            {getUnitTypeLabel(item.selectedUnitType)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-middle text-right">
                        {onSetPrice ? (
                          <PriceInput
                            valueCents={item.unit_price}
                            onCommit={cents => onSetPrice(item.lineId, cents)}
                            className="w-20"
                          />
                        ) : (
                          <span className="text-slate-700 dark:text-slate-200">{formatPrice(item.unit_price)}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.lineId, -1)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                            title="-1"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <QtyInput
                            quantity={item.quantity}
                            onCommit={qty => onSetQuantity(item.lineId, qty)}
                            onRemove={() => onRemoveItem(item.lineId)}
                            className="w-14 text-center text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.lineId, 1)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                            title="+1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle text-right font-medium text-slate-900 dark:text-white">
                        {formatPrice(lineTotal)}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center justify-end gap-0.5">
                          {onSetNotes && (
                            <NotesButton
                              value={item.notes || ''}
                              onClick={() => setNotesEditorLineId(item.lineId)}
                              title={t('orders.form.linePlaceholder')}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.lineId)}
                            title={t('common.delete')}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: compact cards */}
          <div className="md:hidden space-y-2">
            {items.map((item, idx) => {
              const lineTotal = item.unit_price * item.quantity
              return (
                <div key={item.lineId} className="p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{item.product.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.lineId)}
                      className="p-1.5 -m-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.availableUnitTypes.length > 1 ? (
                      <select
                        value={item.selectedUnitType}
                        onChange={e => onChangeUnitType(item.lineId, e.target.value as UnitType)}
                        className="text-sm px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                      >
                        {item.availableUnitTypes.map(ut => (
                          <option key={ut.unitType} value={ut.unitType}>
                            {getUnitTypeLabel(ut.unitType)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {getUnitTypeLabel(item.selectedUnitType)}
                      </span>
                    )}
                    {onSetPrice ? (
                      <PriceInput
                        valueCents={item.unit_price}
                        onCommit={cents => onSetPrice(item.lineId, cents)}
                        className="w-20"
                      />
                    ) : (
                      <span className="text-sm text-slate-700 dark:text-slate-200">{formatPrice(item.unit_price)}</span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.lineId, -1)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <QtyInput
                        quantity={item.quantity}
                        onCommit={qty => onSetQuantity(item.lineId, qty)}
                        onRemove={() => onRemoveItem(item.lineId)}
                        className="w-14 text-center text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.lineId, 1)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{t('orders.itemsTable.total')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(lineTotal)}</span>
                  </div>

                  {onSetNotes && (
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={e => onSetNotes(item.lineId, e.target.value)}
                      placeholder={t('orders.form.linePlaceholder')}
                      className="w-full text-sm px-2 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Sticky thin totals strip — sits at the bottom of the items panel */}
          <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            <div className="flex items-center justify-end gap-6 px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">{t('orders.subtotal')}</span>
                <span className="text-slate-900 dark:text-white font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {t('orders.tax')}
                  {reverseCharge && (
                    <span className="ml-1 text-xs text-slate-400">({t('orders.vat.reverseChargeSuffix')})</span>
                  )}
                </span>
                <span className="text-slate-900 dark:text-white font-medium">{formatPrice(taxTotal)}</span>
              </div>
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{t('orders.total')}</span>
                <span className="text-green-600 dark:text-green-400 font-bold text-base">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {editingItem && onSetNotes && (
        <NotesEditorModal
          productName={editingItem.product.name}
          value={editingItem.notes || ''}
          placeholder={t('orders.form.linePlaceholder')}
          onSave={v => onSetNotes(editingItem.lineId, v)}
          onClose={() => setNotesEditorLineId(null)}
        />
      )}
    </div>
  )
}
