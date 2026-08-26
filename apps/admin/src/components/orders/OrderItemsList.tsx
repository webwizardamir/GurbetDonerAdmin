// Order items list for the order form.
// Dense table on md+, compact cards on mobile. No internal scroll cap — the
// outer page provides the scroll context, so 15 rows are visible without
// scrolling-within-scrolling.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Trash2, Package, MessageSquare, X } from 'lucide-react'
import type { UnitType } from '../../types'
import { formatPrice, formatPercent, profitClass, formatQuantity } from '../../utils/format'
import { resolveDiscountCents, type DiscountType } from '../../utils/discount'
import { isCatchWeight, formatPieceBreakdown } from '../../utils/catchWeight'
import { useAuth } from '../../context/AuthContext'

export interface OrderLineItem {
  lineId: string
  product: {
    id: string
    name: string
  }
  selectedUnitType: UnitType
  /** Quantity in the line's own unit — kilos on a catch-weight line. */
  quantity: number
  // Catch weight (00117): pieces counted, kilos priced. Set together or not at
  // all; a filled pieceWeightKg is what makes the Aantal field mean pieces.
  pieceCount?: number | null
  pieceWeightKg?: number | null
  unit_price: number
  tax_rate: number
  // Per-unit cost of goods, supplied by the parent for owner-only display.
  cost_cents?: number
  notes?: string
  // Per-line discount input. percentage -> basis points (10% = 1000); fixed -> cents.
  discount_type?: DiscountType | null
  discount_value?: number | null
  availableUnitTypes: { unitType: UnitType; price: number; isDefault: boolean }[]
}

interface OrderItemsListProps {
  items: OrderLineItem[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  reverseCharge?: boolean
  orderDiscountType?: DiscountType | null
  orderDiscountValue?: number | null
  onUpdateQuantity: (lineId: string, delta: number) => void
  /** Commits the Aantal field: the PIECE COUNT on a catch-weight line, the raw quantity otherwise. */
  onSetQuantity: (lineId: string, quantity: number) => void
  /** Set/clear kg-per-piece. Absent = the Stuk (kg) column is not offered. */
  onSetPieceWeight?: (lineId: string, weightKg: number | null) => void
  onRemoveItem: (lineId: string) => void
  onChangeUnitType: (lineId: string, unitType: UnitType) => void
  onSetPrice?: (lineId: string, priceInCents: number) => void
  /** Whether a remembered customer price applies to this product+unit. */
  isRemembered?: (productId: string, unitType: UnitType) => boolean
  /** Forget the remembered customer price for this product+unit. */
  onForgetPrice?: (productId: string, unitType: UnitType) => void
  onSetNotes?: (lineId: string, notes: string) => void
  onSetLineDiscount?: (lineId: string, type: DiscountType, value: number | null) => void
  onSetOrderDiscount?: (type: DiscountType, value: number | null) => void
  /** Flat shipping fee (Verzendkosten), ex-BTW cents. null/0 = none. */
  shipping?: number | null
  onSetShipping?: (cents: number | null) => void
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

// Discount input: a compact %/€ toggle + numeric value. Mirrors PriceInput's
// keep-draft-while-focused / commit-on-blur pattern. The stored `value` is
// basis points when type='percentage' (10% = 1000) and cents when type='fixed';
// both display as the human number divided by 100, so "10" -> 1000 either way.
// An empty value clears the discount (committed as null).
function DiscountInput({
  type,
  value,
  onCommit,
  className = '',
}: {
  type: DiscountType | null | undefined
  value: number | null | undefined
  onCommit: (type: DiscountType, value: number | null) => void
  className?: string
}) {
  const effType: DiscountType = type || 'percentage'
  const display = value == null
    ? ''
    : effType === 'percentage'
      ? String(value / 100)
      : (value / 100).toFixed(2)
  const [draft, setDraft] = useState(display)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(display)
  }, [display, focused])

