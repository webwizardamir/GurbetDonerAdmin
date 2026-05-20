import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
  ChevronLeft,
  ChevronRight,
  Banknote,
  FileText,
  Mail,
  Check,
} from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { usePermission } from '../hooks/usePermission'
import type { OrderStatus, PaymentMethod } from '../types'
import type { OrderWithItems } from '../services/orders'
import { bulkUpdateOrderStatus, bulkDeleteOrders } from '../services/orders'
import { fetchDocumentInfoByOrder, type OrderDocumentInfo } from '../services/documents'
import { fetchSendCountsByOrder } from '../services/documentEmail'
import SortableTh from '../components/ui/SortableTh'
import { useTableSort } from '../hooks/useTableSort'
import OrderDetail from '../components/orders/OrderDetail'
import StatusBadge from '../components/ui/StatusBadge'
import PaymentBadge from '../components/ui/PaymentBadge'
import BulkActionsBar from '../components/orders/BulkActionsBar'
import { orderExportColumns } from '../utils/export'
import ExportMenu from '../components/ui/ExportMenu'
import { formatPrice, formatDate } from '../utils/format'

export default function Orders() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { canCreate, canEdit, canDelete } = usePermission('orders')
  const { orders, loading, error, filters, setFilters, refresh, remove, page, setPage, totalPages, totalCount } = useOrders()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams] = useSearchParams()
  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState<'single' | 'bulk' | null>(null)
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null)
  const [documentInfo, setDocumentInfo] = useState<Map<string, OrderDocumentInfo>>(new Map())
  const [sendInfo, setSendInfo] = useState<Record<string, { total: number; sent: number; failed: number }>>({})

  // Read URL params on mount to apply filters (e.g. ?status=pending_payment)
  // and redirect legacy ?new=1 links to the new editor route.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      navigate('/orders/new', { replace: true })
      return
    }
    const urlStatus = searchParams.get('status')
    if (urlStatus) {
      setFilters({ status: urlStatus as OrderStatus })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when inline payment modal is open
  useEffect(() => {
    if (!showPaymentModal) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [showPaymentModal])

  // Debounced server-side search: sends order_number filter to API after 300ms
  const [searchInitialized, setSearchInitialized] = useState(false)
  useEffect(() => {
    if (!searchInitialized) { setSearchInitialized(true); return }
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side filter also matches customer name and legacy WC invoice numbers
  // (server-side search already queries order_number + woo_invoice_number).
  const filteredOrdersUnsorted = useMemo(() => orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const invoiceNum = documentInfo.get(order.id)?.invoiceNumber?.toLowerCase() || ''
    const wooInvoice = order.woo_invoice_number ? String(order.woo_invoice_number) : ''
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer?.company_name?.toLowerCase().includes(query) ||
      invoiceNum.includes(query) ||
      wooInvoice.includes(query)
    )
  }), [orders, searchQuery, documentInfo])

  // Phase 6: sortable columns. Default = order_date desc (newest first)
  type OrderSortKey = 'order_number' | 'customer' | 'order_date' | 'status' | 'invoice' | 'total'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<OrderSortKey>('order_date', 'desc')

  const filteredOrders = useMemo(() => sortBy(filteredOrdersUnsorted, {
    order_number: o => o.order_number,
    customer:     o => o.customer?.company_name ?? '',
    order_date:   o => o.order_date ?? o.created_at ?? '',
    status:       o => o.status,
    invoice:      o => documentInfo.get(o.id)?.invoiceNumber ?? (o.woo_invoice_number ? String(o.woo_invoice_number) : ''),
    total:        o => o.total ?? 0,
  }), [filteredOrdersUnsorted, sortBy, documentInfo])

  useEffect(() => {
    const orderIds = orders.map(o => o.id)
    if (orderIds.length > 0) {
      fetchDocumentInfoByOrder(orderIds).then(info => setDocumentInfo(info)).catch(console.error)
    }
    // Phase 5: one query for every order's send-status indicator
    fetchSendCountsByOrder().then(setSendInfo).catch(console.error)
  }, [orders])

  useEffect(() => { setSelectedIds(new Set()) }, [filters, searchQuery])

  const selectedOrders = filteredOrders.filter(o => selectedIds.has(o.id))
  const completableSelected = selectedOrders.filter(o => ['draft', 'pending_payment', 'on_hold'].includes(o.status))
  const deletableSelected = selectedOrders.filter(o => ['draft', 'pending', 'pending_payment', 'on_hold'].includes(o.status))

  const handleDelete = async (order: OrderWithItems) => {
    if (!confirm(t('orders.confirmDelete', { number: order.order_number }))) return
    setDeleting(order.id)
    try { await remove(order.id) } catch { /* Error handled by hook */ }
    finally { setDeleting(null) }
  }

  const handleStatusFilter = (status: OrderStatus | '') => setFilters({ ...filters, status: status || undefined })
  const handlePaymentFilter = (method: PaymentMethod | '') => setFilters({ ...filters, paymentMethod: method || undefined })

  const exportFilterSummary = useMemo(() => {
    const parts: string[] = []
    if (filters.status) {
      const statusMap: Record<string, string> = {
        draft: 'Concept', pending_payment: 'In afwachting', completed: 'Voltooid',
        cancelled: 'Geannuleerd', refunded: 'Terugbetaald', on_hold: 'In wacht',
      }
      parts.push(`Status: ${statusMap[filters.status] || filters.status}`)
    }
    if (filters.paymentMethod) parts.push(`Betaling: ${filters.paymentMethod === 'cash' ? 'Contant' : 'Bank'}`)
    if (searchQuery) parts.push(`Zoekterm: ${searchQuery}`)
    return parts.join(' · ')
  }, [filters.status, filters.paymentMethod, searchQuery])

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id)
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredOrders.map(o => o.id)))
  }

  const handleQuickComplete = (orderId: string) => {
    setPendingCompleteId(orderId)
    setShowPaymentModal('single')
  }

  const handleBulkComplete = () => {
    if (completableSelected.length === 0) return
    setShowPaymentModal('bulk')
  }

  const handlePaymentConfirm = async (method: PaymentMethod) => {
    try {
      setBulkProcessing(true)
      if (showPaymentModal === 'single' && pendingCompleteId) {
        await bulkUpdateOrderStatus([pendingCompleteId], 'completed', method)
      } else if (showPaymentModal === 'bulk') {
        await bulkUpdateOrderStatus(completableSelected.map(o => o.id), 'completed', method)
        setSelectedIds(new Set())
      }
      refresh()
    } catch (err) { console.error('Failed to complete order(s):', err) }
    finally { setBulkProcessing(false); setShowPaymentModal(null); setPendingCompleteId(null) }
  }

  const handleBulkCancel = async () => {
    const cancellable = selectedOrders.filter(o => ['draft', 'pending_payment', 'on_hold'].includes(o.status))
    if (cancellable.length === 0) return
    if (!confirm(t('orders.confirmCancel', { count: cancellable.length }))) return
    try {
      setBulkProcessing(true)
      await bulkUpdateOrderStatus(cancellable.map(o => o.id), 'cancelled')
      setSelectedIds(new Set()); refresh()
    } catch (err) { console.error('Failed to cancel orders:', err) }
    finally { setBulkProcessing(false) }
  }

  const handleBulkDelete = async () => {
    if (deletableSelected.length === 0) return
    if (!confirm(t('orders.confirmBulkDelete', { count: deletableSelected.length }))) return
    try {
      setBulkProcessing(true)
      await bulkDeleteOrders(deletableSelected.map(o => o.id))
      setSelectedIds(new Set()); refresh()
    } catch (err) { console.error('Failed to delete orders:', err) }
    finally { setBulkProcessing(false) }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('orders.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select value={filters.status || ''} onChange={e => handleStatusFilter(e.target.value as OrderStatus | '')}
              className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer">
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
          <div className="relative">
            <select value={filters.paymentMethod || ''} onChange={e => handlePaymentFilter(e.target.value as PaymentMethod | '')}
              className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer">
              <option value="">{t('orders.allPayment')}</option>
              <option value="cash">{t('orders.payment.cash')}</option>
              <option value="bank">{t('orders.payment.bank')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <ExportMenu
            data={filteredOrders}
            columns={orderExportColumns as never}
            filename={`orders-${new Date().toISOString().split('T')[0]}`}
            pdfTitle="Bestellingen"
            pdfFilterSummary={exportFilterSummary || undefined}
          />
          <div className="hidden sm:block flex-1" />
          {canCreate && (
            <button onClick={() => navigate('/orders/new')}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap shrink-0">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('orders.newOrder')}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <BulkActionsBar
        selectedCount={selectedIds.size}
        completableCount={completableSelected.length}
        deletableCount={deletableSelected.length}
        bulkProcessing={bulkProcessing}
        canDelete={canDelete}
        onClear={() => setSelectedIds(new Set())}
        onBulkComplete={handleBulkComplete}
        onBulkCancel={handleBulkCancel}
        onBulkDelete={handleBulkDelete}
      />

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{searchQuery || filters.status ? t('orders.noOrdersMatch') : t('orders.noOrders')}</p>
            {!searchQuery && !filters.status && canCreate && <p className="text-sm text-slate-500 mt-1">{t('orders.createFirstOrder')}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                  </th>
                  <SortableTh sortKey="order_number" current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('orders.orderNumber')}</SortableTh>
                  <SortableTh sortKey="customer"     current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('orders.customer')}</SortableTh>
                  <SortableTh sortKey="order_date"   current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('common.date')}</SortableTh>
                  <SortableTh sortKey="status"       current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('common.status')}</SortableTh>
                  <SortableTh sortKey="invoice"      current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('orders.invoice')}</SortableTh>
                  <SortableTh sortKey="total"        current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('common.total')}</SortableTh>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredOrders.map(order => {
                  const docInfo = documentInfo.get(order.id) || { count: 0 }
                  const canComplete = ['draft', 'pending_payment', 'on_hold'].includes(order.status)
                  return (
                    <tr key={order.id} onClick={() => setViewingOrder(order)} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${selectedIds.has(order.id) ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                      <td className="pl-4 pr-2 py-4" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{order.order_number}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 dark:text-slate-300">{order.customer?.company_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Calendar className="w-4 h-4" />{formatDate(order.order_date)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2"><StatusBadge status={order.status} /><PaymentBadge method={order.payment_method} /></div>
                      </td>
                      <td className="px-4 py-4">
                        {(() => {
                          const invoice = docInfo.invoiceNumber || (order.woo_invoice_number ? String(order.woo_invoice_number) : null)
                          if (!invoice) return <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
                          return (
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-violet-500" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{invoice}</span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-4 text-right"><span className="font-semibold text-slate-900 dark:text-white">{formatPrice(order.total)}</span></td>
                      <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {docInfo.count > 1 && (
                            <div className="relative p-2" title={`${docInfo.count} documents generated`}>
                              <FileText className="w-4 h-4 text-violet-500" />
                              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{docInfo.count}</span>
                            </div>
                          )}
                          {(() => {
                            const s = sendInfo[order.id]
                            if (!s || s.total === 0) return null
                            const allOk = s.failed === 0
                            return (
                              <div
                                className="relative p-2"
                                title={`${s.sent}/${s.total} ${allOk ? 'sent' : `sent (${s.failed} failed)`}`}
                              >
                                <Mail className={`w-4 h-4 ${allOk ? 'text-emerald-500' : 'text-red-500'}`} />
                                {s.total > 1 && (
                                  <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 ${allOk ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                                    {s.total}
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                          {canComplete && (
                            <button onClick={() => handleQuickComplete(order.id)} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.markComplete')}>
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          {canEdit && !['completed', 'cancelled', 'refunded'].includes(order.status) && (
                            <button onClick={() => navigate(`/orders/${order.id}/edit`)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer" title={t('common.edit')}>
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </button>
                          )}
                          <button onClick={() => setViewingOrder(order)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.view')}>
                            <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </button>
                          {canDelete && ['draft', 'pending', 'pending_payment', 'on_hold'].includes(order.status) && (
                            <button onClick={() => handleDelete(order)} disabled={deleting === order.id} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.delete')}>
                              {deleting === order.id ? <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
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
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{searchQuery || filters.status ? t('orders.noOrdersMatch') : t('orders.noOrders')}</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const docInfo = documentInfo.get(order.id) || { count: 0 }
            const canComplete = ['draft', 'pending_payment', 'on_hold'].includes(order.status)
            return (
              <div key={order.id} onClick={() => setViewingOrder(order)} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50 ${selectedIds.has(order.id) ? 'ring-2 ring-green-500' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{order.order_number}</p>
                      {(docInfo.invoiceNumber || order.woo_invoice_number) && (
                        <span className="text-xs text-violet-600 dark:text-violet-400 font-medium shrink-0">
                          {docInfo.invoiceNumber || order.woo_invoice_number}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(order.order_date)} · {order.items?.length || 0} items</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-green-600 dark:text-green-400">{formatPrice(order.total)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3 pl-7">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 truncate">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{order.customer?.company_name || '-'}</span>
                  </div>
                  <PaymentBadge method={order.payment_method} />
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 flex-wrap" onClick={e => e.stopPropagation()}>
                  {canComplete && (
                    <button onClick={() => handleQuickComplete(order.id)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium whitespace-nowrap">
                      <Check className="w-4 h-4 flex-shrink-0" />{t('orders.actions.complete')}
                    </button>
                  )}
                  {canEdit && !['completed', 'cancelled', 'refunded'].includes(order.status) && (
                    <button onClick={() => navigate(`/orders/${order.id}/edit`)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium whitespace-nowrap">
                      <Pencil className="w-4 h-4 flex-shrink-0" />{t('common.edit')}
                    </button>
                  )}
                  <button onClick={() => setViewingOrder(order)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium whitespace-nowrap">
                    <Eye className="w-4 h-4 flex-shrink-0" />{t('orders.actions.view')}
                  </button>
                  {canDelete && ['draft', 'pending', 'pending_payment', 'on_hold'].includes(order.status) && (
                    <button onClick={() => handleDelete(order)} disabled={deleting === order.id} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      {deleting === order.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-3">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            <span className="hidden sm:inline">{t('common.showing')} </span>{((page - 1) * 50) + 1}-{Math.min(page * 50, totalCount)} <span className="hidden sm:inline">{t('common.of')}</span><span className="sm:hidden">/</span> {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {(() => {
              const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 7
              return Array.from({ length: Math.min(totalPages, maxVisible) }, (_, i) => {
                let pageNum: number
                const half = Math.floor(maxVisible / 2)
                if (totalPages <= maxVisible) {
                  pageNum = i + 1
                } else if (page <= half + 1) {
                  pageNum = i + 1
                } else if (page >= totalPages - half) {
                  pageNum = totalPages - maxVisible + 1 + i
                } else {
                  pageNum = page - half + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      pageNum === page
                        ? 'bg-green-600 text-white font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })
            })()}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewingOrder && <OrderDetail order={viewingOrder} onClose={() => setViewingOrder(null)} onStatusChange={() => { setViewingOrder(null); refresh() }} />}

      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowPaymentModal(null); setPendingCompleteId(null) }} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('orders.payment.selectMethod')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t('orders.payment.completeAs')}
              {showPaymentModal === 'bulk' && ` (${completableSelected.length})`}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button onClick={() => handlePaymentConfirm('cash')} disabled={bulkProcessing}
                className="flex flex-col items-center gap-3 p-6 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-xl transition-colors disabled:opacity-50">
                <Banknote className="w-10 h-10 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-300">{t('orders.payment.cash')}</span>
              </button>
              <button onClick={() => handlePaymentConfirm('bank')} disabled={bulkProcessing}
                className="flex flex-col items-center gap-3 p-6 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl transition-colors disabled:opacity-50">
                <Building2 className="w-10 h-10 text-blue-600" />
                <span className="font-semibold text-blue-700 dark:text-blue-300">{t('orders.payment.bank')}</span>
              </button>
            </div>
            <button onClick={() => { setShowPaymentModal(null); setPendingCompleteId(null) }} disabled={bulkProcessing}
              className="w-full px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
