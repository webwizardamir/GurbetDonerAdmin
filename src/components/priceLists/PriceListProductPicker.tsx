import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Loader2, Plus, Check, AlertCircle, ChevronDown } from 'lucide-react'
import Modal from '../ui/Modal'
import { fetchProducts } from '../../services/products'
import { upsertPriceListItems, type ImportPriceListItemInput } from '../../services/priceLists'
import type { Product, UnitType } from '../../types'
import { formatPrice } from '../../utils/format'

const ALL_UNITS: UnitType[] = ['kg', 'piece', 'zak', 'doos']
const SEARCH_LIMIT = 50

interface PriceListProductPickerProps {
  priceListId: string
  /** `${product_id}::${unit_type}` pairs already on the list (for the badge). */
  existingKeys: Set<string>
  onClose: () => void
  onAdded: () => void
}

// A unit a product can be priced in, with its current default selling price and
// cost (both in cents). Cost is shown read-only so the owner can price with
// margin insight — the picker never writes back to the product.
interface UnitRow {
  unitType: UnitType
  priceCents: number
  costCents: number
}

// Per-product editable state. `prices` holds the euro-string draft per unit so
// partial input ("12,") survives re-renders; parsed to cents on Add.
interface Draft {
  selected: boolean
  tax: '' | '0' | '9' | '21'
  prices: Partial<Record<UnitType, string>>
}

function unitRowsFor(p: Product): UnitRow[] {
  const ups = (p.unit_prices ?? []).filter(u => u.price != null)
  const rows: UnitRow[] = ups.length > 0
    ? ups.map(u => ({ unitType: u.unit_type, priceCents: u.price ?? 0, costCents: u.cost_cents ?? p.cost_cents ?? 0 }))
    : [{ unitType: p.unit_type, priceCents: p.base_price, costCents: p.cost_cents ?? 0 }]
  return rows.sort((a, b) => ALL_UNITS.indexOf(a.unitType) - ALL_UNITS.indexOf(b.unitType))
}

