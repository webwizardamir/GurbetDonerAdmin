import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Package,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Loader2,
  ArrowUpDown,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
} from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useProductAnalytics } from '../../../hooks/useProductAnalytics'
import type { DateRange } from '../../../hooks/useDateRange'
import type { ProductPerformanceRow } from '../../../services/analytics'
import StatCard from '../../StatCard'
import { formatChartCurrency, useChartColors } from '../ChartColors'
import { formatDate } from '../../../utils/format'
import { exportToExcel, formatCentsToCsvCurrency, formatCsvPercentage } from '../../../utils/excelExport'

interface ProductsTabProps {
  dateRange: DateRange
}

type SortKey = 'productName' | 'categoryName' | 'totalRevenue' | 'totalCogs' | 'totalProfit' | 'profitMargin' | 'totalQuantity' | 'orderCount' | 'abcClass'
type SortDir = 'asc' | 'desc'

export default function ProductsTab({ dateRange }: ProductsTabProps) {
  const { t } = useTranslation()
  const { loading, error, products, slowMovers, categories } = useProductAnalytics(dateRange)
  const { colors } = useChartColors()
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(p =>
      p.productName.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q)
    )
  }, [products, search])

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredProducts, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  // KPI computations
  const productsSold = products.length
  const bestMarginProduct = products.reduce<ProductPerformanceRow | null>(
    (best, p) => (!best || p.profitMargin > best.profitMargin) ? p : best, null
  )
  const topProduct = products[0] || null

  const handleExport = () => {
    exportToExcel('producten-analyse', [
      { header: '#', accessor: (_, i) => i + 1 },
      { header: t('analytics.products.product'), accessor: r => r.productName },
      { header: t('analytics.products.category'), accessor: r => r.categoryName || t('analytics.products.noCategory') },
      { header: t('analytics.revenue'), accessor: r => formatCentsToCsvCurrency(r.totalRevenue) },
      { header: t('analytics.products.cogs'), accessor: r => formatCentsToCsvCurrency(r.totalCogs) },
      { header: t('analytics.profit'), accessor: r => formatCentsToCsvCurrency(r.totalProfit) },
      { header: t('analytics.margin'), accessor: r => formatCsvPercentage(r.profitMargin) },
      { header: t('analytics.products.qty'), accessor: r => r.totalQuantity },
      { header: t('analytics.orders'), accessor: r => r.orderCount },
      { header: t('analytics.products.abc'), accessor: r => r.abcClass },
    ], sortedProducts)
  }

  // Custom tooltip for category chart
  const CategoryTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { categoryName: string } }> }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-slate-900 dark:text-white text-sm">{payload[0].payload.categoryName || t('analytics.products.noCategory')}</p>
        <p className="text-sm text-green-600 dark:text-green-400">{formatChartCurrency(payload[0].value)}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('analytics.products.productsSold')}
          value={productsSold.toString()}
          icon={Package}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          label={t('analytics.products.bestMargin')}
          value={bestMarginProduct ? `${bestMarginProduct.profitMargin.toFixed(1)}%` : '-'}
          description={bestMarginProduct?.productName}
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label={t('analytics.products.topProduct')}
          value={topProduct ? formatChartCurrency(topProduct.totalRevenue) : '-'}
          description={topProduct?.productName}
          icon={DollarSign}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          label={t('analytics.products.slowMoving')}
          value={slowMovers.length.toString()}
          icon={AlertTriangle}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-50 dark:bg-red-900/20"
        />
      </div>

      {/* Product Performance Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">{t('analytics.topProducts')}</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('common.search')}
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 w-48 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('analytics.export')}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">#</th>
                {([
                  ['productName', t('analytics.products.product')],
                  ['categoryName', t('analytics.products.category')],
                  ['totalRevenue', t('analytics.revenue')],
                  ['totalCogs', t('analytics.products.cogs')],
                  ['totalProfit', t('analytics.profit')],
                  ['profitMargin', t('analytics.margin')],
                  ['totalQuantity', t('analytics.products.qty')],
                  ['orderCount', t('analytics.orders')],
                  ['abcClass', t('analytics.products.abc')],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <SortIcon column={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                sortedProducts.map((row, idx) => (
                  <tr key={row.productName} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{row.productName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.categoryName || t('analytics.products.noCategory')}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-medium">{formatChartCurrency(row.totalRevenue)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatChartCurrency(row.totalCogs)}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatChartCurrency(row.totalProfit)}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{row.profitMargin.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.totalQuantity.toLocaleString('nl-NL')}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.orderCount}</td>
                    <td className="px-4 py-3">
                      <AbcBadge value={row.abcClass} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue by Category */}
      {categories.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('analytics.products.revenueByCategory')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tickFormatter={(v: number) => formatChartCurrency(v)} tick={{ fill: colors.textSecondary, fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  tick={{ fill: colors.textSecondary, fontSize: 12 }}
                  tickFormatter={(v: string) => v || t('analytics.products.noCategory')}
                  width={75}
                />
                <Tooltip content={<CategoryTooltip />} />
                <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]}>
                  {categories.map((_, idx) => (
                    <Cell key={idx} fill={idx === 0 ? colors.primary : colors.primaryLight} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Category summary table */}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.category')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.revenue')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.profit')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.margin')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {categories.map(cat => (
                  <tr key={cat.categoryName || '__none'}>
                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-white">{cat.categoryName || t('analytics.products.noCategory')}</td>
                    <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">{formatChartCurrency(cat.totalRevenue)}</td>
                    <td className="px-3 py-2 text-sm text-right text-emerald-600 dark:text-emerald-400">{formatChartCurrency(cat.totalProfit)}</td>
                    <td className="px-3 py-2 text-sm text-right text-slate-600 dark:text-slate-400">{cat.profitMargin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slow Movers */}
      {slowMovers.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('analytics.products.slowMovers')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('analytics.products.slowMoversDesc')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.product')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.sku')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.currentStock')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.stockValue')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.lastSaleDate')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.daysSinceLastSale')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {slowMovers.map(row => {
                  const urgency = (row.daysSinceLastSale || 9999) > 90
                    ? 'bg-red-50 dark:bg-red-900/10'
                    : (row.daysSinceLastSale || 9999) > 60
                      ? 'bg-amber-50 dark:bg-amber-900/10'
                      : ''
                  return (
                    <tr key={row.productId} className={urgency}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{row.productName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">{row.currentStock.toLocaleString('nl-NL')}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">{formatChartCurrency(row.stockValue)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.lastSaleDate ? formatDate(row.lastSaleDate) : t('analytics.products.never')}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">{row.daysSinceLastSale ?? '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function AbcBadge({ value }: { value: 'A' | 'B' | 'C' }) {
  const classes = {
    A: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    B: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    C: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${classes[value]}`}>
      {value}
    </span>
  )
}
