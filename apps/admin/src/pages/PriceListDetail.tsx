import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, Loader2, AlertCircle, Upload, FileDown, Trash2, Package, Pencil, Plus,
  Filter, Ruler,
} from 'lucide-react'
import {
  fetchPriceListById,
  fetchPriceListItems,
  deletePriceListItem,
  resolveItemCostCents,
  type PriceListItemWithProduct,
} from '../services/priceLists'
import type { UnitType } from '../types'
import { downloadCurrentPriceList } from '../utils/priceListTemplate'
import PriceListImport from '../components/priceLists/PriceListImport'
import PriceListProductPicker from '../components/priceLists/PriceListProductPicker'
import ProductUnitsEditor from '../components/priceLists/ProductUnitsEditor'
import PriceListCustomers from '../components/priceLists/PriceListCustomers'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import SortableTh from '../components/ui/SortableTh'
import ExportMenu from '../components/ui/ExportMenu'
import ListToolbar from '../components/ui/ListToolbar'
import type { FilterDef } from '../components/ui/filterTypes'
import {
  priceListItemExportColumns,
  priceListWideExportColumns,
  withoutOwnerOnlyColumns,
  marginPct,
} from '../utils/export'
import { UNIT_TYPES, isUnitType, unitTypeUiLabel } from '../constants/unitTypes'
import { useTableSort } from '../hooks/useTableSort'
import { useUrlListState } from '../hooks/useUrlListState'
import { useAuth } from '../context/AuthContext'
import type { PriceList } from '../types'
import { formatPrice } from '../utils/format'

