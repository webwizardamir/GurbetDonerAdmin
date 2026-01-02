import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  Loader2,
  AlertTriangle,
  Banknote,
  Building2,
  Eye,
  RefreshCw,
  Package,
  TrendingUp,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import { useDashboard } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'

// Format price from cents to euros
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

// Status badge for orders
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: {
      label: 'Draft',
      className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    },
    pending_payment: {
      label: 'Pending',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
    on_hold: {
      label: 'On Hold',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    },
    refunded: {
      label: 'Refunded',
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    },
  }

  const cfg = config[status] || {
    label: status,
    className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useDashboard()
  const { isOwner } = useAuth()

  // Calculate today's payment totals
  const todayCash = data?.paymentBreakdown.find(p => p.method === 'cash')
  const todayBank = data?.paymentBreakdown.find(p => p.method === 'bank')
  const todayTotal = (todayCash?.revenue || 0) + (todayBank?.revenue || 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          {t('common.tryAgain')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('nav.dashboard')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {new Date().toLocaleDateString('nl-NL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={refresh}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('dashboard.totalOrders')}
          value={data?.stats.totalOrders.toLocaleString('nl-NL') || '0'}
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        {isOwner && (
          <StatCard
            label={t('dashboard.totalRevenue')}
            value={formatPrice(data?.stats.totalRevenue || 0)}
            icon={DollarSign}
            iconColor="text-green-600"
            iconBg="bg-green-50 dark:bg-green-900/20"
          />
        )}
        <StatCard
          label={t('dashboard.totalCustomers')}
          value={data?.stats.totalCustomers.toLocaleString('nl-NL') || '0'}
          icon={Users}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          label={t('dashboard.pendingOrders')}
          value={data?.stats.pendingOrders.toString() || '0'}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Today's Payment Summary & Today's Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Payment Summary - Owner Only */}
        {isOwner && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('dashboard.todaysPayments')}
              </h3>
            </div>

            {todayTotal === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {t('dashboard.noCompletedOrdersToday')}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Cash */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        {t('orders.payment.cash')}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatPrice(todayCash?.revenue || 0)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {todayCash?.count || 0} order{(todayCash?.count || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Bank */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {t('orders.payment.bank')}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatPrice(todayBank?.revenue || 0)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {todayBank?.count || 0} order{(todayBank?.count || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Total */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('dashboard.totalToday')}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatPrice(todayTotal)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Today's Orders */}
        <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 ${!isOwner ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('dashboard.todaysOrders')}
              </h3>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                {data?.todaysOrders.length || 0}
              </span>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              {t('dashboard.viewAll')}
            </button>
          </div>

          {(data?.todaysOrders.length || 0) === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center">
              {t('dashboard.noOrdersToday')}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data?.todaysOrders.slice(0, 8).map(order => (
                <div
                  key={order.id}
                  onClick={() => navigate('/orders')}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {order.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    {isOwner && (
                      <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                        {formatPrice(order.total)}
                      </span>
                    )}
                    <Eye className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
              {(data?.todaysOrders.length || 0) > 8 && (
                <p className="text-xs text-center text-slate-500 pt-2">
                  +{(data?.todaysOrders.length || 0) - 8} more orders
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Products */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('dashboard.lowStockAlert')}
            </h3>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            {t('dashboard.viewProducts')}
          </button>
        </div>

        {(data?.lowStockProducts.length || 0) === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center">
            {t('dashboard.allStockOk')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.lowStockProducts.map(product => {
              const isCritical = product.stockQuantity < 10

              return (
                <div
                  key={product.id}
                  className={`p-3 rounded-xl ${
                    isCritical
                      ? 'bg-rose-50 dark:bg-rose-900/20'
                      : 'bg-amber-50 dark:bg-amber-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {product.name}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        isCritical
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isCritical ? t('dashboard.critical') : t('dashboard.low')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {product.stockQuantity} {product.unitType === 'kg' ? 'kg' : t('common.items')}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
