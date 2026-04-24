// Order items list for the order form.
// Displays current order line items with quantity controls, unit type selection, and summary totals.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Trash2, Package } from 'lucide-react'
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
}: {
  valueCents: number
  onCommit: (cents: number) => void
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
      className="w-20 text-sm px-2 py-0.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500"
    />
  )
}

export default function OrderItemsList({
  items,
  subtotal,
  taxTotal,
  total,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onChangeUnitType,
  onSetPrice,
  onSetNotes,
}: OrderItemsListProps) {
  const { t } = useTranslation()

  const getUnitTypeLabel = (unitType: UnitType): string => {
    return t(`products.form.unitTypes.${unitType}`)
  }

  return (
    <div className="space-y-6">
      {/* Order Items */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('orders.orderItems')} ({items.length})
        </label>
        {items.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
            <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('orders.form.searchAndAdd')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.map(item => (
              <div
                key={item.lineId}
                className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Unit type selector */}
                      {item.availableUnitTypes.length > 1 ? (
                        <select
                          value={item.selectedUnitType}
                          onChange={e => onChangeUnitType(item.lineId, e.target.value as UnitType)}
                          className="text-sm px-2 py-0.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                        >
                          {item.availableUnitTypes.map(ut => (
                            <option key={ut.unitType} value={ut.unitType}>
                              {getUnitTypeLabel(ut.unitType)} - {formatPrice(ut.price)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {getUnitTypeLabel(item.selectedUnitType)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {onSetPrice ? (
                        <PriceInput
                          valueCents={item.unit_price}
                          onCommit={cents => onSetPrice(item.lineId, cents)}
                        />
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">{formatPrice(item.unit_price)}</span>
                      )}
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        x {item.quantity} = {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    </div>
                    {onSetNotes && (
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={e => onSetNotes(item.lineId, e.target.value)}
                        placeholder={t('orders.form.linePlaceholder')}
                        className="w-full mt-2 text-sm px-2 py-1 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateQuantity(item.lineId, -1)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      title="-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0
                        if (val > 0) onSetQuantity(item.lineId, val)
                      }}
                      onBlur={e => {
                        const val = parseFloat(e.target.value) || 0
                        if (val <= 0) onRemoveItem(item.lineId)
                      }}
                      className="w-16 text-center font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <button
                      onClick={() => onUpdateQuantity(item.lineId, 1)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      title="+1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.lineId)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Summary */}
      {items.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{t('orders.subtotal')}</span>
            <span className="text-slate-900 dark:text-white">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{t('orders.tax')}</span>
            <span className="text-slate-900 dark:text-white">{formatPrice(taxTotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-slate-200 dark:border-slate-600">
            <span className="text-slate-900 dark:text-white">{t('orders.total')}</span>
            <span className="text-green-600 dark:text-green-400">{formatPrice(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
