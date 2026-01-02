import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Package,
  Loader2,
  RefreshCw,
  Calendar,
  Copy,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle,
  MinusCircle,
  TrendingUp,
  ShoppingCart,
  DollarSign,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSoldProducts, type DateRangeKey } from '../hooks/useSoldProducts'
import { getStockStatus, getSuggestedRefill, type SoldProductItem } from '../services/soldProducts'
import { formatPrice, formatQuantityWithUnit } from '../utils/format'
import SoldProductsPDF from '../components/documents/SoldProductsTemplate'

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
  } = useSoldProducts()

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
              className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
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
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={() => {
                  if (customStart && customEnd) {
                    setDateRange('custom', { start: customStart, end: customEnd })
                  }
                }}
                disabled={!customStart || !customEnd}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Apply
              </button>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            disabled={items.length === 0}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Copy to clipboard"
          >
            <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-slate-600 dark:text-slate-400'}`} />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            disabled={items.length === 0}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Print / Export PDF"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          {/* PDF Export */}
          <button
            onClick={() => setShowPDF(true)}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {t('soldProducts.actions.exportPdf')}
          </button>
        </div>
      </div>

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
                  <DollarSign className="w-5 h-5 text-violet-600 dark:text-violet-400" />
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

      {/* Products Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {t('soldProducts.table.product')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {t('soldProducts.table.category')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {t('soldProducts.table.qtySold')}
                    </th>
                    {isOwner && (
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {t('soldProducts.table.revenue')}
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {t('soldProducts.table.currentStock')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {t('soldProducts.table.suggestedRefill')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {items.map(item => {
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
              {items.map(item => {
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
                        <p className="text-slate-500 dark:text-slate-400">Sold</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatQty(item.total_quantity, item.unit_type)}
                        </p>
                      </div>
                      {isOwner && (
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Revenue</p>
                          <p className="font-medium text-green-600 dark:text-green-400">
                            {formatPrice(item.total_revenue)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Stock</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.track_stock ? formatQty(item.current_stock || 0, item.unit_type) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Refill</p>
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
        />
      )}
    </div>
  )
}