  // Parse the draft to a stored integer (basis points / cents). '' -> null.
  const parseDraft = (): number | null => {
    const normalized = draft.replace(',', '.').trim()
    if (normalized === '') return null
    const n = parseFloat(normalized)
    if (!Number.isFinite(n) || n < 0) return null
    return Math.round(n * 100)
  }

  const commit = () => {
    const normalized = draft.replace(',', '.').trim()
    if (normalized === '') { onCommit(effType, null); return }
    const stored = parseDraft()
    if (stored == null) { setDraft(display); return }
    onCommit(effType, stored)
  }

  const switchType = () => {
    const next: DiscountType = effType === 'percentage' ? 'fixed' : 'percentage'
    onCommit(next, parseDraft())
  }

  const { t } = useTranslation()
  return (
    <div className={`inline-flex items-stretch rounded border border-slate-200 dark:border-slate-600 overflow-hidden focus-within:ring-1 focus-within:ring-green-500 ${className}`}>
      <button
        type="button"
        onClick={switchType}
        aria-label={t('orders.form.discountToggle')}
        title={t('orders.form.discountToggle')}
        className="px-2 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 focus:outline-none"
      >
        {effType === 'percentage' ? '%' : '€'}
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder="0"
        aria-label={t('orders.itemsTable.discount')}
        onFocus={e => { setFocused(true); e.target.select() }}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setFocused(false); commit() }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.currentTarget.blur() }
          if (e.key === 'Escape') { setDraft(display); e.currentTarget.blur() }
        }}
        className="w-full min-w-0 text-sm px-1.5 py-1 bg-white dark:bg-slate-700 text-right text-slate-700 dark:text-slate-200 focus:outline-none"
      />
    </div>
  )
}

// Flat shipping-fee input (euros -> cents). A fixed €-amount (no %/€ toggle);
// mirrors DiscountInput's chrome + keep-draft-while-focused so decimals type
// cleanly. Empty commits null (-> 0 -> the Verzendkosten row is hidden).
function ShippingInput({
  valueCents,
  onCommit,
  className = '',
}: {
  valueCents: number | null | undefined
  onCommit: (cents: number | null) => void
  className?: string
}) {
  const { t } = useTranslation()
  const display = valueCents == null || valueCents === 0 ? '' : (valueCents / 100).toFixed(2)
  const [draft, setDraft] = useState(display)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(display)
  }, [display, focused])

  const commit = () => {
    const normalized = draft.replace(',', '.').trim()
    if (normalized === '') { onCommit(null); return }
    const n = parseFloat(normalized)
    if (Number.isFinite(n) && n >= 0) onCommit(Math.round(n * 100))
    else setDraft(display)
  }

  return (
    <div className={`inline-flex items-stretch rounded border border-slate-200 dark:border-slate-600 overflow-hidden focus-within:ring-1 focus-within:ring-green-500 ${className}`}>
      <span aria-hidden="true" className="px-2 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 select-none">€</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder="0,00"
        aria-label={t('orders.form.shipping')}
        onFocus={e => { setFocused(true); e.target.select() }}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setFocused(false); commit() }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.currentTarget.blur() }
          if (e.key === 'Escape') { setDraft(display); e.currentTarget.blur() }
        }}
        className="w-full min-w-0 text-sm px-1.5 py-1 bg-white dark:bg-slate-700 text-right text-slate-700 dark:text-slate-200 focus:outline-none"
      />
    </div>
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

