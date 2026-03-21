import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Receipt,
  Loader2,
  ArrowUpDown,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
} from 'lucide-react'
import { useOrderAnalytics } from '../../../hooks/useOrderAnalytics'
import type { DateRange } from '../../../hooks/useDateRange'
import StatCard from '../../StatCard'
import { formatChartCurrency } from '../ChartColors'
import { formatDate } from '../../../utils/format'
import { exportToExcel, formatCentsToCsvCurrency, formatCsvPercentage } from '../../../utils/excelExport'

interface OrdersTabProps {
  dateRange: DateRange
}

type SortKey = 'orderNumber' | 'orderDate' | 'customerName' | 'status' | 'paymentMethod' | 'subtotal' | 'total' | 'totalCost' | 'profit' | 'profitMargin' | 'taxAmount'
type SortDir = 'asc' | 'desc'

const STATUS_OPTIONS = ['draft', 'pending_payment', 'on_hold', 'completed', 'cancelled', 'refunded', 'delivered']

export default function OrdersTab({ dateRange }: OrdersTabProps) {
  const { t } = useTranslation()
  const { loading, error, orders } = useOrderAnalytics(dateRange)
  const [sortKey, setSortKey] = useState<SortKey>('orderDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [search, setSearch] = useState('')

  const filteredOrders = useMemo(() => {
    let result = orders
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      result = result.filter(o => o.status === statusFilter)
    }
    if (paymentFilter) {
      result = result.filter(o => o.paymentMethod === paymentFilter)
    }
    return result
  }, [orders, search, statusFilter, paymentFilter])

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredOrders, sortKey, sortDir])

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

  // KPI computations from filtered data
  const totalOrders = filteredOrders.length
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.subtotal, 0)
  const totalProfit = filteredOrders.reduce((sum, o) => sum + (o.subtotal - o.totalCost), 0)
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  const handleExport = () => {
    exportToExcel('bestellingen-analyse', [
      { header: '#', accessor: (_, i) => i + 1 },
      { header: t('analytics.orderReport.orderNr'), accessor: r => r.orderNumber },
      { header: t('analytics.orderReport.date'), accessor: r => r.orderDate },
      { header: t('analytics.orderReport.customer'), accessor: r => r.customerName },
      { header: t('analytics.orderReport.status'), accessor: r => r.status },
      { header: t('analytics.orderReport.payment'), accessor: r => r.paymentMethod },
      { header: t('analytics.revenue'), accessor: r => formatCentsToCsvCurrency(r.subtotal) },
      { header: t('analytics.orderReport.cost'), accessor: r => formatCentsToCsvCurrency(r.totalCost) },
      { header: t('analytics.profit'), accessor: r => formatCentsToCsvCurrency(r.profit) },
      { header: t('analytics.margin'), accessor: r => formatCsvPercentage(r.profitMargin) },
      { header: t('analytics.orderReport.tax'), accessor: r => formatCentsToCsvCurrency(r.taxAmount) },
    ], sortedOrders)
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
          label={t('analytics.orderReport.totalOrders')}
          value={totalOrders.toString()}
          icon={ShoppingCart}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label={t('analytics.orderReport.totalRevenue')}
          value={formatChartCurrency(totalRevenue)}
          icon={DollarSign}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          label={t('analytics.orderReport.totalProfit')}
          value={formatChartCurrency(totalProfit)}
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label={t('analytics.orderReport.avgOrderValue')}
          value={formatChartCurrency(avgOrderValue)}
          icon={Receipt}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('analytics.orderReport.title')}</h3>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('analytics.export')}
          </button>
        </div>

        {/* Search & Filter Row */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 flex-wrap">
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
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="">{t('orders.allStatus')}</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{t(`orders.status.${s}`)}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="">{t('orders.allPayment')}</option>
            <option value="cash">{t('orders.payment.cash')}</option>
            <option value="bank">{t('orders.payment.bank')}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">#</th>
                {([
                  ['orderNumber', t('analytics.orderReport.orderNr')],
                  ['orderDate', t('analytics.orderReport.date')],
                  ['customerName', t('analytics.orderReport.customer')],
                  ['status', t('analytics.orderReport.status')],
                  ['paymentMethod', t('analytics.orderReport.payment')],
                  ['subtotal', t('analytics.revenue')],
                  ['totalCost', t('analytics.orderReport.cost')],
                  ['profit', t('analytics.profit')],
                  ['profitMargin', t('analytics.margin')],
                  ['taxAmount', t('analytics.orderReport.tax')],
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
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                sortedOrders.map((row, idx) => (
                  <tr key={row.orderId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{row.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatDate(row.orderDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{row.customerName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {row.paymentMethod === 'cash' ? t('orders.payment.cash') :
                       row.paymentMethod === 'bank' ? t('orders.payment.bank') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-medium">{formatChartCurrency(row.subtotal)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatChartCurrency(row.totalCost)}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatChartCurrency(row.profit)}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{row.profitMargin.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatChartCurrency(row.taxAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    delivered: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    draft: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
    pending_payment: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    on_hold: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    refunded: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes[status] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
      {status}
    </span>
  )
}