export default function PriceListDetail() {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [list, setList] = useState<PriceList | null>(null)
  const [items, setItems] = useState<PriceListItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  // Product id whose unit-prices are being edited (opens ProductUnitsEditor).
  const [unitsEditProductId, setUnitsEditProductId] = useState<string | null>(null)

  // (product_id::unit_type) pairs already on the list — drives the picker's badge.
  const existingKeys = useMemo(
    () => new Set(items.map(it => `${it.product_id}::${it.unit_type}`)),
    [items],
  )

  // Search + unit-type filter live in the URL, so "send me the kg prices for
  // Italy 2026" is a link. One-directional per the useUrlListState contract:
  // parsed once here, written only from the change handlers below.
  const [urlInit, setUrlState] = useUrlListState({ q: '', units: [] as string[] })
  const [search, setSearch] = useState(urlInit.q)
  // Sanitised on read — ?units=banana would otherwise become a dead filter.
  const [unitFilter, setUnitFilter] = useState<UnitType[]>(
    () => (urlInit.units as string[]).filter(isUnitType),
  )
  const onSearchChange = (v: string) => { setSearch(v); setUrlState({ q: v }) }
  const onUnitFilterChange = (v: string[]) => {
    setUnitFilter(v.filter(isUnitType))
    setUrlState({ units: v })
  }

  // One row per product: a product priced in several unit types shows as a
  // single line you open (modal) to edit all its units — not one row per unit.
  //
  // 🚨 `items` is EVERY unit; `visibleItems` is the filtered subset.
  // The distinction is load-bearing. Delete targets the whole product and the
  // unit editor prefills from all four units, so both must read `items` — a
  // group built from filtered items would silently delete only the visible unit
  // while the dialog names the product, and would let the editor drop a hidden
  // unit on save. Only the pills and the export read `visibleItems`.
  interface ProductGroup {
    productId: string
    product: PriceListItemWithProduct['product'] | undefined
    items: PriceListItemWithProduct[]
    visibleItems: PriceListItemWithProduct[]
  }
  const groups = useMemo<ProductGroup[]>(() => {
    const m = new Map<string, ProductGroup>()
    for (const it of items) {
      let g = m.get(it.product_id)
      if (!g) { g = { productId: it.product_id, product: it.product, items: [], visibleItems: [] }; m.set(it.product_id, g) }
      g.items.push(it)
      if (unitFilter.length === 0 || unitFilter.includes(it.unit_type)) g.visibleItems.push(it)
    }
    const q = search.trim().toLowerCase()
    return Array.from(m.values()).filter(g => {
      if (g.visibleItems.length === 0) return false
      if (!q) return true
      return (g.product?.name ?? '').toLowerCase().includes(q)
        || (g.product?.product_code ?? '').toLowerCase().includes(q)
    })
  }, [items, unitFilter, search])

  // Unit types actually present on this list, in canonical order.
  const unitOptions = useMemo(() => {
    const s = new Set<string>()
    for (const it of items) s.add(it.unit_type)
    return UNIT_TYPES.filter(u => s.has(u))
  }, [items])

  const exportColumns = useMemo(
    () => (isOwner ? priceListItemExportColumns : withoutOwnerOnlyColumns(priceListItemExportColumns)),
    [isOwner],
  )
  const wideExportColumns = useMemo(
    () => (isOwner ? priceListWideExportColumns : withoutOwnerOnlyColumns(priceListWideExportColumns)),
    [isOwner],
  )

  // Sort the grouped rows by product code / name.
  type PLIKey = 'product_code' | 'product_name'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<PLIKey>('product_name', 'asc')
  const sortedGroups = useMemo(() => sortBy(groups, {
    product_code: g => g.product?.product_code ?? '',
    product_name: g => g.product?.name ?? '',
  }), [groups, sortBy])

  // Effective price for one (product, unit) row: list override → the unit's
  // catalog default → the product's base price.
  const effectivePrice = (it: PriceListItemWithProduct) => {
    const unit = it.product?.unit_prices?.find(u => u.unit_type === it.unit_type)
    const defaultPrice = unit?.price ?? it.product?.base_price ?? null
    return { unit, defaultPrice, price: it.price_cents ?? defaultPrice }
  }

  // "Per eenheid" shape: one row per (product, unit_type). Built from
  // sortedGroups' visibleItems, so the file matches the on-screen order AND the
  // active filter exactly. Cost columns are added for the owner only;
  // `cost_source` mirrors resolveItemCostCents' branch order exactly — keep the
  // two in sync or the label lies about where the cost came from.
  const exportRows = useMemo(() => sortedGroups.flatMap(g => g.visibleItems.map(it => {
    const { unit, defaultPrice, price } = effectivePrice(it)
    const row: Record<string, unknown> = {
      product_code:  it.product?.product_code ?? '',
      product_name:  it.product?.name ?? '',
      unit_type:     it.unit_type,
      list_price:    it.price_cents,
      default_price: defaultPrice,
      price_source:  it.price_cents != null ? 'Lijst' : 'Standaard',
      tax_rate:      it.tax_rate,
    }
    if (!isOwner) return row
    const cost = resolveItemCostCents(it)
    row.cost_effective = cost || null
    row.cost_source =
      it.cost_cents != null            ? 'Lijst-override'
      : unit?.cost_cents != null       ? 'Eenheid'
      : it.product?.cost_cents != null ? 'Product'
      : 'Onbekend'
    row.margin_pct = marginPct(price, cost)
    return row
  })), [sortedGroups, isOwner])

  // "Per product" shape: one row per product, one price column per unit — the
  // same grain the table shows. tax_rate is stored per unit row but has a single
  // column here: first non-null wins, matching downloadCurrentPriceList.
  const wideExportRows = useMemo(() => sortedGroups.map(g => {
    const row: Record<string, unknown> = {
      product_code: g.product?.product_code ?? '',
      product_name: g.product?.name ?? '',
      tax_rate: g.visibleItems.find(it => it.tax_rate != null)?.tax_rate ?? null,
    }
    for (const u of UNIT_TYPES) {
      const it = g.visibleItems.find(i => i.unit_type === u)
      row[`price_${u}`] = it ? effectivePrice(it).price : null
      if (isOwner) row[`cost_${u}`] = it ? (resolveItemCostCents(it) || null) : null
    }
    return row
  }), [sortedGroups, isOwner])

  // Counts for the header line and the export notice. Denominators come from the
  // UNFILTERED items, so "8 van 12" is meaningful.
  const totalProductCount = useMemo(
    () => new Set(items.map(it => it.product_id)).size,
    [items],
  )
  const filterActive = unitFilter.length > 0 || search.trim() !== ''

  const filterDefs = useMemo<FilterDef[]>(() => [
    {
      id: 'units',
      kind: 'multiselect',
      label: t('priceLists.detail.filters.allUnits'),
      icon: Ruler,
      hidden: unitOptions.length <= 1,
      value: unitFilter,
      options: unitOptions.map(u => ({ value: u, label: unitTypeUiLabel(u, t) })),
      onChange: onUnitFilterChange,
      allLabel: t('priceLists.detail.filters.allUnits'),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, unitOptions, unitFilter])

  // All price-list items for the product being unit-edited.
  const unitsEditItems = useMemo(
    () => (unitsEditProductId ? items.filter(it => it.product_id === unitsEditProductId) : []),
    [items, unitsEditProductId],
  )

  // Delete confirmation targets a whole product (all its unit rows).
  const [deleteProductTarget, setDeleteProductTarget] = useState<ProductGroup | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [l, it] = await Promise.all([
        fetchPriceListById(id),
        fetchPriceListItems(id),
      ])
      setList(l)
      setItems(it)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const confirmDeleteProduct = async () => {
    if (!deleteProductTarget) return
    try {
      // Remove every unit row for this product.
      await Promise.all(deleteProductTarget.items.map(it => deletePriceListItem(it.id)))
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeleteProductTarget(null)
    }
  }

  const handleDownloadTemplate = async () => {
    if (downloadingTemplate || !list) return
    setDownloadingTemplate(true)
    try {
      await downloadCurrentPriceList(list.id, list.name)
    } finally {
      setDownloadingTemplate(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!list) {
    return (
      <div className="space-y-4">
        <Link to="/price-lists" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
          <ChevronLeft className="w-4 h-4" />
          {t('priceLists.backToList')}
        </Link>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-slate-600 dark:text-slate-400">{t('priceLists.notFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link to="/price-lists" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
        <ChevronLeft className="w-4 h-4" />
        {t('priceLists.backToList')}
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{list.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              list.is_active
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {list.is_active ? t('priceLists.active') : t('priceLists.inactive')}
            </span>
          </div>
          {list.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{list.description}</p>
          )}
          {/* When filtered, show the numerator/denominator so nobody exports a
              narrowed list believing it is the whole one. */}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            {filterActive ? (
              <span className="text-green-700 dark:text-green-400 font-medium">
                {t('priceLists.detail.filteredCount', {
                  products: sortedGroups.length,
                  totalProducts: totalProductCount,
                  prices: exportRows.length,
                  totalPrices: items.length,
                })}
              </span>
            ) : (
              t('priceLists.detail.itemsCount', { count: items.length })
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            {downloadingTemplate
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileDown className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('priceLists.detail.downloadTemplate')}</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{t('priceLists.detail.importItems')}</span>
          </button>
          <ExportMenu
            variants={[
              {
                key: 'per-unit',
                label: t('priceLists.detail.exportShape.perUnit'),
                description: t('priceLists.detail.exportShape.perUnitHint'),
                columns: exportColumns as never,
                getAllData: async () => exportRows,
              },
              {
                key: 'per-product',
                label: t('priceLists.detail.exportShape.perProduct'),
                description: t('priceLists.detail.exportShape.perProductHint'),
                columns: wideExportColumns as never,
                getAllData: async () => wideExportRows,
              },
            ]}
            totalCount={exportRows.length}
            filterNotice={filterActive ? t('priceLists.detail.exportFiltered', {
              products: sortedGroups.length,
              totalProducts: totalProductCount,
              prices: exportRows.length,
              totalPrices: items.length,
            }) : undefined}
            filename={`prijslijst-${(list?.name ?? 'lijst').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}`}
            pdfTitle={`Prijslijst · ${list?.name ?? ''}`}
            storageKey="price-list-items"
            size="sm"
          />
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('priceLists.detail.addProducts')}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Search + unit filter. Only rendered once there is something to narrow. */}
      {items.length > 0 && (
        <ListToolbar
          search={{
            value: search,
            onChange: onSearchChange,
            placeholder: t('priceLists.detail.searchPlaceholder'),
          }}
          filters={filterDefs}
        />
      )}

      {/* Items table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {items.length > 0 && sortedGroups.length === 0 ? (
          // Filtered to nothing — a DIFFERENT state from "no items". Offering
          // "Product toevoegen" to someone who just filtered to zak is the wrong
          // verb; the useful action is clearing the filter.
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Filter className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">{t('priceLists.detail.noMatchingItems')}</p>
            <button
              onClick={() => { onSearchChange(''); onUnitFilterChange([]) }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('priceLists.detail.clearFilters')}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Package className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">{t('priceLists.detail.noItems')}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setShowPicker(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('priceLists.detail.addProducts')}
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {t('priceLists.detail.importItems')}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <SortableTh sortKey="product_code" current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('priceLists.detail.columns.productId')}</SortableTh>
                <SortableTh sortKey="product_name" current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('priceLists.detail.columns.productName')}</SortableTh>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.detail.columns.units')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.detail.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedGroups.map(g => (
                <tr
                  key={g.productId}
                  onClick={() => g.product && setUnitsEditProductId(g.productId)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-sm text-slate-900 dark:text-white whitespace-nowrap">
                    {g.product?.product_code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                    {g.product?.name ?? t('priceLists.detail.deletedProduct')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {/* visibleItems, not items: the pill grid is a cell-for-cell
                          preview of what the "Per eenheid" export will contain. */}
                      {g.visibleItems.map(it => (
                        <span key={it.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          <span className="text-slate-500 dark:text-slate-400">{t(`products.form.unitTypes.${it.unit_type as UnitType}`)}</span>
                          {it.price_cents != null
                            ? <span className="font-medium tabular-nums">{formatPrice(it.price_cents)}</span>
                            : <span className="italic text-slate-400 dark:text-slate-500">{t('priceLists.detail.inheritPrice')}</span>}
                          {it.tax_rate != null && <span className="text-slate-400 dark:text-slate-500">· {it.tax_rate}%</span>}
                          {isOwner && it.cost_cents != null && (
                            <span
                              className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
                              title={t('priceLists.detail.costOverride')}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {t('priceLists.detail.costOverrideShort')}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => g.product && setUnitsEditProductId(g.productId)}
                        disabled={!g.product}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        title={t('common.edit')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteProductTarget(g)}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Customers assigned to this list */}
      <PriceListCustomers priceListId={list.id} />

      {showImport && (
        <PriceListImport
          priceListId={list.id}
          priceListName={list.name}
          onClose={() => setShowImport(false)}
          onComplete={() => { setShowImport(false); void load() }}
        />
      )}

      {showPicker && (
        <PriceListProductPicker
          priceListId={list.id}
          existingKeys={existingKeys}
          onClose={() => setShowPicker(false)}
          onAdded={() => { void load() }}
        />
      )}

      {unitsEditProductId && unitsEditItems.length > 0 && (
        <ProductUnitsEditor
          priceListId={list.id}
          productItems={unitsEditItems}
          onClose={() => setUnitsEditProductId(null)}
          onSaved={() => { void load() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteProductTarget}
        title={t('common.delete')}
        message={t('priceLists.detail.confirmDeleteItem', { name: deleteProductTarget?.product?.name ?? '' })}
        variant="danger"
        confirmLabel={t('common.delete')}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setDeleteProductTarget(null)}
      />
    </div>
  )
}
