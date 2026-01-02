import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Users,
  Loader2,
  Banknote,
  Building2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAnalytics } from '../hooks/useAnalytics'
import StatCard from '../components/StatCard'
import DateRangePicker from '../components/analytics/DateRangePicker'
import RevenueChart from '../components/analytics/RevenueChart'
import OrdersChart from '../components/analytics/OrdersChart'
import TopCustomersChart from '../components/analytics/TopCustomersChart'
import TopProductsChart from '../components/analytics/TopProductsChart'
import { formatChartCurrency } from '../components/analytics/ChartColors'
import { formatQuantityWithUnit } from '../utils/format'

export default function Analytics() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isOwner, loading: authLoading } = useAuth()
  const {
    loading,
    error,
    dateRange,
    dateRangeKey,
    revenueData,
    ordersByStatus,
    paymentBreakdown,
    topCustomers,
    topProducts,
    kpis,
    setDateRange,
    refresh,
    dateRanges,
  } = useAnalytics()

  // Redirect non-owners
  useEffect(() => {
    if (!authLoading && !isOwner) {
      navigate('/')
    }
  }, [isOwner, authLoading, navigate])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!isOwner) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <DateRangePicker
          currentKey={dateRangeKey}
          currentLabel={dateRange.label}
          dateRanges={dateRanges}
          onSelect={setDateRange}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('analytics.revenue')}
          value={kpis ? formatChartCurrency(kpis.totalRevenue) : '€0'}
          trend={kpis ? {
            value: Math.abs(kpis.revenueGrowth),
            isPositive: kpis.revenueGrowth >= 0,
          } : undefined}
          icon={DollarSign}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          label={t('analytics.orders')}
          value={kpis?.totalOrders.toLocaleString('nl-NL') || '0'}
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
          value={kpis?.totalItems.toLocaleString('nl-NL') || '0'}
          icon={Package}
          iconColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          label={t('analytics.averageOrder')}
          value={kpis ? formatChartCurrency(kpis.averageOrderValue) : '€0'}
          icon={TrendingUp}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('analytics.revenueOverTime')}
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
                  className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {customer.companyName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {customer.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatChartCurrency(customer.totalRevenue)}
                  </span>
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
                  className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {product.productName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatQuantityWithUnit(product.totalQuantity, product.unitType, t)}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatChartCurrency(product.totalRevenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
