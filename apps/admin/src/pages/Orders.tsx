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
  ChevronLeft,
  ChevronRight,
  Banknote,
  FileText,
  Mail,
  Check,
  RotateCcw,
  StickyNote,
  ReceiptText,
  EyeOff,
} from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { usePermission } from '../hooks/usePermission'
import type { OrderStatus, PaymentMethod } from '../types'
import type { OrderWithItems, OrderFilters } from '../services/orders'
import { bulkUpdateOrderStatus, bulkDeleteOrders, fetchOrders, fetchOrderById, getOrderStatusCounts, restoreOrder, purgeOrder, emptyOrderTrash } from '../services/orders'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { fetchDocumentInfoByOrder, type OrderDocumentInfo } from '../services/documents'
import { fetchSendCountsByOrder } from '../services/documentEmail'
import SortableTh from '../components/ui/SortableTh'
import { useTableSort } from '../hooks/useTableSort'
import { useUrlListState } from '../hooks/useUrlListState'
import OrderDetail from '../components/orders/OrderDetail'
import OrderNotesModal from '../components/orders/OrderNotesModal'
import StatusBadge from '../components/ui/StatusBadge'
import PaymentBadge from '../components/ui/PaymentBadge'
import BulkActionsBar from '../components/orders/BulkActionsBar'
import CustomerFilterSelect from '../components/orders/CustomerFilterSelect'
import HiddenOrderBadge from '../components/orders/HiddenOrderBadge'
import MultiSelectFilter from '../components/ui/MultiSelectFilter'
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from '../constants/customerType'
import { orderExportColumns, withoutCostColumns } from '../utils/export'
import ExportMenu from '../components/ui/ExportMenu'
import SelectionBar from '../components/ui/SelectionBar'
import { formatPrice, formatDateShort, formatDateTime, formatDayMonth, formatTimeShort, formatPercent, profitClass } from '../utils/format'
import { computeOrderProfit } from '../utils/orderProfit'
import { useAuth } from '../context/AuthContext'

// Canonical display order for the status filter dropdown. This is only an ordering hint —
// the dropdown shows a status ONLY when it actually has orders (count > 0), so unused enum
// values (e.g. pending_payment, on_hold) never clutter the list. Any status with orders that
// isn't listed here is appended after these, and the currently-selected status stays visible
// even at count 0 so the select never goes blank.
const STATUS_FILTER_ORDER = ['draft', 'pending', 'pending_payment', 'on_hold', 'completed', 'cancelled', 'refunded']

