// Order items list for the order form.
// Displays current order line items with quantity controls, unit type selection, and summary totals.

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
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={(item.unit_price / 100).toFixed(2)}
                          onChange={e => onSetPrice(item.lineId, Math.round(parseFloat(e.target.value || '0') * 100))}
                          className="w-20 text-sm px-2 py-0.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">{formatPrice(item.unit_price)}</span>
                      )}
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        x {item.quantity} = {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    </div>
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
