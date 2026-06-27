import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Euro,
  ShoppingCart,
  Package,
  TrendingUp,
  BarChart3,
  Users,
  Loader2,
  Banknote,
  Building2,
  Percent,
  Download,
  FileType2,
  FileSpreadsheet,
  ChevronDown,
} from 'lucide-react'
import { useOverviewAnalytics } from '../../../hooks/useAnalytics'
import type { DateRange } from '../../../hooks/useDateRange'
import type { AnalyticsFilters } from '../../../services/analyticsHelpers'
import StatCard from '../../StatCard'
import RevenueChart from '../RevenueChart'
import OrdersChart from '../OrdersChart'
import TopCustomersChart from '../TopCustomersChart'
import TopProductsChart from '../TopProductsChart'
import { formatChartCurrency } from '../ChartColors'
import { formatCentsToCsvCurrency, formatCsvPercentage } from '../../../utils/excelExport'
import { exportOverviewPdf, exportOverviewExcel, type OverviewExcelSection } from '../../../utils/analyticsExport'
import { formatQuantityWithUnit, formatPercent, formatCount, formatQuantity } from '../../../utils/format'

const marginPct = (revenue: number, profit: number) => (revenue > 0 ? Math.round((profit / revenue) * 100) : 0)

interface OverviewTabProps {
  dateRange: DateRange
  statuses?: string[]
  filters?: AnalyticsFilters
}