// Kg-per-piece input for catch-weight lines ("stuk (kg)" on the customer's own
// sheet). Empty is the meaningful default: it means this line is an ordinary
// one, so the field shows a placeholder rather than a 0. Mirrors PriceInput's
// keep-draft-while-focused / commit-on-blur so decimals type cleanly.
function PieceWeightInput({
  weightKg,
  onCommit,
  className = '',
}: {
  weightKg: number | null | undefined
  onCommit: (kg: number | null) => void
  className?: string
}) {
  const display = weightKg == null || weightKg <= 0 ? '' : String(weightKg)
  const [draft, setDraft] = useState(display)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(display)
  }, [display, focused])

  const commit = () => {
    const normalized = draft.replace(',', '.').trim()
    if (normalized === '') { onCommit(null); return }
    const n = parseFloat(normalized)
    if (Number.isFinite(n) && n > 0) onCommit(Math.round(n * 1000) / 1000)
    // Unparseable input reverts and commits NOTHING. Only a deliberately
    // EMPTIED field clears the catch weight — a typo must not silently restate
    // the line as an ordinary kg line.
    else setDraft(display)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder="-"
      onFocus={e => { setFocused(true); e.target.select() }}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { setFocused(false); commit() }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.currentTarget.blur() }
        if (e.key === 'Escape') { setDraft(display); e.currentTarget.blur() }
      }}
      className={`text-sm px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-right text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-500 ${className}`}
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

