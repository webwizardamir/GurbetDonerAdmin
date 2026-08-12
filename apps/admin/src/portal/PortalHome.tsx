import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ShoppingCart,
  FileText,
  User,
  Package,
  Truck,
  Wallet,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { usePortalAuth } from '../context/PortalAuthContext'
import { fetchPortalStats, fetchRecentPortalOrders, type PortalOrder, type PortalStats } from '../services/portalOrders'
import { formatPrice } from '../utils/format'

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_payment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

/** One dashboard KPI: a headline figure with an optional supporting line under it. */
function StatCard({
  icon,
  tone,
  value,
  label,
  hint,
  valueClass,
}: {
  icon: React.ReactNode
  tone: string
  value: string
  label: string
  hint?: string
  valueClass?: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p
            className={`text-2xl font-bold truncate ${
              valueClass || 'text-slate-900 dark:text-white'
            }`}
          >
            {value}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          {hint && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hint}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PortalHome() {
  const { t } = useTranslation()
  const { user } = usePortalAuth()
  const [stats, setStats] = useState<PortalStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<PortalOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.customer.id) return

    const loadData = async () => {
      try {
        const [statsData, ordersData] = await Promise.all([
          fetchPortalStats(user.customer.id),
          fetchRecentPortalOrders(user.customer.id, 5),
        ])
        setStats(statsData)
        setRecentOrders(ordersData)
      } catch (err) {
        console.error('Error loading portal data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.customer.id])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const overdueCount = stats?.overdueCount || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('portal.home.welcome')}, {user?.customer.contact_person || user?.customer.company_name}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {user?.customer.company_name}
        </p>
      </div>

      {/* Overdue alert — the one thing worth interrupting for */}
      {overdueCount > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-red-800 dark:text-red-300">
              {t('portal.home.overdueAlert', {
                count: overdueCount,
                amount: formatPrice(stats?.overdueAmount || 0),
              })}
            </p>
            <Link
              to="/portal/documents"
              className="text-sm text-red-700 dark:text-red-400 hover:underline"
            >
              {t('portal.home.viewInvoices')}
            </Link>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          tone="bg-blue-100 dark:bg-blue-900/30"
          value={String(stats?.pendingOrders || 0)}
          label={t('portal.home.openOrders')}
          hint={
            stats?.pendingOrders
              ? t('portal.home.openOrdersAmount', { amount: formatPrice(stats.pendingAmount) })
              : t('portal.home.noOpenOrders')
          }
        />

        <StatCard
          icon={<Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          tone="bg-indigo-100 dark:bg-indigo-900/30"
          value={formatPrice(stats?.outstandingAmount || 0)}
          label={t('portal.home.outstanding')}
          hint={
            stats?.outstandingCount
              ? [
                  t('portal.home.invoiceCount', { count: stats.outstandingCount }),
                  stats.nextDueDate
                    ? t('portal.home.nextDue', { date: formatDate(stats.nextDueDate) })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : t('portal.home.nothingOutstanding')
          }
        />

        <StatCard
          icon={
            <AlertTriangle
              className={`w-5 h-5 ${
                overdueCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            />
          }
          tone={
            overdueCount > 0
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-green-100 dark:bg-green-900/30'
          }
          value={formatPrice(stats?.overdueAmount || 0)}
          valueClass={overdueCount > 0 ? 'text-red-600 dark:text-red-400' : undefined}
          label={t('portal.home.overdue')}
          hint={
            overdueCount > 0
              ? t('portal.home.invoiceCount', { count: overdueCount })
              : t('portal.home.noOverdue')
          }
        />

        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          tone="bg-emerald-100 dark:bg-emerald-900/30"
          value={formatPrice(stats?.spentThisYear || 0)}
          label={t('portal.home.spentThisYear')}
          hint={t('portal.home.spentTotalHint', {
            amount: formatPrice(stats?.totalSpent || 0),
          })}
        />
      </div>

      {/* Secondary figures — context, not headlines */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('portal.home.totalOrders')}
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {stats?.totalOrders || 0}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('portal.home.completedOrders')}
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {stats?.completedOrders || 0}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('portal.home.averageOrderValue')}
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {formatPrice(stats?.averageOrderValue || 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('portal.home.lastOrder')}
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {stats?.lastOrderDate ? formatDate(stats.lastOrderDate) : '—'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('portal.home.quickActions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/portal/orders"
            className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700 transition-colors group"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white">
                {t('portal.home.viewOrders')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.orders.subtitle')}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
          </Link>

          <Link
            to="/portal/documents"
            className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700 transition-colors group"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white">
                {t('portal.home.viewDocuments')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.documents.subtitle')}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>

          <Link
            to="/portal/account"
            className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700 transition-colors group"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white">
                {t('portal.home.manageAccount')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('portal.account.subtitle')}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('portal.home.recentOrders')}
          </h2>
          <Link
            to="/portal/orders"
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            {t('portal.home.viewAllOrders')}
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {t('portal.home.noRecentOrders')}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.orders.orderNumber')}
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.orders.date')}
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.orders.status')}
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.orders.total')}
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {order.order_number}
                        </span>
                      </td>
                      {/* order_date is the business date on the invoice; created_at is
                          just when the row was keyed in. */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {formatDate(order.order_date || order.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            statusColors[order.status] || statusColors.draft
                          }`}
                        >
                          {t(`orders.status.${order.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/portal/orders/${order.id}`}
                          className="text-green-600 dark:text-green-400 hover:underline text-sm"
                        >
                          {t('portal.orders.viewDetails')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
