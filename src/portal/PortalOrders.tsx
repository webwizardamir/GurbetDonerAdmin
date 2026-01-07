import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Package,
  Loader2,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { usePortalAuth } from '../context/PortalAuthContext'
import { fetchPortalOrders, type PortalOrder } from '../services/portalOrders'

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

export default function PortalOrders() {
  const { t } = useTranslation()
  const { user } = usePortalAuth()
  const [orders, setOrders] = useState<PortalOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (!user?.customer.id) return

    const loadOrders = async () => {
      try {
        const data = await fetchPortalOrders(user.customer.id)
        setOrders(data)
      } catch (err) {
        console.error('Error loading orders:', err)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [user?.customer.id])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (!order.order_number.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [orders, search, statusFilter])

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('portal.orders.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t('portal.orders.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('portal.orders.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-9 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">{t('portal.orders.allStatus')}</option>
            <option value="pending">{t('orders.status.pending')}</option>
            <option value="processing">{t('orders.status.processing')}</option>
            <option value="completed">{t('orders.status.completed')}</option>
            <option value="delivered">{t('orders.status.delivered')}</option>
            <option value="cancelled">{t('orders.status.cancelled')}</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {orders.length === 0
              ? t('portal.orders.noOrders')
              : t('portal.orders.noOrdersMatch')}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.orders.orderNumber')}
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.orders.date')}
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">
                      {t('portal.orders.items')}
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
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                        {order.items?.length || 0} {t('common.items')}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            statusColors[order.status] || statusColors.draft
                          }`}
                        >
                          {t(`orders.status.${order.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-900 dark:text-white">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/portal/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline text-sm font-medium"
                        >
                          {t('portal.orders.viewDetails')}
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                to={`/portal/orders/${order.id}`}
                className="block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-green-300 dark:hover:border-green-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {order.order_number}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      statusColors[order.status] || statusColors.draft
                    }`}
                  >
                    {t(`orders.status.${order.status}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {order.items?.length || 0} {t('common.items')}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