const centsToEuroStr = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')
const euroStrToCents = (s: string): number | null => {
  const n = Number(s.replace(',', '.').trim())
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export default function PriceListProductPicker({
  priceListId,
  existingKeys,
  onClose,
  onAdded,
}: PriceListProductPickerProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [capped, setCapped] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Map<string, Draft>>(new Map())
  const [submitting, setSubmitting] = useState(false)

  // Debounced server-side search (mirrors Orders.tsx). Empty search = first 50.
  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const rows = await fetchProducts({ search: search.trim() || undefined, limit: SEARCH_LIMIT })
        if (!active) return
        setProducts(rows)
        setCapped(rows.length >= SEARCH_LIMIT)
        setError(null)
      } catch (e) {
        if (active) setError((e as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [search])

  // Every product we've loaded across searches, so selections made before the
  // user searched away still resolve their units on Add (kept in sync with the
  // selected count below).
  const seenProducts = useRef(new Map<string, Product>())

  // Lazily seed a draft for products we haven't seen yet, preserving any edits.
  useEffect(() => {
    for (const p of products) seenProducts.current.set(p.id, p)
    setDrafts(prev => {
      let changed = false
      const next = new Map(prev)
      for (const p of products) {
        if (next.has(p.id)) continue
        const prices: Partial<Record<UnitType, string>> = {}
        for (const r of unitRowsFor(p)) prices[r.unitType] = centsToEuroStr(r.priceCents)
        next.set(p.id, { selected: false, tax: '', prices })
        changed = true
      }
      return changed ? next : prev
    })
  }, [products])

  const selectedCount = useMemo(
    () => Array.from(drafts.values()).filter(d => d.selected).length,
    [drafts],
  )

  const updateDraft = (productId: string, patch: Partial<Draft>) => {
    setDrafts(prev => {
      const next = new Map(prev)
      const cur = next.get(productId) ?? { selected: false, tax: '' as const, prices: {} }
      next.set(productId, { ...cur, ...patch })
      return next
    })
  }

  const setUnitPrice = (productId: string, unit: UnitType, value: string) => {
    setDrafts(prev => {
      const next = new Map(prev)
      const cur = next.get(productId) ?? { selected: false, tax: '' as const, prices: {} }
      next.set(productId, { ...cur, prices: { ...cur.prices, [unit]: value } })
      return next
    })
  }

  const handleAdd = async () => {
    const rows: ImportPriceListItemInput[] = []
    // Iterate the drafts (not just the current search result set) so products
    // selected under an earlier search are still included.
    for (const [productId, draft] of drafts) {
      if (!draft.selected) continue
      const p = seenProducts.current.get(productId)
      if (!p) continue
      const taxRate = draft.tax === '' ? null : Number(draft.tax)
      for (const r of unitRowsFor(p)) {
        const cents = euroStrToCents(draft.prices[r.unitType] ?? '')
        if (cents == null || cents <= 0) continue
        rows.push({ product_id: p.id, unit_type: r.unitType, price_cents: cents, tax_rate: taxRate })
      }
    }
    if (rows.length === 0) {
      setError(t('priceLists.picker.nothingToAdd'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await upsertPriceListItems(priceListId, rows)
      if (result.errors.length > 0) {
        setError(result.errors.join('; '))
        return
      }
      onAdded()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t('priceLists.picker.title')} maxWidth="max-w-5xl">
      {/* Search */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('priceLists.picker.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        {capped && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('priceLists.picker.searchHint', { count: SEARCH_LIMIT })}</p>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">{t('priceLists.picker.noResults')}</div>
        ) : (
          products.map(p => {
            const draft = drafts.get(p.id)
            const selected = draft?.selected ?? false
            const rows = unitRowsFor(p)
            const alreadyIn = rows.some(r => existingKeys.has(`${p.id}::${r.unitType}`))
            return (
              <div
                key={p.id}
                className={`rounded-xl border transition-colors ${
                  selected
                    ? 'border-green-400 dark:border-green-700 bg-green-50/40 dark:bg-green-900/10'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                {/* Product header row */}
                <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={e => updateDraft(p.id, { selected: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.product_code && (
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.product_code}</span>
                      )}
                      <span className="font-medium text-slate-900 dark:text-white truncate">{p.name}</span>
                      {alreadyIn && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                          <Check className="w-3 h-3" />{t('priceLists.picker.alreadyInList')}
                        </span>
                      )}
                    </div>
                  </div>
                  {!selected && (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </label>

                {/* Expanded editor (only when selected) */}
                {selected && draft && (
                  <div className="px-3 pb-3 pt-1 border-t border-green-200/60 dark:border-green-800/40">
                    {/* VAT selector */}
                    <div className="flex items-center gap-2 py-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t('priceLists.picker.vat')}</span>
                      <select
                        value={draft.tax}
                        onChange={e => updateDraft(p.id, { tax: e.target.value as Draft['tax'] })}
                        className="px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">{t('priceLists.picker.inheritVat')}</option>
                        <option value="0">0%</option>
                        <option value="9">9%</option>
                        <option value="21">21%</option>
                      </select>
                    </div>
                    {/* Per-unit price rows */}
                    <div className="space-y-1.5">
                      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <span>{t('priceLists.picker.unit')}</span>
                        <span className="text-right w-20">{t('priceLists.picker.cost')}</span>
                        <span className="text-right w-28">{t('priceLists.picker.price')}</span>
                        <span className="text-right w-16">{t('priceLists.picker.margin')}</span>
                      </div>
                      {rows.map(r => {
                        const draftStr = draft.prices[r.unitType] ?? ''
                        const priceCents = euroStrToCents(draftStr)
                        // No margin when the price is empty or the product has no
                        // recorded cost (cost 0 = unknown, not a 100% margin).
                        const margin = priceCents != null && priceCents > 0 && r.costCents > 0
                          ? Math.round(((priceCents - r.costCents) / priceCents) * 100)
                          : null
                        return (
                          <div key={r.unitType} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 sm:gap-3 px-1">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {t(`products.form.unitTypes.${r.unitType}`)}
                            </span>
                            <span className="text-right w-14 sm:w-20 text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                              {formatPrice(r.costCents)}
                            </span>
                            <div className="w-20 sm:w-28 relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label={`${t('priceLists.picker.price')} ${t(`products.form.unitTypes.${r.unitType}`)}`}
                                value={draftStr}
                                onChange={e => setUnitPrice(p.id, r.unitType, e.target.value)}
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
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 sm:flex-none min-w-0 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleAdd}
            disabled={submitting || selectedCount === 0}
            className="flex-1 sm:flex-none min-w-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('priceLists.picker.add', { count: selectedCount })}
          </button>
        </div>
      </div>
    </Modal>
  )
}