export default function Orders() {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const navigate = useNavigate()
  const { canCreate, canEdit, canDelete } = usePermission('orders')

  // View state lives in the URL so editing an order (a full route change to
  // /orders/:id/edit) and coming back restores the page + filters — see
  // useUrlListState. This also covers the inbound Dashboard links such as
  // /orders?status=pending_payment, which used to be handled by a separate
  // mount effect below.
  const [urlInit, setUrlState] = useUrlListState({
    page: 1,
    q: '',
    status: [] as string[],
    payment: [] as string[],
    type: [] as string[],
    customer: '',
    trashed: false,
    // '' (= all) is the default, so it drops out of the URL entirely.
    hidden: '',
  })

  const { orders, loading, error, filters, setFilters, refresh, remove, page, setPage, totalPages, totalCount } = useOrders({
    search: urlInit.q || undefined,
    status: urlInit.status.length ? (urlInit.status as OrderStatus[]) : undefined,
    paymentMethod: urlInit.payment.length ? (urlInit.payment as PaymentMethod[]) : undefined,
    customerType: urlInit.type.length ? urlInit.type : undefined,
    customerId: urlInit.customer || undefined,
    trashed: urlInit.trashed || undefined,
    hidden: (urlInit.hidden || undefined) as OrderFilters['hidden'],
  }, urlInit.page)

  const goToPage = (next: number) => { setPage(next); setUrlState({ page: next }) }

  const [searchQuery, setSearchQuery] = useState(urlInit.q)
  const [searchParams] = useSearchParams()
  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null)
  const [notesOrder, setNotesOrder] = useState<OrderWithItems | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [purgeTarget, setPurgeTarget] = useState<OrderWithItems | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [emptying, setEmptying] = useState(false)
  const trashed = !!filters.trashed
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState<'single' | 'bulk' | null>(null)
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null)
  const [documentInfo, setDocumentInfo] = useState<Map<string, OrderDocumentInfo>>(new Map())
  const [sendInfo, setSendInfo] = useState<Record<string, { total: number; sent: number; failed: number; invoiceSent: boolean }>>({})
  const [statusCounts, setStatusCounts] = useState<Record<string, number> & { total: number }>({ total: 0 })

  // One-shot URL params on mount. The filter params (?status=, ?q=, ...) are NOT
  // handled here — useUrlListState above already seeded the hook with them.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      navigate('/orders/new', { replace: true })
      return
    }
    // Open a specific order's detail panel when linked via ?order=<id>
    // (e.g. clicking the order number on the Invoices page). The order may not
    // be in the current paginated list, so fetch it directly.
    const urlOrderId = searchParams.get('order')
    if (urlOrderId) {
      fetchOrderById(urlOrderId).then(order => {
        if (order) setViewingOrder(order)
      }).catch(console.error)
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
  // Skips its initial run, so the URL is only written on a real user change —
  // never on mount, where it could clobber the params we just read.
  const [searchInitialized, setSearchInitialized] = useState(false)
  useEffect(() => {
    if (!searchInitialized) { setSearchInitialized(true); return }
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery || undefined })
      setUrlState({ q: searchQuery, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Instant-feedback filter over the already-loaded page (the 300ms before the
  // server refetch lands). Mirrors the server search — order_number, customer
  // company name + contact person, WC invoice — plus the app-generated invoice
  // number which only exists client-side in documentInfo. Must stay a superset
  // of the server match so it never hides a valid server result.
  const filteredOrdersUnsorted = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase()
    if (!trimmed) return orders
    const tokens = trimmed.split(/\s+/).filter(Boolean)
    return orders.filter(order => {
      const invoiceNum = documentInfo.get(order.id)?.invoiceNumber?.toLowerCase() || ''
      const wooInvoice = order.woo_invoice_number ? String(order.woo_invoice_number) : ''
      const name = order.customer?.company_name?.toLowerCase() || ''
      const contact = order.customer?.contact_person?.toLowerCase() || ''
      const orderNum = order.order_number.toLowerCase()
      // Customer matches when every token hits the name or contact (mirrors the
      // server AND-token match); order_number / invoice match the full phrase.
      const customerMatch = tokens.every(tok => name.includes(tok) || contact.includes(tok))
      return (
        customerMatch ||
        orderNum.includes(trimmed) ||
        invoiceNum.includes(trimmed) ||
        wooInvoice.includes(trimmed)
      )
    })
  }, [orders, searchQuery, documentInfo])

  // Phase 6: sortable columns. Default = order_date desc (newest first)
  type OrderSortKey = 'order_number' | 'customer' | 'order_date' | 'created_at' | 'status' | 'invoice' | 'total'
  // Default: newest order_date first.
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<OrderSortKey>('order_date', 'desc')

  const filteredOrders = useMemo(() => sortBy(filteredOrdersUnsorted, {
    order_number: o => o.order_number,
    customer:     o => o.customer?.company_name ?? '',
    order_date:   o => o.order_date ?? o.created_at ?? '',
    created_at:   o => o.created_at ?? '',
    status:       o => o.status,
    invoice:      o => documentInfo.get(o.id)?.invoiceNumber ?? (o.woo_invoice_number ? String(o.woo_invoice_number) : ''),
    total:        o => o.total ?? 0,
  }), [filteredOrdersUnsorted, sortBy, documentInfo])

  // Refetch the per-order invoice number + send-status maps for the current
  // page. Extracted so it can also be triggered after a document is generated in
  // the detail modal (so the invoice column updates without a page refresh).
  const refreshDocInfo = () => {
    const orderIds = orders.map(o => o.id)
    if (orderIds.length === 0) { setDocumentInfo(new Map()); setSendInfo({}); return }
    fetchDocumentInfoByOrder(orderIds).then(info => setDocumentInfo(info)).catch(console.error)
    fetchSendCountsByOrder(orderIds).then(setSendInfo).catch(console.error)
  }

  useEffect(() => {
    refreshDocInfo()
    // WC-style per-status counts for the status filter dropdown. Refetched when
    // the orders list changes so they stay fresh after completing/cancelling.
    getOrderStatusCounts().then(setStatusCounts).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])

  useEffect(() => { setSelectedIds(new Set()) }, [filters, searchQuery])

  const selectedOrders = filteredOrders.filter(o => selectedIds.has(o.id))
  const completableSelected = selectedOrders.filter(o => ['draft', 'pending_payment', 'on_hold'].includes(o.status))
  const deletableSelected = selectedOrders.filter(o => ['draft', 'pending', 'pending_payment', 'on_hold', 'cancelled'].includes(o.status))

  const handleDelete = async (order: OrderWithItems) => {
    if (!confirm(t('orders.confirmTrash', { number: order.order_number }))) return
    setDeleting(order.id)
    try { await remove(order.id); refresh() } catch { /* Error handled by hook */ }
    finally { setDeleting(null) }
  }

  const handleRestore = async (order: OrderWithItems) => {
    setDeleting(order.id)
    try { await restoreOrder(order.id); refresh() } catch (e) { console.error('Restore failed:', e) }
    finally { setDeleting(null) }
  }

  const handlePurge = async () => {
    if (!purgeTarget) return
    setDeleting(purgeTarget.id)
    try { await purgeOrder(purgeTarget.id); setPurgeTarget(null); refresh() }
    catch (e) { console.error('Purge failed:', e) }
    finally { setDeleting(null) }
  }

  const handleEmptyTrash = async () => {
    setEmptying(true)
    try { await emptyOrderTrash(); setConfirmEmpty(false); refresh() }
    catch (e) { console.error('Empty trash failed:', e) }
    finally { setEmptying(false) }
  }

  const toggleTrashView = () => {
    setSelectedIds(new Set())
    setFilters({ ...filters, trashed: !trashed, status: undefined })
    setUrlState({ trashed: !trashed, status: [], page: 1 })
  }

  // The status/payment/type filters are multi-select. Store as arrays (undefined
  // when empty so the query skips the filter). fetchOrders normalizes single-or-array.
  const toArr = <T,>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])
  const statusFilter = toArr(filters.status as OrderStatus | OrderStatus[] | undefined)
  const paymentFilter = toArr(filters.paymentMethod as PaymentMethod | PaymentMethod[] | undefined)
  const typeFilter = toArr(filters.customerType)
  // Each handler mirrors its value into the URL alongside the fetch filter, so a
  // round-trip to the order editor comes back to the same view.
  const handleStatusFilter = (values: string[]) => {
    setFilters({ ...filters, status: values.length ? (values as OrderStatus[]) : undefined })
    setUrlState({ status: values, page: 1 })
  }
  const handlePaymentFilter = (values: string[]) => {
    setFilters({ ...filters, paymentMethod: values.length ? (values as PaymentMethod[]) : undefined })
    setUrlState({ payment: values, page: 1 })
  }
  const handleCustomerTypeFilter = (values: string[]) => {
    setFilters({ ...filters, customerType: values.length ? values : undefined })
    setUrlState({ type: values, page: 1 })
  }
  // Owner-only. Written from an event handler, never an effect — see the
  // one-directional URL contract in hooks/useUrlListState.ts.
  const handleHiddenFilter = (value: string) => {
    setFilters({ ...filters, hidden: (value || undefined) as OrderFilters['hidden'] })
    setUrlState({ hidden: value, page: 1 })
  }

  // Attach the displayed invoice number (app-generated, else legacy WC) to a row
  // so the export's optional "Factuurnummer" column can render it. The number
  // lives in a separate lookup, not on the order itself.
  const withInvoiceNumber = (order: OrderWithItems, info: Map<string, OrderDocumentInfo>) => ({
    ...order,
    invoice_number: info.get(order.id)?.invoiceNumber
      || (order.woo_invoice_number ? String(order.woo_invoice_number) : ''),
  })

  // Same idea for the owner-only COG columns: computeTotalsRow reads row[key],
  // so Inkoopwaarde/Winst/Marge have to be REAL fields on the exported object,
  // not just a format() callback, or the "Totaal" row sums zero.
  // computeOrderProfit is the single definition of the ex-VAT profit convention
  // (revenue = subtotal, shipping excluded) — do not inline a second one here.
  const withExportFields = (order: OrderWithItems, info: Map<string, OrderDocumentInfo>) => {
    const base = withInvoiceNumber(order, info)
    if (!isOwner) return base
    const p = computeOrderProfit(order)
    return { ...base, total_cost: p.totalCost, profit: p.profit, margin_pct: p.margin }
  }

  const orderExportColumnsGated = useMemo(
    () => (isOwner ? orderExportColumns : withoutCostColumns(orderExportColumns)),
    [isOwner],
  )

  const exportGetAllData = async () => {
    const all = await fetchOrders({ ...filters, limit: 100000, offset: 0 })
    const info = await fetchDocumentInfoByOrder(all.map(o => o.id))
    return all.map(o => withExportFields(o, info))
  }

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
          <MultiSelectFilter
            selected={statusFilter}
            onChange={handleStatusFilter}
            options={[
              ...STATUS_FILTER_ORDER,
              ...Object.keys(statusCounts).filter(s => s !== 'total' && !STATUS_FILTER_ORDER.includes(s)),
            ]
              .filter(s => (statusCounts[s] ?? 0) > 0 || (statusFilter as string[]).includes(s))
              .map(s => ({ value: s, label: `${t(`orders.status.${s}`, { defaultValue: s })} (${statusCounts[s] ?? 0})` }))}
            allLabel={`${t('orders.allStatus')} (${statusCounts.total})`}
            searchPlaceholder={t('orders.filterSearch')}
            selectAllLabel={t('orders.selectAll')}
            noResultsLabel={t('common.noResults')}
            renderCount={n => t('orders.filterSelected', { count: n })}
          />
          <MultiSelectFilter
            selected={paymentFilter}
            onChange={handlePaymentFilter}
            options={[
              { value: 'cash', label: t('orders.payment.cash') },
              { value: 'bank', label: t('orders.payment.bank') },
            ]}
            allLabel={t('orders.allPayment')}
            searchPlaceholder={t('orders.filterSearch')}
            selectAllLabel={t('orders.selectAll')}
            noResultsLabel={t('common.noResults')}
            renderCount={n => t('orders.filterSelected', { count: n })}
          />
          <MultiSelectFilter
            aria-label="Type"
            selected={typeFilter}
            onChange={handleCustomerTypeFilter}
            options={CUSTOMER_TYPES.map(ct => ({ value: ct, label: CUSTOMER_TYPE_LABELS[ct] }))}
            allLabel={t('orders.allTypes')}
            searchPlaceholder={t('orders.filterSearch')}
            selectAllLabel={t('orders.selectAll')}
            noResultsLabel={t('common.noResults')}
            renderCount={n => t('orders.filterSelected', { count: n })}
          />
          <CustomerFilterSelect
            value={filters.customerId}
            onChange={(customerId) => {
              setFilters({ ...filters, customerId })
              setUrlState({ customer: customerId || '', page: 1 })
            }}
          />
          {/* Owner-only. A shop manager never sees hidden orders at all (RLS),
              so the control would be meaningless for them. */}
          {isOwner && (
            <div className="relative">
              <EyeOff className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                aria-label={t('orders.hidden.filterLabel')}
                value={filters.hidden ?? ''}
                onChange={e => handleHiddenFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
              >
                <option value="">{t('orders.hidden.filterAll')}</option>
                <option value="only">{t('orders.hidden.filterHidden')}</option>
                <option value="none">{t('orders.hidden.filterVisible')}</option>
              </select>
            </div>
          )}
          <ExportMenu
            getAllData={exportGetAllData}
            pageData={filteredOrders.map(o => withExportFields(o, documentInfo))}
            selectedData={selectedOrders.map(o => withExportFields(o, documentInfo))}
            totalCount={totalCount}
            columns={orderExportColumnsGated as never}
            filename={`orders-${new Date().toISOString().split('T')[0]}`}
            pdfTitle="Bestellingen"
            storageKey="orders"
          />
          <button onClick={toggleTrashView}
            className={`inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 border ${
              trashed
                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={t('orders.trash.title')} aria-label={t('orders.trash.title')}>
            <Trash2 className="w-5 h-5" />
            <span className="hidden sm:inline">{t('orders.trash.title')}</span>
          </button>
          <div className="hidden sm:block flex-1" />
          {trashed && totalCount > 0 && (
            <button onClick={() => setConfirmEmpty(true)}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap shrink-0">
              <Trash2 className="w-5 h-5" />
              <span className="hidden sm:inline">{t('orders.trash.emptyTrash')}</span>
            </button>
          )}
          {canCreate && !trashed && (
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

      {!trashed && (
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
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{trashed ? t('orders.trash.empty') : (searchQuery || filters.status ? t('orders.noOrdersMatch') : t('orders.noOrders'))}</p>
            {!trashed && !searchQuery && !filters.status && canCreate && <p className="text-sm text-slate-500 mt-1">{t('orders.createFirstOrder')}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[930px] lg:min-w-[1040px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                  </th>
                  <SortableTh sortKey="order_number" current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('orders.orderColumn')}</SortableTh>
                  <SortableTh sortKey="order_date"   current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('common.date')}</SortableTh>
                  <SortableTh sortKey="created_at"   current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('orders.createdColumn')}</SortableTh>
                  <SortableTh sortKey="status"       current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('common.status')}</SortableTh>
                  <SortableTh sortKey="invoice"      current={sortKey} dir={sortDir} onToggle={toggleSort} className="hidden lg:table-cell">{t('orders.invoice')}</SortableTh>
                  <SortableTh sortKey="total"        current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('common.total')}</SortableTh>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredOrders.map(order => {
                  const docInfo = documentInfo.get(order.id) || { count: 0 }
                  const canComplete = ['draft', 'pending_payment', 'on_hold'].includes(order.status)
                  // Cancelled/refunded orders can't be item-edited (stock was already
                  // restored — re-running the editor would corrupt it). Their Edit
                  // icon opens the safe notes-only editor instead.
                  const notesOnly = ['cancelled', 'refunded'].includes(order.status)
                  return (
                    <tr key={order.id} onClick={() => setViewingOrder(order)} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${selectedIds.has(order.id) ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                      <td className="pl-4 pr-2 py-4" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">{order.customer?.company_name || '-'}</p>
                              <HiddenOrderBadge hidden={order.hidden_from_managers} />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">#{order.order_number} · {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Calendar className="w-4 h-4" />{formatDateShort(order.order_date)}</div>
                      </td>
                      <td className="px-4 py-4 w-[104px] whitespace-nowrap">
                        <div className="flex flex-col leading-tight tabular-nums" title={formatDateTime(order.created_at)}>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{formatDayMonth(order.created_at)}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{formatTimeShort(order.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={trashed ? (order.pre_trash_status || order.status) : order.status} />
                          <PaymentBadge method={order.payment_method} />
                          {(order.refund_amount ?? 0) > 0 && (order.refund_amount ?? 0) < order.total && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 whitespace-nowrap" title={t('orders.refund.partiallyRefunded')}>
                              <RotateCcw className="w-3 h-3" />{t('orders.refund.partiallyRefunded')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
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
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(order.total)}</span>
                        {isOwner && (() => {
                          const op = computeOrderProfit(order)
                          if (op.totalCost <= 0) return null
                          return (
                            <span className={`block text-[11px] font-medium tabular-nums ${profitClass(op.profit)}`}>
                              {formatPrice(op.profit)} · {formatPercent(op.margin)}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                        {trashed ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleRestore(order)} disabled={deleting === order.id} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.trash.restore')}>
                              {deleting === order.id ? <Loader2 className="w-4 h-4 text-green-600 animate-spin" /> : <RotateCcw className="w-4 h-4 text-green-600" />}
                            </button>
                            <button onClick={() => setViewingOrder(order)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.view')}>
                              <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </button>
                            <button onClick={() => setPurgeTarget(order)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.trash.purge')} aria-label={t('orders.trash.purge')}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        ) : (
                        <div className="flex items-center justify-end gap-0.5">
                          {docInfo.count > 1 && (
                            <button type="button" onClick={() => setViewingOrder(order)} className="relative p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer" title={t('orders.docsTooltip', { count: docInfo.count })}>
                              <FileText className="w-4 h-4 text-violet-500" />
                              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{docInfo.count}</span>
                            </button>
                          )}
                          {(() => {
                            const s = sendInfo[order.id]
                            if (!s || s.total === 0) return null
                            const allOk = s.failed === 0
                            return (
                              <button
                                type="button"
                                onClick={() => setViewingOrder(order)}
                                className="relative p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer"
                                title={allOk
                                  ? t('orders.emailsSentTooltip', { sent: s.sent, total: s.total })
                                  : t('orders.emailsFailedTooltip', { sent: s.sent, total: s.total, failed: s.failed })}
                              >
                                <Mail className={`w-4 h-4 ${allOk ? 'text-emerald-500' : 'text-red-500'}`} />
                                {s.total > 1 && (
                                  <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 ${allOk ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                                    {s.total}
                                  </span>
                                )}
                              </button>
                            )
                          })()}
                          {sendInfo[order.id]?.invoiceSent && (
                            <button type="button" onClick={() => setViewingOrder(order)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer" title={t('orders.invoiceEmailedTooltip')}>
                              <ReceiptText className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}
                          {canComplete && (
                            <button onClick={() => handleQuickComplete(order.id)} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.markComplete')}>
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          {canEdit && (
                            notesOnly ? (
                              <button onClick={() => setNotesOrder(order)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.notes.editNotes')}>
                                <StickyNote className="w-4 h-4 text-blue-500" />
                              </button>
                            ) : (
                              <button onClick={() => navigate(`/orders/${order.id}/edit`)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer" title={t('common.edit')}>
                                <Pencil className="w-4 h-4 text-blue-500" />
                              </button>
                            )
                          )}
                          <button onClick={() => setViewingOrder(order)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.view')}>
                            <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </button>
                          {canDelete && ['draft', 'pending', 'pending_payment', 'on_hold', 'cancelled'].includes(order.status) && (
                            <button onClick={() => handleDelete(order)} disabled={deleting === order.id} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.delete')}>
                              {deleting === order.id ? <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                            </button>
                          )}
                        </div>
                        )}
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
        {/* The cards already have per-row checkboxes; this adds the select-all
            that only existed in the desktop table header. */}
        {!loading && filteredOrders.length > 0 && (
          <SelectionBar
            selectedCount={selectedIds.size}
            visibleCount={filteredOrders.length}
            onToggleSelectAll={toggleSelectAll}
            onClear={() => setSelectedIds(new Set())}
          />
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{trashed ? t('orders.trash.empty') : (searchQuery || filters.status ? t('orders.noOrdersMatch') : t('orders.noOrders'))}</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const docInfo = documentInfo.get(order.id) || { count: 0 }
            const canComplete = ['draft', 'pending_payment', 'on_hold'].includes(order.status)
            const notesOnly = ['cancelled', 'refunded'].includes(order.status)
            return (
              <div key={order.id} onClick={() => setViewingOrder(order)} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50 ${selectedIds.has(order.id) ? 'ring-2 ring-green-500' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{order.customer?.company_name || '-'}</p>
                      {(docInfo.invoiceNumber || order.woo_invoice_number) && (
                        <span className="text-xs text-violet-600 dark:text-violet-400 font-medium shrink-0">
                          {docInfo.invoiceNumber || order.woo_invoice_number}
                        </span>
                      )}
                      <HiddenOrderBadge hidden={order.hidden_from_managers} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">#{order.order_number} · {formatDateShort(order.order_date)} · {order.items?.length || 0} items</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{t('orders.createdColumn')} {formatDayMonth(order.created_at)} {formatTimeShort(order.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-green-600 dark:text-green-400">{formatPrice(order.total)}</p>
                    {isOwner && (() => {
                      const op = computeOrderProfit(order)
                      if (op.totalCost <= 0) return null
                      return (
                        <p className={`text-[11px] font-medium tabular-nums ${profitClass(op.profit)}`}>
                          {formatPrice(op.profit)} · {formatPercent(op.margin)}
                        </p>
                      )
                    })()}
                    <StatusBadge status={trashed ? (order.pre_trash_status || order.status) : order.status} />
                    {(order.refund_amount ?? 0) > 0 && (order.refund_amount ?? 0) < order.total && (
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 whitespace-nowrap">
                        <RotateCcw className="w-3 h-3" />{t('orders.refund.partiallyRefunded')}
                      </span>
                    )}
                  </div>
                </div>
                {order.payment_method && (
                  <div className="mb-3 pl-7">
                    <PaymentBadge method={order.payment_method} />
                  </div>
                )}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 flex-wrap" onClick={e => e.stopPropagation()}>
                  {trashed ? (
                    <>
                      <button onClick={() => handleRestore(order)} disabled={deleting === order.id} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium whitespace-nowrap">
                        {deleting === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}{t('orders.trash.restore')}
                      </button>
                      <button onClick={() => setPurgeTarget(order)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                  <>
                  {canComplete && (
                    <button onClick={() => handleQuickComplete(order.id)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium whitespace-nowrap">
                      <Check className="w-4 h-4 flex-shrink-0" />{t('orders.actions.complete')}
                    </button>
                  )}
                  {canEdit && (
                    notesOnly ? (
                      <button onClick={() => setNotesOrder(order)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium whitespace-nowrap">
                        <StickyNote className="w-4 h-4 flex-shrink-0" />{t('orders.notes.editNotes')}
                      </button>
                    ) : (
                      <button onClick={() => navigate(`/orders/${order.id}/edit`)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium whitespace-nowrap">
                        <Pencil className="w-4 h-4 flex-shrink-0" />{t('common.edit')}
                      </button>
                    )
                  )}
                  <button onClick={() => setViewingOrder(order)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium whitespace-nowrap">
                    <Eye className="w-4 h-4 flex-shrink-0" />{t('orders.actions.view')}
                  </button>
                  {canDelete && ['draft', 'pending', 'pending_payment', 'on_hold', 'cancelled'].includes(order.status) && (
                    <button onClick={() => handleDelete(order)} disabled={deleting === order.id} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      {deleting === order.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  )}
                  </>
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
              onClick={() => goToPage(Math.max(1, page - 1))}
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
                    onClick={() => goToPage(pageNum)}
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
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewingOrder && <OrderDetail order={viewingOrder} onClose={() => setViewingOrder(null)} onStatusChange={() => { setViewingOrder(null); refresh() }} onDocGenerated={refreshDocInfo} />}

      {notesOrder && (
        <OrderNotesModal
          order={notesOrder}
          onClose={() => setNotesOrder(null)}
          onSaved={() => { setNotesOrder(null); refresh() }}
        />
      )}

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

      <ConfirmDialog
        open={!!purgeTarget}
        variant="danger"
        title={t('orders.trash.purge')}
        message={t('orders.trash.purgeConfirm', { number: purgeTarget?.order_number || '' })}
        confirmLabel={t('orders.trash.purge')}
        onConfirm={handlePurge}
        onCancel={() => setPurgeTarget(null)}
      />

      <ConfirmDialog
        open={confirmEmpty}
        variant="danger"
        title={t('orders.trash.emptyTrash')}
        message={emptying ? t('common.saving') : t('orders.trash.emptyConfirm', { count: totalCount })}
        confirmLabel={t('orders.trash.emptyTrash')}
        onConfirm={handleEmptyTrash}
        onCancel={() => { if (!emptying) setConfirmEmpty(false) }}
      />
    </div>
  )
}
