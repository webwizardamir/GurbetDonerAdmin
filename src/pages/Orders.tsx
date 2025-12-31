import { useState } from 'react'
import {
  Search,
  Plus,
  ShoppingCart,
  Loader2,
  Eye,
  Trash2,
  Calendar,
  Building2,
  ChevronDown,
} from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { usePermission } from '../hooks/usePermission'
import type { OrderStatus } from '../types'
import type { OrderWithItems } from '../services/orders'
import OrderForm from '../components/orders/OrderForm'
import OrderDetail from '../components/orders/OrderDetail'

// Format price from cents to euros
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Status badge component
function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { label: string; className: string }> = {
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
    cancelled: {
      label: 'Cancelled',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    },
    refunded: {
      label: 'Refunded',
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
  }

  const { label, className } = config[status]

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${className}`}>
      {label}
    </span>
  )
}

export default function Orders() {
  const { canCreate, canDelete } = usePermission('orders')
  const { orders, loading, error, filters, setFilters, refresh, remove } = useOrders()

  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Filter orders locally for search
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer?.company_name?.toLowerCase().includes(query)
    )
  })

  const handleDelete = async (order: OrderWithItems) => {
    if (!confirm(`Delete order ${order.order_number}? This cannot be undone.`)) return

    setDeleting(order.id)
    try {
      await remove(order.id)
    } catch {
      // Error handled by hook
    } finally {
      setDeleting(null)
    }
  }

  const handleStatusFilter = (status: OrderStatus | '') => {
    setFilters({ ...filters, status: status || undefined })
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by order number or customer..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={filters.status || ''}
            onChange={e => handleStatusFilter(e.target.value as OrderStatus | '')}
            className="pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Create Order Button */}
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            New Order
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || filters.status
                ? 'No orders match your filters'
                : 'No orders yet. Create your first order!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {order.order_number}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {order.customer?.company_name || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.order_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatPrice(order.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingOrder(order)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </button>
                        {canDelete && order.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(order)}
                            disabled={deleting === order.id}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            {deleting === order.id ? (
                              <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || filters.status
                ? 'No orders match your filters'
                : 'No orders yet'}
            </p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(order.order_date)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {/* Customer & Total */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Building2 className="w-4 h-4" />
                  {order.customer?.company_name || '-'}
                </div>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatPrice(order.total)}
                </span>
              </div>

              {/* Items count */}
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewingOrder(order)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                {canDelete && order.status === 'draft' && (
                  <button
                    onClick={() => handleDelete(order)}
                    disabled={deleting === order.id}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    {deleting === order.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Form Modal */}
      {showForm && (
        <OrderForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}

      {/* Order Detail Modal */}
      {viewingOrder && (
        <OrderDetail
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onStatusChange={() => {
            setViewingOrder(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
