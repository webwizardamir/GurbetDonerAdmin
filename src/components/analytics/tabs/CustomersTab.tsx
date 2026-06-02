import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Euro,
  TrendingUp,
  ShoppingCart,
  Loader2,
  ArrowUpDown,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useCustomerAnalytics } from '../../../hooks/useCustomerAnalytics'
import type { DateRange } from '../../../hooks/useDateRange'
import StatCard from '../../StatCard'
import { formatChartCurrency, formatChartCompactCurrency, useChartColors } from '../ChartColors'
import { formatDate, formatPercent, formatCount } from '../../../utils/format'
import { exportToExcel, formatCentsToCsvCurrency, formatCsvPercentage } from '../../../utils/excelExport'

interface CustomersTabProps {
  dateRange: DateRange
}

type SortKey = 'companyName' | 'totalRevenue' | 'totalProfit' | 'profitMargin' | 'orderCount' | 'avgOrderValue' | 'totalTax' | 'lastOrderDate'
type SortDir = 'asc' | 'desc'

export default function CustomersTab({ dateRange }: CustomersTabProps) {
  const { t } = useTranslation()
  const { loading, error, customers } = useCustomerAnalytics(dateRange)
  const { colors } = useChartColors()
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(c => c.companyName.toLowerCase().includes(q))
  }, [customers, search])

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredCustomers, sortKey, sortDir])

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
  const totalCustomers = customers.length
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalRevenue, 0)
  const totalProfit = customers.reduce((sum, c) => sum + c.totalProfit, 0)
  const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0)

  // Revenue concentration - Top 5
  const top5Revenue = customers.slice(0, 5).reduce((sum, c) => sum + c.totalRevenue, 0)
  const top5Share = totalRevenue > 0 ? formatPercent((top5Revenue / totalRevenue) * 100).replace('%', '') : '0'

  // Top 10 for bar chart
  const top10 = customers.slice(0, 10)

  const handleExport = () => {
    const sumBy = (rows: typeof sortedCustomers, fn: (r: typeof sortedCustomers[number]) => number) =>
      rows.reduce((a, r) => a + (Number(fn(r)) || 0), 0)
    exportToExcel('klanten-analyse', [
      { header: '#', accessor: (_, i) => i + 1, total: () => 'Totaal' },
      { header: t('analytics.customers.company'), accessor: r => r.companyName },
      { header: t('analytics.revenue'), accessor: r => formatCentsToCsvCurrency(r.totalRevenue), total: rows => formatCentsToCsvCurrency(sumBy(rows, r => r.totalRevenue)) },
      { header: t('analytics.profit'), accessor: r => formatCentsToCsvCurrency(r.totalProfit), total: rows => formatCentsToCsvCurrency(sumBy(rows, r => r.totalProfit)) },
      { header: t('analytics.margin'), accessor: r => formatCsvPercentage(r.profitMargin) },
      { header: t('analytics.orders'), accessor: r => r.orderCount, total: rows => sumBy(rows, r => r.orderCount) },
      { header: t('analytics.customers.avgOrder'), accessor: r => formatCentsToCsvCurrency(r.avgOrderValue) },
      { header: t('analytics.customers.tax'), accessor: r => formatCentsToCsvCurrency(r.totalTax), total: rows => formatCentsToCsvCurrency(sumBy(rows, r => r.totalTax)) },
      { header: t('analytics.customers.lastOrder'), accessor: r => r.lastOrderDate || '-' },
    ], sortedCustomers)
  }

  const ConcentrationTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { companyName: string } }> }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-slate-900 dark:text-white text-sm">{payload[0].payload.companyName}</p>
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
          label={t('analytics.customers.totalCustomers')}
          value={totalCustomers.toString()}
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label={t('analytics.customers.totalRevenue')}
          value={formatChartCurrency(totalRevenue)}
          icon={Euro}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          label={t('analytics.totalProfit')}
          value={formatChartCurrency(totalProfit)}
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label={t('analytics.customers.totalOrders')}
          value={totalOrders.toString()}
          icon={ShoppingCart}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Customer Performance Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">{t('analytics.topCustomers')}</h3>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('common.search')}
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('analytics.export')}</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">#</th>
                {([
                  ['companyName', t('analytics.customers.company')],
                  ['totalRevenue', t('analytics.revenue')],
                  ['totalProfit', t('analytics.profit')],
                  ['profitMargin', t('analytics.margin')],
                  ['orderCount', t('analytics.orders')],
                  ['avgOrderValue', t('analytics.customers.avgOrder')],
                  ['totalTax', t('analytics.customers.tax')],
                  ['lastOrderDate', t('analytics.customers.lastOrder')],
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
              {sortedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                sortedCustomers.map((row, idx) => (
                  <tr key={row.customerId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link
                        to={`/customers/${row.customerId}`}
                        className="text-slate-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 hover:underline"
                      >
                        {row.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-medium">{formatChartCurrency(row.totalRevenue)}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatChartCurrency(row.totalProfit)}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{formatPercent(row.profitMargin)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatCount(row.orderCount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatChartCurrency(row.avgOrderValue)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatChartCurrency(row.totalTax)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.lastOrderDate ? formatDate(row.lastOrderDate) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Concentration */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-100 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t('analytics.customers.revenueConcentration')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t('analytics.customers.topCustomersShare', { count: 5, share: top5Share })}
        </p>
        {top10.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 60, right: 10, top: 5, bottom: 5 }}>
                <XAxis type="number" tickFormatter={(v: number) => formatChartCompactCurrency(v)} tick={{ fill: colors.textSecondary, fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="companyName"
                  tick={{ fill: colors.textSecondary, fontSize: 12 }}
                  tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + '...' : v}
                  width={75}
                />
                <Tooltip content={<ConcentrationTooltip />} />
                <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]}>
                  {top10.map((_, idx) => (
                    <Cell key={idx} fill={idx < 5 ? colors.primary : colors.primaryLight} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
