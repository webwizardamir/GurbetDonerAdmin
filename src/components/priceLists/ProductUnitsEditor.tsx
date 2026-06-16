import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Save, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import { upsertPriceListItems, type PriceListItemWithProduct } from '../../services/priceLists'
import type { UnitType } from '../../types'
import { formatPrice } from '../../utils/format'

const ALL_UNITS: UnitType[] = ['kg', 'piece', 'zak', 'doos']

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
 * re-saving never clobbers an existing custom price. Margin shown per unit.
 */
export default function ProductUnitsEditor({ priceListId, productItems, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const product = productItems[0]?.product
  const productId = productItems[0]?.product_id

  // Cost per unit: the product's matching unit cost, else the product cost.
  const costFor = (unit: UnitType): number =>
    product?.unit_prices?.find(u => u.unit_type === unit)?.cost_cents ?? product?.cost_cents ?? 0

  // Existing price-list value per unit (cents) and the shared tax (first item).
  const existingByUnit = useMemo(() => {
    const m = new Map<UnitType, number>()
    for (const it of productItems) m.set(it.unit_type, it.price_cents)
    return m
  }, [productItems])

  const initialTax = productItems.find(it => it.tax_rate != null)?.tax_rate
  const [tax, setTax] = useState<string>(initialTax != null ? String(initialTax) : '')

  // Per-unit euro-string draft. Prefilled from the price list when set, else blank.
  const [prices, setPrices] = useState<Record<UnitType, string>>(() => {
    const out = {} as Record<UnitType, string>
    for (const u of ALL_UNITS) {
      const cents = existingByUnit.get(u)
      out[u] = cents != null ? centsToEuroStr(cents) : ''
    }
    return out
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!productId) return
    const taxRate = tax === '' ? null : Number(tax)
    const rows = ALL_UNITS.flatMap(u => {
      const cents = euroStrToCents(prices[u] ?? '')
      if (cents == null || cents <= 0) return []
      return [{ product_id: productId, unit_type: u, price_cents: cents, tax_rate: taxRate }]
    })
    if (rows.length === 0) {
      setError(t('priceLists.units.nothingToSave'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await upsertPriceListItems(priceListId, rows)
      if (result.errors.length > 0) {
        setError(result.errors.join('; '))
        return
      }
      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

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
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>{t('priceLists.units.unit')}</span>
            <span className="text-right w-20">{t('priceLists.units.cost')}</span>
            <span className="text-right w-28">{t('priceLists.units.price')}</span>
            <span className="text-right w-16">{t('priceLists.units.margin')}</span>
          </div>
          {ALL_UNITS.map(u => {
            const cost = costFor(u)
            const cents = euroStrToCents(prices[u] ?? '')
            const margin = cents != null && cents > 0 && cost > 0
              ? Math.round(((cents - cost) / cents) * 100)
              : null
            return (
              <div key={u} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 sm:gap-3 px-1">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {t(`products.form.unitTypes.${u}`)}
                </span>
                <span className="text-right w-14 sm:w-20 text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  {cost > 0 ? formatPrice(cost) : '—'}
                </span>
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
                <span className={`text-right w-12 sm:w-16 text-sm tabular-nums ${
                  margin == null ? 'text-slate-400' : margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {margin == null ? '—' : `${margin}%`}
                </span>
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