export default function OverviewTab({ dateRange, statuses = [], filters = {} }: OverviewTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    loading,
    error,
    revenueData,
    ordersByStatus,
    paymentBreakdown,
    topCustomers,
    topProducts,
    kpis,
  } = useOverviewAnalytics(dateRange, statuses, filters)

  // The DOM region captured for the "whole page" PDF (excludes the export bar).
  const captureRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleExportPdf = async () => {
    if (!captureRef.current) return
    setMenuOpen(false)
    setExporting(true)
    try {
      const dark = document.documentElement.classList.contains('dark')
      await exportOverviewPdf(captureRef.current, `overzicht-${dateRange.start}`, {
        backgroundColor: dark ? '#0f172a' : '#ffffff',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setMenuOpen(false)
    setExporting(true)
    try {
      const sections: OverviewExcelSection[] = []
      if (kpis) {
        sections.push({
          title: t('analytics.title'),
          headers: [t('analytics.kpi'), t('analytics.value')],
          rows: [
            [t('analytics.revenue'), formatCentsToCsvCurrency(kpis.totalRevenue || 0)],
            [t('analytics.profit'), formatCentsToCsvCurrency(kpis.totalProfit || 0)],
            [t('analytics.margin'), formatCsvPercentage(kpis.profitMargin || 0)],
            [t('analytics.orders'), kpis.totalOrders || 0],
            [t('analytics.itemsSold'), kpis.totalItems || 0],
            [t('analytics.averageOrder'), formatCentsToCsvCurrency(kpis.averageOrderValue || 0)],
          ],
        })
      }
      if (topCustomers.length > 0) {
        sections.push({
          title: t('analytics.topCustomers'),
          headers: [t('analytics.topCustomers'), t('analytics.revenue'), t('analytics.profit'), t('analytics.margin'), t('analytics.orders')],
          rows: topCustomers.map(c => [
            c.companyName,
            formatCentsToCsvCurrency(c.totalRevenue),
            formatCentsToCsvCurrency(c.totalProfit),
            formatCsvPercentage(marginPct(c.totalRevenue, c.totalProfit)),
            c.orderCount,
          ]),
        })
      }
      if (topProducts.length > 0) {
        sections.push({
          title: t('analytics.topProducts'),
          headers: [t('analytics.topProducts'), t('analytics.itemsSold'), t('analytics.unit'), t('analytics.revenue'), t('analytics.profit'), t('analytics.margin')],
          rows: topProducts.map(p => [
            p.productName,
            p.totalQuantity,
            p.unitType,
            formatCentsToCsvCurrency(p.totalRevenue),
            formatCentsToCsvCurrency(p.totalProfit),
            formatCsvPercentage(marginPct(p.totalRevenue, p.totalProfit)),
          ]),
        })
      }
      await exportOverviewExcel(`overzicht-${dateRange.start}`, t('analytics.title'), sections)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Export bar — whole page as PDF (charts included) or data as Excel */}
      {!loading && (
        <div className="flex items-center justify-end">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{t('analytics.export')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 text-sm">
                  <button onClick={handleExportPdf} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                    <FileType2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="text-left">{t('analytics.exportPdfFull')}</span>
                  </button>
                  <button onClick={handleExportExcel} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-left">{t('analytics.exportExcelData')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div ref={captureRef} className="space-y-6">
      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label={t('analytics.revenue')}
          value={kpis ? formatChartCurrency(kpis.totalRevenue || 0) : '€0'}
          trend={kpis ? {
            value: Math.abs(kpis.revenueGrowth),
            isPositive: kpis.revenueGrowth >= 0,
          } : undefined}
          icon={Euro}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          label={t('analytics.profit')}
          value={kpis ? formatChartCurrency(kpis.totalProfit) : '€0'}
          trend={kpis ? {
            value: Math.abs(kpis.profitGrowth),
            isPositive: kpis.profitGrowth >= 0,
          } : undefined}
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label={t('analytics.margin')}
          value={kpis ? formatPercent(kpis.profitMargin) : formatPercent(0)}
          icon={Percent}
          iconColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          label={t('analytics.orders')}
          value={kpis ? formatCount(kpis.totalOrders) : '0'}
          trend={kpis ? {
            value: Math.abs(kpis.ordersGrowth),
            isPositive: kpis.ordersGrowth >= 0,
          } : undefined}
          icon={ShoppingCart}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label={t('analytics.itemsSold')}
          value={kpis ? formatQuantity(kpis.totalItems) : '0'}
          icon={Package}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          label={t('analytics.averageOrder')}
          value={kpis ? formatChartCurrency(kpis.averageOrderValue) : '€0'}
          icon={Euro}
          iconColor="text-slate-600 dark:text-slate-400"
          iconBg="bg-slate-50 dark:bg-slate-900/20"
        />
      </div>

      {/* Payment Method Breakdown */}
      {paymentBreakdown.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paymentBreakdown.map(item => {
            const isCash = item.method === 'cash'
            return (
              <div
                key={item.method}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-4"
              >
                <div className={`p-3 rounded-xl ${isCash ? 'bg-green-50 dark:bg-green-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                  {isCash ? (
                    <Banknote className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isCash ? t('orders.payment.cash') : t('orders.payment.bank')}
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatChartCurrency(item.revenue)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    isCash
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}>
                    {item.count}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('analytics.revenueAndProfit')}
            </h2>
          </div>
        </div>
        <RevenueChart data={revenueData} loading={loading} />
      </div>

      {/* Orders by Status & Top Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders by Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('analytics.ordersByStatus')}
            </h2>
          </div>
          <OrdersChart data={ordersByStatus} loading={loading} />
        </div>

        {/* Top Customers */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('analytics.topCustomers')}
            </h2>
          </div>
          <TopCustomersChart data={topCustomers} loading={loading} />
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('analytics.topProducts')}
            </h2>
          </div>
          <TopProductsChart data={topProducts} loading={loading} />
        </div>
      </div>

      {/* Full Lists (Tables) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('analytics.topCustomers')}</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              </div>
            ) : topCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                {t('common.noResults')}
              </div>
            ) : (
              topCustomers.map((customer, index) => (
                <div
                  key={customer.id}
                  onClick={() => { if (customer.id) navigate(`/customers/${customer.id}`) }}
                  className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                        {customer.companyName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {customer.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      {formatChartCurrency(customer.totalRevenue)}
                    </span>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {t('analytics.profit')}: {formatChartCurrency(customer.totalProfit)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('analytics.topProducts')}</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                {t('common.noResults')}
              </div>
            ) : (
              topProducts.map((product, index) => (
                <div
                  key={product.productName}
                  onClick={() => navigate(`/products?search=${encodeURIComponent(product.productName)}`)}
                  className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                        {product.productName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatQuantityWithUnit(product.totalQuantity, product.unitType, t)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      {formatChartCurrency(product.totalRevenue)}
                    </span>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {t('analytics.profit')}: {formatChartCurrency(product.totalProfit)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