// Small badge shown when a remembered customer price is applied to a line.
function RememberedBadge({ onForget }: { onForget?: () => void }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-[11px] font-medium text-amber-700 dark:text-amber-400" title={t('orders.form.rememberedPriceHint')}>
      {t('orders.form.rememberedPrice')}
      {onForget && (
        <button type="button" onClick={onForget} title={t('orders.form.forgetPrice')} aria-label={t('orders.form.forgetPrice')}
          className="hover:text-amber-900 dark:hover:text-amber-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-500">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

export default function OrderItemsList({
  items,
  subtotal,
  discountTotal,
  taxTotal,
  total,
  reverseCharge,
  orderDiscountType,
  orderDiscountValue,
  onUpdateQuantity,
  onSetQuantity,
  onSetPieceWeight,
  onRemoveItem,
  onChangeUnitType,
  onSetPrice,
  isRemembered,
  onForgetPrice,
  onSetNotes,
  onSetLineDiscount,
  onSetOrderDiscount,
  shipping,
  onSetShipping,
}: OrderItemsListProps) {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const [notesEditorLineId, setNotesEditorLineId] = useState<string | null>(null)

  // Owner-only order cost + profit for the live totals strip.
  // `subtotal` sums lineGross (PRE-discount), so the ex-VAT post-discount
  // revenue is subtotal − discountTotal — the same base the per-line badges
  // use, which keeps the strip equal to the sum of the lines above it.
  const orderCost = items.reduce((s, i) => s + (i.cost_cents ?? 0) * i.quantity, 0)
  const orderRevenue = subtotal - discountTotal
  const orderProfitCents = orderRevenue - orderCost
  const orderMargin = orderRevenue > 0 ? (orderProfitCents / orderRevenue) * 100 : 0

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
          <div className="hidden lg:block bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-2 text-left w-8">#</th>
                  <th className="px-2 py-2 text-left max-w-[200px]">{t('orders.itemsTable.product')}</th>
                  <th className="px-2 py-2 text-left">{t('orders.itemsTable.unit')}</th>
                  <th className="px-2 py-2 text-right w-32">{t('orders.itemsTable.price')}</th>
                  {onSetPieceWeight && (
                    <th className="px-2 py-2 text-right w-24">{t('orders.itemsTable.pieceWeight')}</th>
                  )}
                  <th className="px-2 py-2 text-center w-28">{t('orders.itemsTable.qty')}</th>
                  {onSetLineDiscount && (
                    <th className="px-2 py-2 text-right w-28">{t('orders.itemsTable.discount')}</th>
                  )}
                  <th className="px-2 py-2 text-right w-24">{t('orders.itemsTable.total')}</th>
                  <th className="px-2 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item, idx) => {
                  const catchWeight = isCatchWeight(item)
                  const lineGross = item.unit_price * item.quantity
                  const lineDiscount = resolveDiscountCents(item.discount_type, item.discount_value, Math.round(lineGross))
                  const lineTotal = lineGross - lineDiscount
                  return (
                    <tr key={item.lineId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-2 py-2 text-slate-400 dark:text-slate-500 align-middle">{idx + 1}</td>
                      <td className="px-2 py-2 align-middle">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={item.product.name}>
                          {item.product.name}
                        </div>
                        {isRemembered?.(item.product.id, item.selectedUnitType) && (
                          <RememberedBadge onForget={onForgetPrice ? () => onForgetPrice(item.product.id, item.selectedUnitType) : undefined} />
                        )}
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
                        {isOwner && (item.cost_cents ?? 0) > 0 && (() => {
                          // Per-unit difference + total line profit (lineTotal is ex-VAT).
                          const perUnit = item.unit_price - (item.cost_cents ?? 0)
                          const lp = lineTotal - (item.cost_cents ?? 0) * item.quantity
                          const lm = lineTotal > 0 ? (lp / lineTotal) * 100 : 0
                          return (
                            <>
                              <div
                                className="mt-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums"
                                title={`${t('orders.itemsTable.cogShort')} ${formatPrice(item.cost_cents!)} × ${item.quantity} = ${formatPrice((item.cost_cents ?? 0) * item.quantity)}`}
                              >
                                {t('orders.itemsTable.cogShort')} {formatPrice(item.cost_cents!)}{' '}
                                <span className={`font-medium ${profitClass(perUnit)}`}>{perUnit >= 0 ? '+' : ''}{formatPrice(perUnit)}</span>
                              </div>
                              <div className={`text-[10px] leading-tight font-medium whitespace-nowrap tabular-nums ${profitClass(lp)}`}>
                                {t('orders.profit.label')} {formatPrice(lp)} · {formatPercent(lm)}
                              </div>
                            </>
                          )
                        })()}
                      </td>
                      {onSetPieceWeight && (
                        <td className="px-2 py-2 align-middle text-right">
                          {/* Only offered on kg lines: the derived number IS the
                              kilos, so a piece weight on a doos line has nothing
                              to multiply into (the DB CHECK agrees). */}
                          {item.selectedUnitType === 'kg' ? (
                            <PieceWeightInput
                              weightKg={item.pieceWeightKg}
                              onCommit={kg => onSetPieceWeight(item.lineId, kg)}
                              className="w-16"
                            />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                      )}
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
                            quantity={catchWeight ? item.pieceCount! : item.quantity}
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
                        {/* The kilos the line is actually priced on. Shown
                            because the Aantal field above now counts pieces, and
                            the total would otherwise look unexplainable. */}
                        {catchWeight && (
                          <div className="mt-0.5 text-center text-[10px] leading-tight text-slate-500 dark:text-slate-400 tabular-nums">
                            = {formatQuantity(item.quantity)} kg
                          </div>
                        )}
                      </td>
                      {onSetLineDiscount && (
                        <td className="px-2 py-2 align-middle text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <DiscountInput
                              type={item.discount_type}
                              value={item.discount_value}
                              onCommit={(type, value) => onSetLineDiscount(item.lineId, type, value)}
                              className="w-24"
                            />
                            {lineDiscount > 0 && (
                              <span className="text-xs text-red-600 dark:text-red-400">-{formatPrice(lineDiscount)}</span>
                            )}
                          </div>
                        </td>
                      )}
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
          </div>

          {/* Mobile: compact cards */}
          <div className="lg:hidden space-y-2">
            {items.map((item, idx) => {
              const catchWeight = isCatchWeight(item)
              const lineGross = item.unit_price * item.quantity
              const lineDiscount = resolveDiscountCents(item.discount_type, item.discount_value, Math.round(lineGross))
              const lineTotal = lineGross - lineDiscount
              return (
                <div key={item.lineId} className="p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{item.product.name}</p>
                      {isRemembered?.(item.product.id, item.selectedUnitType) && (
                        <RememberedBadge onForget={onForgetPrice ? () => onForgetPrice(item.product.id, item.selectedUnitType) : undefined} />
                      )}
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
                        quantity={catchWeight ? item.pieceCount! : item.quantity}
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

                  {onSetPieceWeight && item.selectedUnitType === 'kg' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{t('orders.itemsTable.pieceWeight')}</span>
                      <div className="flex items-center gap-2">
                        {catchWeight && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {formatPieceBreakdown(item)} = {formatQuantity(item.quantity)} kg
                          </span>
                        )}
                        <PieceWeightInput
                          weightKg={item.pieceWeightKg}
                          onCommit={kg => onSetPieceWeight(item.lineId, kg)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  )}

                  {onSetLineDiscount && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{t('orders.itemsTable.discount')}</span>
                      <div className="flex items-center gap-2">
                        {lineDiscount > 0 && (
                          <span className="text-xs text-red-600 dark:text-red-400">-{formatPrice(lineDiscount)}</span>
                        )}
                        <DiscountInput
                          type={item.discount_type}
                          value={item.discount_value}
                          onCommit={(type, value) => onSetLineDiscount(item.lineId, type, value)}
                          className="w-24"
                        />
                      </div>
                    </div>
                  )}

                  {isOwner && (item.cost_cents ?? 0) > 0 && (() => {
                    // Per-unit difference + total line profit (lineTotal is ex-VAT).
                    const perUnit = item.unit_price - (item.cost_cents ?? 0)
                    const lp = lineTotal - (item.cost_cents ?? 0) * item.quantity
                    const lm = lineTotal > 0 ? (lp / lineTotal) * 100 : 0
                    return (
                      <>
                        <div className="flex items-center justify-between text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                          <span>
                            {t('orders.itemsTable.cogShort')} {formatPrice(item.cost_cents!)}{' '}
                            <span className={`font-medium ${profitClass(perUnit)}`}>({perUnit >= 0 ? '+' : ''}{formatPrice(perUnit)})</span>
                            {' '}× {item.quantity}
                          </span>
                          <span>{formatPrice((item.cost_cents ?? 0) * item.quantity)}</span>
                        </div>
                        <div className={`flex items-center justify-between text-[11px] leading-tight font-medium ${profitClass(lp)}`}>
                          <span>{t('orders.profit.label')}</span>
                          <span>{formatPrice(lp)} · {formatPercent(lm)}</span>
                        </div>
                      </>
                    )
                  })()}
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
            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">{t('orders.subtotal')}</span>
                <span className="text-slate-900 dark:text-white font-medium">{formatPrice(subtotal)}</span>
              </div>
              {onSetOrderDiscount && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">{t('orders.form.orderDiscount')}</span>
                  <DiscountInput
                    type={orderDiscountType}
                    value={orderDiscountValue}
                    onCommit={(type, value) => onSetOrderDiscount(type, value)}
                    className="w-24"
                  />
                </div>
              )}
              {onSetShipping && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">{t('orders.form.shipping')}</span>
                  <ShippingInput
                    valueCents={shipping}
                    onCommit={onSetShipping}
                    className="w-24"
                  />
                </div>
              )}
              {discountTotal > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">{t('orders.detail.discount')}</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">-{formatPrice(discountTotal)}</span>
                </div>
              )}
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
              {/* OWNER ONLY — cost of goods + profit for the order being built.
                  Own divider, smaller than the customer-facing Totaal, so it
                  reads as internal. `subtotal` here is PRE-discount (it sums
                  lineGross), hence subtotal − discountTotal for the ex-VAT
                  post-discount base — the same base the per-line badges use. */}
              {isOwner && orderCost > 0 && (
                <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">{t('orders.profit.cogTotal')}</span>
                    <span className="tabular-nums text-slate-700 dark:text-slate-300 font-medium">{formatPrice(orderCost)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">{t('orders.profit.label')}</span>
                    <span className={`tabular-nums font-semibold ${profitClass(orderProfitCents)}`}>
                      {formatPrice(orderProfitCents)}
                      <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                        {t('orders.profit.marginShort', { pct: formatPercent(orderMargin).replace('%', '') })}
                      </span>
                    </span>
                  </span>
                </div>
              )}
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
