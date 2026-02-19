import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Plus,
  ShoppingCart,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Building2,
  ChevronDown,
  Banknote,
  Download,
  CheckCircle,
  FileText,
  X,
  Check,
} from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { usePermission } from '../hooks/usePermission'
import type { OrderStatus, PaymentMethod } from '../types'
import type { OrderWithItems } from '../services/orders'
import { bulkUpdateOrderStatus, bulkDeleteOrders } from '../services/orders'
import { fetchDocumentInfoByOrder, type OrderDocumentInfo } from '../services/documents'
import OrderForm from '../components/orders/OrderForm'
import OrderDetail from '../components/orders/OrderDetail'
import { exportToExcelGeneric, orderExportColumns } from '../utils/export'
import { formatPrice, formatDate } from '../utils/format'

// Status badge component - supports both original and new schema statuses
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const config: Record<string, { labelKey: string; className: string }> = {
    // New schema statuses
    draft: {
      labelKey: 'orders.status.draft',
      className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    },
    pending_payment: {
      labelKey: 'orders.status.pending_payment',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
    on_hold: {
      labelKey: 'orders.status.on_hold',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    cancelled: {
      labelKey: 'orders.status.cancelled',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    },
    refunded: {
      labelKey: 'orders.status.refunded',
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    },
    completed: {
      labelKey: 'orders.status.completed',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
    // Original schema statuses
    pending: {
      labelKey: 'orders.status.pending',
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
    processing: {
      labelKey: 'orders.status.processing',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    delivered: {
      labelKey: 'orders.status.delivered',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
  }

  const statusConfig = config[status] || {
    labelKey: status || 'Unknown',
    className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  }

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.className}`}>
      {t(statusConfig.labelKey)}
    </span>
  )
}

// Payment method badge component
function PaymentBadge({ method }: { method?: PaymentMethod }) {
  const { t } = useTranslation()
  if (!method || method === 'none') return null

  const config = {
    cash: {
      labelKey: 'orders.payment.cash',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      icon: Banknote,
    },
    bank: {
      labelKey: 'orders.payment.bank',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      icon: Building2,
    },
  }

  const cfg = config[method]
  if (!cfg) return null

  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {t(cfg.labelKey)}
    </span>
  )
}

export default function Orders() {
  const { t } = useTranslation()
  const { canCreate, canEdit, canDelete } = usePermission('orders')
  const { orders, loading, error, filters, setFilters, refresh, remove } = useOrders()

  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null)
  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState<'single' | 'bulk' | null>(null)
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null)

  // Document info per order (count + invoice number)
  const [documentInfo, setDocumentInfo] = useState<Map<string, OrderDocumentInfo>>(new Map())

  // Filter orders locally for search (order number, customer name, or invoice number)
  const filteredOrders = useMemo(() => orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const invoiceNum = documentInfo.get(order.id)?.invoiceNumber?.toLowerCase() || ''
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer?.company_name?.toLowerCase().includes(query) ||
      invoiceNum.includes(query)
    )
  }), [orders, searchQuery, documentInfo])

  // Fetch document info (count + invoice numbers) when orders change
  useEffect(() => {
    const orderIds = orders.map(o => o.id)
    if (orderIds.length > 0) {
      fetchDocumentInfoByOrder(orderIds)
        .then(info => setDocumentInfo(info))
        .catch(console.error)
    }
  }, [orders])

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filters, searchQuery])

  // Get selected orders that can be bulk completed
  const selectedOrders = filteredOrders.filter(o => selectedIds.has(o.id))
  const completableSelected = selectedOrders.filter(o =>
    ['draft', 'pending_payment', 'on_hold'].includes(o.status)
  )
  const deletableSelected = selectedOrders.filter(o =>
    ['draft', 'pending', 'pending_payment', 'on_hold'].includes(o.status)
  )

  const handleDelete = async (order: OrderWithItems) => {
    if (!confirm(t('orders.confirmDelete', { number: order.order_number }))) return

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

  const handlePaymentFilter = (method: PaymentMethod | '') => {
    setFilters({ ...filters, paymentMethod: method || undefined })
  }

  const handleExport = () => {
    const today = new Date().toISOString().split('T')[0]
    exportToExcelGeneric(filteredOrders, orderExportColumns, `orders-${today}`)
  }

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)))
    }
  }

  // Quick complete single order
  const handleQuickComplete = (orderId: string) => {
    setPendingCompleteId(orderId)
    setShowPaymentModal('single')
  }

  // Bulk complete
  const handleBulkComplete = () => {
    if (completableSelected.length === 0) return
    setShowPaymentModal('bulk')
  }

  // Handle payment method selection
  const handlePaymentConfirm = async (method: PaymentMethod) => {
    try {
      setBulkProcessing(true)

      if (showPaymentModal === 'single' && pendingCompleteId) {
        await bulkUpdateOrderStatus([pendingCompleteId], 'completed', method)
      } else if (showPaymentModal === 'bulk') {
        const ids = completableSelected.map(o => o.id)
        await bulkUpdateOrderStatus(ids, 'completed', method)
        setSelectedIds(new Set())
      }

      refresh()
    } catch (err) {
      console.error('Failed to complete order(s):', err)
    } finally {
      setBulkProcessing(false)
      setShowPaymentModal(null)
      setPendingCompleteId(null)
    }
  }

  // Bulk cancel
  const handleBulkCancel = async () => {
    const cancellable = selectedOrders.filter(o =>
      ['draft', 'pending_payment', 'on_hold'].includes(o.status)
    )
    if (cancellable.length === 0) return

    if (!confirm(t('orders.confirmCancel', { count: cancellable.length }))) return

    try {
      setBulkProcessing(true)
      await bulkUpdateOrderStatus(cancellable.map(o => o.id), 'cancelled')
      setSelectedIds(new Set())
      refresh()
    } catch (err) {
      console.error('Failed to cancel orders:', err)
    } finally {
      setBulkProcessing(false)
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (deletableSelected.length === 0) return

    if (!confirm(t('orders.confirmBulkDelete', { count: deletableSelected.length }))) return

    try {
      setBulkProcessing(true)
      await bulkDeleteOrders(deletableSelected.map(o => o.id))
      setSelectedIds(new Set())
      refresh()
    } catch (err) {
      console.error('Failed to delete orders:', err)
    } finally {
      setBulkProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters - Combined on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('orders.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Status Filter */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={filters.status || ''}
              onChange={e => handleStatusFilter(e.target.value as OrderStatus | '')}
              className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
            >
              <option value="">{t('orders.allStatus')}</option>
              <option value="draft">{t('orders.status.draft')}</option>
              <option value="pending_payment">{t('orders.status.pending_payment')}</option>
              <option value="on_hold">{t('orders.status.on_hold')}</option>
              <option value="completed">{t('orders.status.completed')}</option>
              <option value="cancelled">{t('orders.status.cancelled')}</option>
              <option value="refunded">{t('orders.status.refunded')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Payment Method Filter */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={filters.paymentMethod || ''}
              onChange={e => handlePaymentFilter(e.target.value as PaymentMethod | '')}
              className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
            >
              <option value="">{t('orders.allPayment')}</option>
              <option value="cash">{t('orders.payment.cash')}</option>
              <option value="bank">{t('orders.payment.bank')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
            title={t('common.export')}
          >
            <Download className="w-5 h-5" />
            <span className="hidden lg:inline">{t('common.export')}</span>
          </button>

          {/* Spacer to push button right on desktop */}
          <div className="hidden sm:block flex-1" />

          {/* Create Order Button */}
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('orders.newOrder')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              {selectedIds.size} {t('orders.selected')}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              {t('orders.clear')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {completableSelected.length > 0 && (
              <button
                onClick={handleBulkComplete}
                disabled={bulkProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {bulkProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {t('orders.actions.complete')} ({completableSelected.length})
              </button>
            )}
            <button
              onClick={handleBulkCancel}
              disabled={bulkProcessing || completableSelected.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {t('orders.actions.cancel')}
            </button>
            {canDelete && deletableSelected.length > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {bulkProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {t('orders.actions.delete')} ({deletableSelected.length})
              </button>
            )}
          </div>
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
                ? t('orders.noOrdersMatch')
                : t('orders.noOrders')}
            </p>
            {!searchQuery && !filters.status && canCreate && (
              <p className="text-sm text-slate-500 mt-1">{t('orders.createFirstOrder')}</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('orders.orderNumber')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('orders.customer')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('common.date')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('common.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('orders.invoice')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('common.total')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredOrders.map(order => {
                  const docInfo = documentInfo.get(order.id) || { count: 0 }
                  const canComplete = ['draft', 'pending_payment', 'on_hold'].includes(order.status)

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                        selectedIds.has(order.id) ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                      }`}
                    >
                      <td className="pl-4 pr-2 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 dark:text-slate-300">
                            {order.customer?.company_name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-4 h-4" />
                          {formatDate(order.order_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <PaymentBadge method={order.payment_method} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {docInfo.invoiceNumber ? (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-violet-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {docInfo.invoiceNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatPrice(order.total)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Document indicator - show count if multiple docs */}
                          {docInfo.count > 1 && (
                            <div
                              className="relative p-2"
                              title={`${docInfo.count} documents generated`}
                            >
                              <FileText className="w-4 h-4 text-violet-500" />
                              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {docInfo.count}
                              </span>
                            </div>
                          )}
                          {/* Quick complete button */}
                          {canComplete && (
                            <button
                              onClick={() => handleQuickComplete(order.id)}
                              className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors cursor-pointer"
                              title={t('orders.actions.markComplete')}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          {/* Edit button - only for non-completed/cancelled orders */}
                          {canEdit && !['completed', 'cancelled', 'refunded'].includes(order.status) && (
                            <button
                              onClick={() => setEditingOrder(order)}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
                              title={t('common.edit')}
                            >
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </button>
                          )}
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer"
                            title={t('orders.actions.view')}
                          >
                            <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </button>
                          {canDelete && ['draft', 'pending', 'pending_payment', 'on_hold'].includes(order.status) && (
                            <button
                              onClick={() => handleDelete(order)}
                              disabled={deleting === order.id}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                              title={t('orders.actions.delete')}
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
                  )
                })}
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
                ? t('orders.noOrdersMatch')
                : t('orders.noOrders')}
            </p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const docInfo = documentInfo.get(order.id) || { count: 0 }
            const canComplete = ['draft', 'pending_payment', 'on_hold'].includes(order.status)

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${
                  selectedIds.has(order.id) ? 'ring-2 ring-green-500' : ''
                }`}
              >
                {/* Top row: checkbox, order number + date, status + total */}
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {order.order_number}
                      </p>
                      {docInfo.invoiceNumber && (
                        <span className="text-xs text-violet-600 dark:text-violet-400 font-medium shrink-0">
                          {docInfo.invoiceNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(order.order_date)} · {order.items?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {formatPrice(order.total)}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>

                {/* Customer + Payment */}
                <div className="flex items-center justify-between mb-3 pl-7">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 truncate">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{order.customer?.company_name || '-'}</span>
                  </div>
                  <PaymentBadge method={order.payment_method} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  {canComplete && (
                    <button
                      onClick={() => handleQuickComplete(order.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium"
                    >
                      <Check className="w-4 h-4" />
                      {t('orders.actions.complete')}
                    </button>
                  )}
                  {canEdit && !['completed', 'cancelled', 'refunded'].includes(order.status) && (
                    <button
                      onClick={() => setEditingOrder(order)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                    >
                      <Pencil className="w-4 h-4" />
                      {t('common.edit')}
                    </button>
                  )}
                  <button
                    onClick={() => setViewingOrder(order)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    {t('orders.actions.view')}
                  </button>
                  {canDelete && ['draft', 'pending', 'pending_payment', 'on_hold'].includes(order.status) && (
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
            )
          })
        )}
      </div>

      {/* Order Form Modal (Create) */}
      {showForm && (
        <OrderForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}

      {/* Order Form Modal (Edit) */}
      {editingOrder && (
        <OrderForm
          editOrder={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            setEditingOrder(null)
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

      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowPaymentModal(null)
              setPendingCompleteId(null)
            }}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('orders.payment.selectMethod')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t('orders.payment.completeAs')}
              {showPaymentModal === 'bulk' && ` (${completableSelected.length})`}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handlePaymentConfirm('cash')}
                disabled={bulkProcessing}
                className="flex flex-col items-center gap-3 p-6 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-xl transition-colors disabled:opacity-50"
              >
                <Banknote className="w-10 h-10 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-300">{t('orders.payment.cash')}</span>
              </button>
              <button
                onClick={() => handlePaymentConfirm('bank')}
                disabled={bulkProcessing}
                className="flex flex-col items-center gap-3 p-6 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl transition-colors disabled:opacity-50"
              >
                <Building2 className="w-10 h-10 text-blue-600" />
                <span className="font-semibold text-blue-700 dark:text-blue-300">{t('orders.payment.bank')}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowPaymentModal(null)
                setPendingCompleteId(null)
              }}
              disabled={bulkProcessing}
              className="w-full px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
