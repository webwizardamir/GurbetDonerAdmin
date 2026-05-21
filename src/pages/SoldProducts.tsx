import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Package,
  Loader2,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
  Tag,
  Ruler,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  Copy,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle,
  MinusCircle,
  TrendingUp,
  ShoppingCart,
  Euro,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSoldProducts, type DateRangeKey } from '../hooks/useSoldProducts'
import { getStockStatus, getSuggestedRefill, type SoldProductItem } from '../services/soldProducts'
import { formatPrice, formatQuantityWithUnit } from '../utils/format'
import SoldProductsPDF from '../components/documents/SoldProductsTemplate'
import SortableTh from '../components/ui/SortableTh'
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
    categoryFilter, setCategoryFilter,
    unitFilter,     setUnitFilter,
    cityOptions,
    customerOptions,
    categoryOptions,
    unitOptions,
    groupBy,        setGroupBy,
    groups,
  } = useSoldProducts()

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Phase 6: sortable columns. Default = null so the hook's existing
  // low-stock-first → qty-desc ordering shows initially. User click overrides.
  type SPSortKey = 'product' | 'category' | 'qty' | 'revenue' | 'stock' | 'status' | 'refill'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<SPSortKey>(null, 'asc')
  const sortedItems = useMemo(() => sortBy(items, {
    product:  i => i.product_name,
    category: i => i.category_name ?? '',
    qty:      i => Number(i.total_quantity) || 0,
    revenue:  i => Number(i.total_revenue) || 0,
    stock:    i => i.track_stock ? (i.current_stock ?? 0) : -Infinity,
    status:   i => i.track_stock ? (i.current_stock ?? 0) / Math.max(1, i.total_quantity) : 999,
    refill:   i => {
      if (!i.track_stock) return -Infinity
      const target = i.total_quantity * 3
      return Math.max(0, target - (i.current_stock ?? 0))
    },
  }), [items, sortBy])
  const toggleGroup = (key: string) => setCollapsedGroups(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const [showPDF, setShowPDF] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Helper to format quantity with translation support
  const formatQty = (qty: number, unit: string) => formatQuantityWithUnit(qty, unit, t)

  // Copy to clipboard
  const handleCopy = () => {
    const lines = items.map(item => {
      const stockText = item.track_stock ? `Stock: ${item.current_stock}` : ''
      return `${item.product_name}: ${formatQty(item.total_quantity, item.unit_type)} ${stockText}`.trim()
    })

    const text = `Sold Products (${dateRange.label})\n${'='.repeat(30)}\n${lines.join('\n')}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Print
  const handlePrint = () => {
    setShowPDF(true)
  }

  // Stock status icon
  const StockStatusIcon = ({ item }: { item: SoldProductItem }) => {
    const status = getStockStatus(item)

    if (status.status === 'not_tracked') {
      return <MinusCircle className="w-4 h-4 text-slate-400" />
    }
    if (status.status === 'critical') {
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
    if (status.status === 'low') {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range Selector */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={dateRangeKey}
              onChange={(e) => {
                const key = e.target.value as DateRangeKey
                if (key === 'custom') {
                  setShowCustomDate(true)
                } else {
                  setShowCustomDate(false)
                  setDateRange(key)
                }
              }}
              className="pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
            >
              <option value="yesterday">{t('soldProducts.yesterday')}</option>
              <option value="today">{t('soldProducts.today')}</option>
              <option value="last7Days">{t('analytics.last7Days')}</option>
              <option value="thisWeek">{t('soldProducts.thisWeek')}</option>
              <option value="lastWeek">{t('analytics.last7Days')}</option>
              <option value="custom">{t('soldProducts.custom')}</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {showCustomDate && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-slate-400">{t('common.to')}</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={() => {
                  if (customStart && customEnd) {
                    setDateRange('custom', { start: customStart, end: customEnd })
                  }
                }}
                disabled={!customStart || !customEnd}
                className="px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {t('common.apply')}
              </button>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            disabled={items.length === 0}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Copy to clipboard"
          >
            <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-slate-600 dark:text-slate-400'}`} />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            disabled={items.length === 0}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Print / Export PDF"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          {/* PDF Export */}
          <button
            onClick={() => setShowPDF(true)}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {t('soldProducts.actions.exportPdf')}
          </button>
        </div>
      </div>

      {/* Filters row (Phase 4) — appears once data has loaded */}
      {(cityOptions.length > 0 || customerOptions.length > 0 || categoryOptions.length > 0 || unitOptions.length > 1) && (
        <div className="flex items-center gap-2 flex-wrap">
          {cityOptions.length > 0 && (
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
              >
                <option value="">{t('soldProducts.filters.allCities')}</option>
                {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {customerOptions.length > 0 && (
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer max-w-[220px]"
              >
                <option value="">{t('soldProducts.filters.allCustomers')}</option>
                {customerOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {categoryOptions.length > 0 && (
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
              >
                <option value="">{t('soldProducts.filters.allCategories')}</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {unitOptions.length > 1 && (
            <div className="relative">
              <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={unitFilter}
                onChange={e => setUnitFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
              >
                <option value="">{t('soldProducts.filters.allUnits')}</option>
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
          {(cityFilter || customerFilter || categoryFilter || unitFilter) && (
            <button
              onClick={() => {
                setCityFilter('')
                setCustomerFilter('')
                setCategoryFilter('')
                setUnitFilter('')
              }}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              {t('soldProducts.filters.clear')}
            </button>
          )}
          <div className="flex-1" />
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <span className="px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {t('soldProducts.groupBy.label')}
            </span>
            {(['none', 'city', 'customer'] as const).map((g, i) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  groupBy === g
                    ? 'bg-green-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                } ${i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}
              >
                {t(`soldProducts.groupBy.${g}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className={`grid grid-cols-2 ${isOwner ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
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

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${summary.lowStockCount > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                {summary.lowStockCount > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('soldProducts.summary.lowStock')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.lowStockCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                    <SortableTh sortKey="product"  current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-6">{t('soldProducts.table.product')}</SortableTh>
                    <SortableTh sortKey="category" current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-6">{t('soldProducts.table.category')}</SortableTh>
                    <SortableTh sortKey="qty"      current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-6" align="right">{t('soldProducts.table.qtySold')}</SortableTh>
                    {isOwner && (
                      <SortableTh sortKey="revenue" current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-6" align="right">{t('soldProducts.table.revenue')}</SortableTh>
                    )}
                    <SortableTh sortKey="stock"  current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-6" align="right">{t('soldProducts.table.currentStock')}</SortableTh>
                    <SortableTh sortKey="status" current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-6" align="center">{t('common.status')}</SortableTh>
                    <SortableTh sortKey="refill" current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-6" align="right">{t('soldProducts.table.suggestedRefill')}</SortableTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sortedItems.map(item => {
                    const status = getStockStatus(item)
                    const refill = getSuggestedRefill(item)

                    return (
                      <tr
                        key={item.product_id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                          status.status === 'critical' ? 'bg-red-50/50 dark:bg-red-900/10' :
                          status.status === 'low' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                        }`}
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
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {item.category_name || '—'}
                          </span>
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
                        <td className="px-6 py-4 text-right">
                          {item.track_stock ? (
                            <span className="font-medium text-slate-900 dark:text-white">
                              {formatQty(item.current_stock || 0, item.unit_type)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <StockStatusIcon item={item} />
                            <span className={`text-xs font-medium ${
                              status.status === 'critical' ? 'text-red-600 dark:text-red-400' :
                              status.status === 'low' ? 'text-amber-600 dark:text-amber-400' :
                              status.status === 'ok' ? 'text-green-600 dark:text-green-400' :
                              'text-slate-400'
                            }`}>
                              {status.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {refill !== null && refill > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                              +{formatQty(refill, item.unit_type)}
                            </span>
                          ) : refill === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
              {sortedItems.map(item => {
                const status = getStockStatus(item)
                const refill = getSuggestedRefill(item)

                return (
                  <div
                    key={item.product_id}
                    className={`p-4 ${
                      status.status === 'critical' ? 'bg-red-50/50 dark:bg-red-900/10' :
                      status.status === 'low' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {item.product_name}
                          </p>
                          {item.category_name && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.category_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <StockStatusIcon item={item} />
                      </div>
                    </div>

                    <div className={`grid ${isOwner ? 'grid-cols-2' : 'grid-cols-3'} gap-2 text-sm`}>
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
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">{t('soldProducts.table.currentStock')}</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.track_stock ? formatQty(item.current_stock || 0, item.unit_type) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">{t('soldProducts.table.suggestedRefill')}</p>
                        <p className="font-medium text-blue-600 dark:text-blue-400">
                          {refill !== null && refill > 0 ? `+${formatQty(refill, item.unit_type)}` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
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
              return (
                <div key={g.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <button
                    onClick={() => toggleGroup(g.key)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {collapsed
                        ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{g.name}</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        · {t('soldProducts.groupBy.itemCount', { count: g.items.length })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      <span className="text-slate-600 dark:text-slate-400 tabular-nums">
                        {t('soldProducts.groupBy.qty')}: <span className="font-medium text-slate-900 dark:text-white">{g.totalQuantity.toLocaleString('nl-NL', { maximumFractionDigits: 3 })}</span>
                      </span>
                      {isOwner && (
                        <span className="text-slate-600 dark:text-slate-400 tabular-nums">
                          {t('soldProducts.groupBy.revenue')}: <span className="font-medium text-slate-900 dark:text-white">{formatPrice(g.totalRevenue)}</span>
                        </span>
                      )}
                    </div>
                  </button>
                  {!collapsed && (
                    <div className="border-t border-slate-100 dark:border-slate-700 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('soldProducts.table.product')}</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('soldProducts.table.category')}</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('soldProducts.table.qtySold')}</th>
                            {isOwner && (
                              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('soldProducts.summary.revenue')}</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {g.items.map(item => (
                            <tr key={`${g.key}-${item.product_id}-${item.unit_type}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-4 py-2 text-slate-900 dark:text-white">
                                {item.product_name}
                                {item.product_sku && (
                                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-500 font-mono">{item.product_sku}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{item.category_name || '—'}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-white">
                                {formatQty(item.total_quantity, item.unit_type)}
                              </td>
                              {isOwner && (
                                <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-white">{formatPrice(item.total_revenue)}</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Info about non-tracked products */}
      {summary && summary.totalProducts > summary.trackedProducts && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">{summary.totalProducts - summary.trackedProducts}</span> product{summary.totalProducts - summary.trackedProducts !== 1 ? 's' : ''} sold without stock tracking enabled.
            Stock status and refill suggestions are only shown for tracked products.
          </p>
        </div>
      )}

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
    </div>
  )
}
