import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Save, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { upsertPriceListItems, deletePriceListItem, type PriceListItemWithProduct, type ImportPriceListItemInput } from '../../services/priceLists'
import { useAuth } from '../../context/AuthContext'
import { UNIT_TYPES as ALL_UNITS } from '../../constants/unitTypes'
import type { UnitType } from '../../types'

const centsToEuroStr = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')
const euroStrToCents = (s: string): number | null => {
  const n = Number(s.replace(',', '.').trim())
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

interface Props {
  priceListId: string
  // All price-list items for one product (1..4 unit rows).
  productItems: PriceListItemWithProduct[]
  onClose: () => void
  onSaved: () => void
}

/**
 * Per-product unit editor for a price list. Shows ALL four unit types so the
 * owner can add prices for units that were never set, and edit the ones that
 * are. Prefills from the price list's own values (not product defaults) so
 * re-saving never clobbers an existing custom price/cost. Both price and the
 * cost-of-goods override are editable and independent — a blank field inherits
 * the product default. Cost + margin are owner-only.
 */
export default function ProductUnitsEditor({ priceListId, productItems, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const product = productItems[0]?.product
  const productId = productItems[0]?.product_id

  // Product default cost per unit: the unit-type's own cost, else the product cost.
  const defaultCostFor = (unit: UnitType): number =>
    product?.unit_prices?.find(u => u.unit_type === unit)?.cost_cents ?? product?.cost_cents ?? 0

  // Existing price-list values per unit (cents), the cost override, and the item id.
  const existingByUnit = useMemo(() => {
    const m = new Map<UnitType, { price: number | null; cost: number | null; id: string }>()
    for (const it of productItems) m.set(it.unit_type, { price: it.price_cents, cost: it.cost_cents ?? null, id: it.id })
    return m
  }, [productItems])

  const initialTax = productItems.find(it => it.tax_rate != null)?.tax_rate
  const [tax, setTax] = useState<string>(initialTax != null ? String(initialTax) : '')

  // Per-unit euro-string drafts. Prefilled from the price list when set, else blank.
  const [prices, setPrices] = useState<Record<UnitType, string>>(() => {
    const out = {} as Record<UnitType, string>
    for (const u of ALL_UNITS) {
      const cents = existingByUnit.get(u)?.price
      out[u] = cents != null ? centsToEuroStr(cents) : ''
    }
    return out
  })
  const [costs, setCosts] = useState<Record<UnitType, string>>(() => {
    const out = {} as Record<UnitType, string>
    for (const u of ALL_UNITS) {
      const cents = existingByUnit.get(u)?.cost
      out[u] = cents != null ? centsToEuroStr(cents) : ''
    }
    return out
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!productId) return
    const taxRate = tax === '' ? null : Number(tax)
    const rows: ImportPriceListItemInput[] = []
    const toDelete: string[] = []
    for (const u of ALL_UNITS) {
      const priceCents = euroStrToCents(prices[u] ?? '')
      // Cost is owner-only; a non-owner never edits it, so keep the existing value.
      const costCents = isOwner ? euroStrToCents(costs[u] ?? '') : (existingByUnit.get(u)?.cost ?? null)
      const hasPrice = priceCents != null && priceCents > 0
      const hasCost = costCents != null && costCents > 0
      const existingId = existingByUnit.get(u)?.id
      if (!hasPrice && !hasCost) {
        // Nothing set for this unit → drop it from the list if it was there.
        if (existingId) toDelete.push(existingId)
        continue
      }
      rows.push({
        product_id: productId,
        unit_type: u,
        price_cents: hasPrice ? priceCents : null,
        cost_cents: hasCost ? costCents : null,
        tax_rate: taxRate,
      })
    }
    if (rows.length === 0 && toDelete.length === 0) {
      setError(t('priceLists.units.nothingToSave'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (rows.length > 0) {
        const result = await upsertPriceListItems(priceListId, rows)
        if (result.errors.length > 0) {
          setError(result.errors.join('; '))
          return
        }
      }
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(itemId => deletePriceListItem(itemId)))
      }
      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Grid template differs by role: owner gets a cost + margin column.
  const gridCols = isOwner ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto]'

  return (
    <Modal isOpen onClose={onClose} title={product?.name ?? t('priceLists.units.title')} maxWidth="max-w-lg">
      <div className="px-6 py-4 space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        )}

        {/* VAT */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('priceLists.units.vat')}</span>
          <select
            value={tax}
            onChange={e => setTax(e.target.value)}
            className="px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">{t('priceLists.units.inheritVat')}</option>
            <option value="0">0%</option>
            <option value="9">9%</option>
            <option value="21">21%</option>
          </select>
        </div>

        {/* Unit rows */}
        <div className="space-y-1.5">
          <div className={`hidden sm:grid ${gridCols} gap-3 px-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500`}>
            <span>{t('priceLists.units.unit')}</span>
            {isOwner && <span className="text-right w-28">{t('priceLists.units.cost')}</span>}
            <span className="text-right w-28">{t('priceLists.units.price')}</span>
            {isOwner && <span className="text-right w-16">{t('priceLists.units.margin')}</span>}
          </div>
          {ALL_UNITS.map(u => {
            const defaultCost = defaultCostFor(u)
            const costOverride = euroStrToCents(costs[u] ?? '')
            const hasCostOverride = costOverride != null && costOverride > 0
            const effectiveCost = hasCostOverride ? costOverride : defaultCost
            const priceCents = euroStrToCents(prices[u] ?? '')
            const margin = priceCents != null && priceCents > 0 && effectiveCost > 0
              ? Math.round(((priceCents - effectiveCost) / priceCents) * 100)
              : null
            return (
              <div key={u} className={`grid ${gridCols} items-center gap-2 sm:gap-3 px-1`}>
                <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                  {t(`products.form.unitTypes.${u}`)}
                  {isOwner && (
                    hasCostOverride ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        {t('priceLists.units.overridden')}
                      </span>
                    ) : defaultCost > 0 ? (
                      <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {t('priceLists.units.standard')}
                      </span>
                    ) : null
                  )}
                </span>

                {/* Cost (owner-only, editable). Blank inherits the product default. */}
                {isOwner && (
                  <div className="w-20 sm:w-28 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`${t('priceLists.units.cost')} ${t(`products.form.unitTypes.${u}`)}`}
                      value={costs[u] ?? ''}
                      placeholder={defaultCost > 0 ? centsToEuroStr(defaultCost) : ''}
                      onChange={e => setCosts(prev => ({ ...prev, [u]: e.target.value }))}
                      className="w-full pl-6 pr-2 py-1 text-right text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}

                {/* Price */}
                <div className="w-20 sm:w-28 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`${t('priceLists.units.price')} ${t(`products.form.unitTypes.${u}`)}`}
                    value={prices[u] ?? ''}
                    onChange={e => setPrices(prev => ({ ...prev, [u]: e.target.value }))}
                    className="w-full pl-6 pr-2 py-1 text-right text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Margin (owner-only) */}
                {isOwner && (
                  <span className={`text-right w-12 sm:w-16 text-sm tabular-nums ${
                    margin == null ? 'text-slate-400' : margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {margin == null ? '—' : `${margin}%`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('priceLists.units.hint')}</p>
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('common.save')}
        </button>
      </div>
    </Modal>
  )
}
