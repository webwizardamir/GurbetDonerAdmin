import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Package,
  Loader2,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
  Ruler,
  Layers,
  ChevronDown,
  ChevronRight,
  Copy,
  Printer,
  FileText,
  TrendingUp,
  ShoppingCart,
  Euro,
  Route,
  ClipboardList,
  Tags,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSoldProducts, DATE_RANGE_KEYS, type DateRangeKey } from '../hooks/useSoldProducts'
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from '../constants/customerType'
import { formatPrice, formatQuantityWithUnit } from '../utils/format'
import SoldProductsPDF from '../components/documents/SoldProductsTemplate'
import DayCloseModal from '../components/documents/DayCloseModal'
import DeliveryRoutePanel from '../components/route/DeliveryRoutePanel'
import SortableTh from '../components/ui/SortableTh'
import ListToolbar, { type ToolbarAction } from '../components/ui/ListToolbar'
import type { FilterDef } from '../components/ui/filterTypes'
import { useTableSort } from '../hooks/useTableSort'

export default function SoldProducts() {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const {
    loading,
    error,
    items,
    summary,
    dateRange,
    dateRangeKey,
    setDateRange,
    refresh,
    cityFilter,     setCityFilter,
    customerFilter, setCustomerFilter,
    unitFilter,     setUnitFilter,
    customerTypeFilter, setCustomerTypeFilter,
    cityOptions,
    customerOptions,
    unitOptions,
    groupBy,        setGroupBy,
    groups,
  } = useSoldProducts()

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Stable {value,label} list for the city multi-select (avoids rebuilding the
  // array — and so re-filtering inside the dropdown — on every render).
  const cityFilterOptions = useMemo(
    () => cityOptions.map(c => ({ value: c, label: c })),
    [cityOptions],
  )

  // Sortable columns. Default = null so the hook's existing ordering shows
  // initially; a user click overrides. The report is sales-only now —
  // Product / Qty / Revenue.
  type SPSortKey = 'product' | 'qty' | 'revenue'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<SPSortKey>(null, 'asc')
  const sortedItems = useMemo(() => sortBy(items, {
    product:  i => i.product_name,
    qty:      i => Number(i.total_quantity) || 0,
    revenue:  i => Number(i.total_revenue) || 0,
  }), [items, sortBy])
  const toggleGroup = (key: string) => setCollapsedGroups(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const [showPDF, setShowPDF] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  const [showDayClose, setShowDayClose] = useState(false)
  // Last planned delivery-route order (order ids in sequence), so the day-close
  // modal can print invoices in route order.
  const [routeOrderedIds, setRouteOrderedIds] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Helper to format quantity with translation support
  const formatQty = (qty: number, unit: string) => formatQuantityWithUnit(qty, unit, t)

  // Copy to clipboard — product, quantity (+ revenue for owners)
  const handleCopy = () => {
    const lines = items.map(item => {
      const rev = isOwner ? `  ${formatPrice(item.total_revenue)}` : ''
      return `${item.product_name}: ${formatQty(item.total_quantity, item.unit_type)}${rev}`.trim()
    })

    const text = `${t('soldProducts.title')} (${dateRange.label})\n${'='.repeat(30)}\n${lines.join('\n')}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Print
  const handlePrint = () => {
    setShowPDF(true)
  }

  // --- Toolbar definitions --------------------------------------------------
  // Filters are declared as DATA so one definition drives both the desktop
  // inline row and the mobile filter sheet; see components/ui/filterTypes.ts.
  const filterDefs = useMemo<FilterDef[]>(() => [
    {
      id: 'dateRange',
      kind: 'select',
      label: t('soldProducts.dateRange'),
      icon: Calendar,
      value: dateRangeKey,
      // A period always has a value — no "all" entry. Without noAll the
      // renderers add an extra option and "Vandaag" appeared twice.
      noAll: true,
      allLabel: t('soldProducts.dateRange'),
      options: DATE_RANGE_KEYS.map(k => ({ value: k, label: t(`soldProducts.ranges.${k}`) })),
      onChange: v => {
        const key = (v || 'today') as DateRangeKey
        if (key === 'custom') setShowCustomDate(true)
        else { setShowCustomDate(false); setDateRange(key) }
      },
    },
    {
      id: 'city',
      kind: 'multiselect',
      label: t('soldProducts.filters.allCities'),
      icon: MapPin,
      hidden: cityOptions.length === 0,
      value: cityFilter,
      options: cityFilterOptions,
      onChange: setCityFilter,
      allLabel: t('soldProducts.filters.allCities'),
      searchPlaceholder: t('soldProducts.filters.searchCities'),
      selectAllLabel: t('soldProducts.filters.selectAll'),
    },
    {
      // Multi-select with checkboxes, exactly like the city filter — a delivery
      // round covers several customers, so picking one at a time was wrong.
      // Above SEARCH_THRESHOLD this renders the searchable checkbox list rather
      // than a chip grid, so a long customer list stays findable.
      id: 'customer',
      kind: 'multiselect',
      label: t('soldProducts.filters.allCustomers'),
      icon: Users,
      hidden: customerOptions.length === 0,
      value: customerFilter,
      searchPlaceholder: t('orders.searchCustomer'),
      selectAllLabel: t('soldProducts.filters.selectAll'),
      options: customerOptions.map(c => ({ value: c.id, label: c.name })),
      onChange: setCustomerFilter,
      allLabel: t('soldProducts.filters.allCustomers'),
    },
    {
      id: 'unit',
      kind: 'select',
      label: t('soldProducts.filters.allUnits'),
      icon: Ruler,
      hidden: unitOptions.length <= 1,
      value: unitFilter,
      options: unitOptions.map(u => ({ value: u, label: u })),
      onChange: setUnitFilter,
      allLabel: t('soldProducts.filters.allUnits'),
    },
    {
      // Multi-select (checkbox chips — only three options, so no search field):
      // a day's run is usually Horeca + Supermarkt together, and one-at-a-time
      // meant reading the report twice and adding the numbers up by hand.
      id: 'customerType',
      kind: 'multiselect',
      label: t('orders.allTypes'),
      icon: Tags,
      value: customerTypeFilter,
      options: CUSTOMER_TYPES.map(ct => ({ value: ct, label: CUSTOMER_TYPE_LABELS[ct] })),
      onChange: setCustomerTypeFilter,
      allLabel: t('orders.allTypes'),
      selectAllLabel: t('soldProducts.filters.selectAll'),
    },
    {
      id: 'groupBy',
      kind: 'segmented',
      label: t('soldProducts.groupBy.label'),
      icon: Layers,
      value: groupBy,
      options: (['none', 'city', 'customer', 'customerType'] as const).map(g => ({
        value: g, label: t(`soldProducts.groupBy.${g}`),
      })),
      onChange: v => setGroupBy(v as typeof groupBy),
    },
  ], [t, dateRangeKey, setDateRange, cityOptions, cityFilterOptions, cityFilter, setCityFilter,
      customerOptions, customerFilter, setCustomerFilter, unitOptions, unitFilter, setUnitFilter,
      customerTypeFilter, setCustomerTypeFilter, groupBy, setGroupBy])

  const noItems = items.length === 0
  const toolbarActions = useMemo<ToolbarAction[]>(() => [
    { id: 'refresh', label: t('common.refresh'), icon: RefreshCw, priority: 'iconOnly', onClick: refresh, busy: loading },
    { id: 'copy', label: t('common.copy'), icon: Copy, priority: 'iconOnly', onClick: handleCopy, disabled: noItems },
    { id: 'print', label: t('common.print'), icon: Printer, priority: 'iconOnly', onClick: handlePrint, disabled: noItems },
    { id: 'route', label: t('route.planRoute'), icon: Route, priority: 'secondary', onClick: () => setShowRoute(true), disabled: noItems },
    { id: 'dayClose', label: t('dayClose.title'), icon: ClipboardList, priority: 'secondary', onClick: () => setShowDayClose(true), disabled: noItems },
    { id: 'pdf', label: t('soldProducts.actions.exportPdf'), icon: FileText, priority: 'primary', onClick: () => setShowPDF(true), disabled: noItems },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, refresh, loading, noItems, copied])

  // Shared sticky-header cell background so the pinned <thead> stays opaque
  // while rows scroll underneath it.
  const stickyTh = 'px-6 bg-slate-50 dark:bg-slate-900'

  return (
    <div className="space-y-6">
      {/* One toolbar for both breakpoints. On mobile this collapses the seven
          stacked rows this page used to spend on chrome into a single line:
          [date range] [Filters (n)] [⋮] [PDF]. */}
      <ListToolbar
        filters={filterDefs}
        pinnedFilterId="dateRange"
        actions={toolbarActions}
        resultCount={items.length}
        resultsLoading={loading}
        renderResultLabel={n => t('common.filters.showResults', { count: n })}
      />

      {/* Custom range inputs stay inline (desktop) / directly under the bar
          (mobile) — they only appear once "Aangepast" is chosen. */}
      {showCustomDate && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base md:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-slate-400">{t('common.to')}</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base md:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => {
              if (customStart && customEnd) {
                setDateRange('custom', { start: customStart, end: customEnd })
              }
            }}
            disabled={!customStart || !customEnd}
            className="px-3 h-11 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {t('common.apply')}
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Two-column layout: summary cards (left) + table/groups (right) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: summary cards — horizontal grid on mobile, vertical stack on
            desktop. `order-last` below lg: the KPIs are a summary, not a
            control, and chrome-before-content was the complaint. Desktop keeps
            them in the left rail. */}
        {summary && (
          <div className="order-last lg:order-first grid grid-cols-2 lg:flex lg:flex-col gap-4 lg:w-56 lg:shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('soldProducts.summary.products')}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('soldProducts.summary.totalQty')}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{Math.round(summary.totalQuantity)}</p>
                </div>
              </div>
            </div>

            {/* Revenue - Owner only */}
            {isOwner && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <Euro className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('soldProducts.summary.revenue')}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(summary.totalRevenue)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right: table / grouped sections */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Products Table (flat — only shown when not grouping) */}
          {groupBy === 'none' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">
                  {t('soldProducts.noData')}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table — body scrolls, header stays pinned */}
                <div className="hidden md:block max-h-[70vh] overflow-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                        <SortableTh sortKey="product"  current={sortKey} dir={sortDir} onToggle={toggleSort} className={stickyTh}>{t('soldProducts.table.product')}</SortableTh>
                        <SortableTh sortKey="qty"      current={sortKey} dir={sortDir} onToggle={toggleSort} className={stickyTh} align="right">{t('soldProducts.table.qtySold')}</SortableTh>
                        {isOwner && (
                          <SortableTh sortKey="revenue" current={sortKey} dir={sortDir} onToggle={toggleSort} className={stickyTh} align="right">{t('soldProducts.table.revenue')}</SortableTh>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sortedItems.map(item => (
                        <tr
                          key={item.product_id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {item.product_name}
                                </p>
                                {item.product_sku && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    SKU: {item.product_sku}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {formatQty(item.total_quantity, item.unit_type)}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.order_count} order{item.order_count !== 1 ? 's' : ''}
                            </p>
                          </td>
                          {isOwner && (
                            <td className="px-6 py-4 text-right">
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {formatPrice(item.total_revenue)}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                  {sortedItems.map(item => (
                    <div key={item.product_id} className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {item.product_name}
                          </p>
                          {item.product_sku && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              SKU: {item.product_sku}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`grid ${isOwner ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-sm`}>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">{t('soldProducts.table.qtySold')}</p>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {formatQty(item.total_quantity, item.unit_type)}
                          </p>
                        </div>
                        {isOwner && (
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">{t('soldProducts.table.revenue')}</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              {formatPrice(item.total_revenue)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          )}

          {/* Grouped sections (Phase 4 — driver routing / per-customer view) */}
          {groupBy !== 'none' && !loading && (
            groups.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-center py-12">
                <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">{t('soldProducts.noData')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map(g => {
                  const collapsed = collapsedGroups.has(g.key)
                  const gridCols = isOwner
                    ? 'grid-cols-[minmax(0,1fr)_88px] sm:grid-cols-[minmax(0,1fr)_88px_104px]'
                    : 'grid-cols-[minmax(0,1fr)_88px]'
                  return (
                    <div key={g.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {/* Header — denser, totals as stacked metric chips */}
                      <button
                        onClick={() => toggleGroup(g.key)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {collapsed
                            ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{g.name}</h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">{g.items.length}</span>
                        </div>
                        <div className="flex items-center gap-5 shrink-0">
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('soldProducts.groupBy.qty')}</div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                              {g.totalQuantity.toLocaleString('nl-NL', { maximumFractionDigits: 3 })}
                            </div>
                          </div>
                          {isOwner && (
                            <div className="text-right">
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('soldProducts.groupBy.revenue')}</div>
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">{formatPrice(g.totalRevenue)}</div>
                            </div>
                          )}
                        </div>
                      </button>
                      {/* Body — grid list (no table chrome). Fixed column template
                          so qty/revenue line up across multiple open cards. */}
                      {!collapsed && (
                        <ul className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                          {g.items.map(item => (
                            <li
                              key={`${g.key}-${item.product_id}-${item.unit_type}`}
                              className={`grid items-center gap-3 px-4 py-1.5 ${gridCols}`}
                            >
                              <span className="text-sm text-slate-900 dark:text-white truncate">
                                {item.product_name}
                                {item.product_sku && (
                                  <span className="ml-2 text-xs font-mono text-slate-400 dark:text-slate-500">{item.product_sku}</span>
                                )}
                              </span>
                              <span className="text-sm tabular-nums text-right text-slate-900 dark:text-white">
                                {formatQty(item.total_quantity, item.unit_type)}
                              </span>
                              {isOwner && (
                                <span className="hidden sm:block text-sm tabular-nums text-right text-slate-600 dark:text-slate-400">
                                  {formatPrice(item.total_revenue)}
                                </span>
                              )}
                              {isOwner && (
                                <span className="sm:hidden col-span-2 -mt-1 text-xs tabular-nums text-right text-slate-500 dark:text-slate-400">
                                  {formatPrice(item.total_revenue)}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* PDF Modal */}
      {showPDF && (
        <SoldProductsPDF
          items={items}
          summary={summary}
          dateRange={dateRange}
          onClose={() => setShowPDF(false)}
          groups={groupBy !== 'none' ? groups : undefined}
          groupByLabel={groupBy !== 'none' ? t(`soldProducts.groupBy.${groupBy}`) : undefined}
        />
      )}

      {/* Delivery Route Panel */}
      {showRoute && (
        <DeliveryRoutePanel
          day={dateRange.start}
          endDay={dateRange.end}
          dayLabel={dateRange.label}
          cities={cityFilter.length ? cityFilter : undefined}
          customerType={customerTypeFilter.length ? customerTypeFilter : undefined}
          onRouteOrderChange={setRouteOrderedIds}
          onClose={() => setShowRoute(false)}
        />
      )}

      {/* Day-close batch (invoices + sold-products PDF + route handoff) */}
      {showDayClose && (
        <DayCloseModal
          dateRange={dateRange}
          customerType={customerTypeFilter.length ? customerTypeFilter : undefined}
          soldProducts={summary ? {
            items,
            summary,
            dateRange,
            groups: groupBy !== 'none' ? groups : undefined,
            groupByLabel: groupBy !== 'none' ? t(`soldProducts.groupBy.${groupBy}`) : undefined,
          } : undefined}
          onOpenRoute={() => setShowRoute(true)}
          routeOrderedIds={routeOrderedIds}
          onClose={() => setShowDayClose(false)}
        />
      )}
    </div>
  )
}
