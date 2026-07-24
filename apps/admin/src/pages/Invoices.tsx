import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Search,
  Loader2,
  Download,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Building2,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import {
  fetchDocumentsPaged,
  fetchDocumentStats,
  fetchDocumentCustomers,
  fetchAllDocumentsForExport,
  buildInvoiceData,
  updateDocumentSnapshot,
  type InvoiceData,
  type DocumentListRow,
} from '../services/documents'
import { supabase } from '../services/supabase'
import type { Document, DocumentType } from '../types'
import Pagination from '../components/ui/Pagination'
import { useUrlListState } from '../hooks/useUrlListState'
import { usePermission } from '../hooks/usePermission'
import { InvoiceTemplate } from '../components/documents/InvoiceTemplate'
import { ProformaTemplate } from '../components/documents/ProformaTemplate'
import { OrderConfirmationTemplate } from '../components/documents/OrderConfirmationTemplate'
import { PaymentReminderTemplate } from '../components/documents/PaymentReminderTemplate'
import { CreditNoteTemplate } from '../components/documents/CreditNoteTemplate'
import { PackingSlipTemplate } from '../components/documents/PackingSlipTemplate'
import InvoiceStats from '../components/documents/InvoiceStats'
import { InvoiceTableRow, InvoiceMobileCard } from '../components/documents/InvoiceRow'
import OrderDetail from '../components/orders/OrderDetail'
import { fetchOrderById, type OrderWithItems } from '../services/orders'
import { documentExportColumns } from '../utils/export'
import { shareOrDownloadBlob } from '../utils/shareBlob'
import ExportMenu from '../components/ui/ExportMenu'

// ─── Helpers ──────────────────────────────────────────

type SortField = 'generated_at' | 'customer_name' | 'document_number' | 'document_type'
type SortDir = 'asc' | 'desc'
type DatePreset = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'

function getSnapshotData(doc: Document) {
  const snap = doc.snapshot as Record<string, unknown> | undefined
  const customer = snap?.customer as Record<string, unknown> | undefined
  const order = snap?.order as Record<string, unknown> | undefined
  return {
    customerName: (customer?.companyName as string) || '',
    orderNumber: (order?.orderNumber as string) || '',
    orderId: doc.order_id || '',
  }
}

// Sortable column header
function SortHeader({
  label,
  field,
  current,
  direction,
  onSort,
}: {
  label: string
  field: SortField
  current: SortField
  direction: SortDir
  onSort: (f: SortField) => void
}) {
  const active = field === current
  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 group"
    >
      <span>{label}</span>
      <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
        {active && direction === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </span>
    </button>
  )
}

function getDateBounds(preset: DatePreset, customStart: string, customEnd: string): { start: string; end: string } | null {
  if (preset === 'all') return null
  if (preset === 'custom') {
    if (customStart && customEnd) return { start: customStart, end: customEnd }
    return null
  }
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  switch (preset) {
    case 'today':
      return { start: todayStr, end: todayStr }
    case 'thisWeek': {
      const d = new Date(now)
      const dayOfWeek = d.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      d.setDate(d.getDate() - daysToMonday)
      return { start: d.toISOString().split('T')[0], end: todayStr }
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: start.toISOString().split('T')[0], end: todayStr }
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start: start.toISOString().split('T')[0], end: todayStr }
    }
    default:
      return null
  }
}

// ─── Main Component ───────────────────────────────────

const PAGE_SIZE = 50

export default function Invoices() {
  const { t } = useTranslation()
  const { canDelete } = usePermission('documents')
  // View state lives in the URL so opening an order from a row and coming back
  // restores the page + filters (see useUrlListState).
  const [urlInit, setUrlState] = useUrlListState({
    page: 1, q: '', type: '', customer: '', range: 'all', from: '', to: '',
  })

  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null)
  const [documents, setDocuments] = useState<DocumentListRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(urlInit.page)
  const [stats, setStats] = useState({ total: 0, invoices: 0, creditNotes: 0, other: 0 })
  const [customers, setCustomers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(urlInit.q)
  const [debouncedSearch, setDebouncedSearch] = useState(urlInit.q)
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>(urlInit.type as DocumentType | '')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('generated_at')
  const [sortDirection, setSortDirection] = useState<SortDir>('desc')
  const [dateRangePreset, setDateRangePreset] = useState<DatePreset>(urlInit.range as DatePreset)
  const [showCustomDate, setShowCustomDate] = useState(urlInit.range === 'custom')
  const [customStart, setCustomStart] = useState(urlInit.from)
  const [customEnd, setCustomEnd] = useState(urlInit.to)
  const [customerFilter, setCustomerFilter] = useState(urlInit.customer)

  const goToPage = (next: number) => { setPage(next); setUrlState({ page: next }) }
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  const dateRangeBounds = useMemo(
    () => getDateBounds(dateRangePreset, customStart, customEnd),
    [dateRangePreset, customStart, customEnd]
  )

  // The server-side filter set (search / type / customer / date). Search runs
  // in the DB across the whole table, so a match on any page is found.
  const filters = useMemo(() => ({
    search: debouncedSearch,
    type: typeFilter,
    customer: customerFilter,
    dateStart: dateRangeBounds?.start,
    dateEnd: dateRangeBounds?.end,
  }), [debouncedSearch, typeFilter, customerFilter, dateRangeBounds])

  // Debounce the search box (~300ms after typing stops) before hitting the DB.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  // Any filter/sort change clears the selection and returns to page 1, and
  // mirrors the filters into the URL. The initial run is skipped: it would
  // otherwise reset the page we just restored from the URL back to 1, and write
  // the URL on mount.
  const filtersInitRef = useRef(true)
  useEffect(() => {
    if (filtersInitRef.current) { filtersInitRef.current = false; return }
    setSelectedIds(new Set())
    setPage(1)
    setUrlState({
      page: 1,
      q: debouncedSearch,
      type: typeFilter,
      customer: customerFilter,
      range: dateRangePreset,
      from: dateRangePreset === 'custom' ? customStart : '',
      to: dateRangePreset === 'custom' ? customEnd : '',
    })
  }, [filters, sortField, sortDirection]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ rows, total }, statCounts] = await Promise.all([
        fetchDocumentsPaged({ ...filters, sortField, sortDir: sortDirection, page, pageSize: PAGE_SIZE }),
        fetchDocumentStats(filters),
      ])
      setDocuments(rows)
      setTotal(total)
      setStats({
        total: statCounts.total,
        invoices: statCounts.invoices,
        creditNotes: statCounts.creditNotes,
        other: statCounts.total - statCounts.invoices - statCounts.creditNotes,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadDocuments() }, [filters, sortField, sortDirection, page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Customer filter options (distinct names across all documents) — loaded once.
  useEffect(() => {
    void (async () => {
      try { setCustomers(await fetchDocumentCustomers()) } catch { /* non-fatal */ }
    })()
  }, [])

  // ─── Handlers ─────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'generated_at' ? 'desc' : 'asc')
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id)
    setSelectedIds(newSet)
  }

  // Select-all toggles the current page (selection persists across the page's
  // own rows; export "all results" covers every page via getAllData).
  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length && documents.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)))
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(t('documents.confirmDelete', { number: doc.document_number }))) return
    setDeleting(doc.id)
    try {
      const { error } = await supabase.from('documents').delete().eq('id', doc.id)
      if (error) throw error
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setDeleting(null)
    }
  }

  const generatePdfBlob = async (doc: Document) => {
    // Rebuild the document LIVE from the current order so this download matches
    // the Orders-page download exactly (both use buildInvoiceData). The stored
    // doc.snapshot is frozen at first generation and goes stale when the order
    // is later edited (customer/country change, added/removed lines, price edits,
    // new template features) — rendering it produced a different PDF here than on
    // the Orders page. Preserve the existing document number; opportunistically
    // re-freeze the snapshot so the customer portal (which renders the snapshot)
    // heals too. Fall back to the frozen snapshot if the order is gone.
    let data: InvoiceData
    if (doc.order_id) {
      try {
        data = await buildInvoiceData(doc.order_id, doc.document_type)
        data.documentNumber = doc.document_number
        updateDocumentSnapshot(doc.id, data as unknown as Record<string, unknown>).catch(() => {})
      } catch {
        data = doc.snapshot as unknown as InvoiceData
      }
    } else {
      data = doc.snapshot as unknown as InvoiceData
    }
    let template
    switch (doc.document_type) {
      case 'invoice': template = <InvoiceTemplate data={data} />; break
      case 'proforma': template = <ProformaTemplate data={data} />; break
      case 'order_confirmation': template = <OrderConfirmationTemplate data={data} />; break
      case 'payment_reminder': template = <PaymentReminderTemplate data={data} />; break
      case 'credit_note': template = <CreditNoteTemplate data={data} />; break
      case 'packing_slip': template = <PackingSlipTemplate data={data} />; break
      default: template = <InvoiceTemplate data={data} />
    }
    return pdf(template).toBlob()
  }

  const handleDownload = async (doc: Document) => {
    if (doc.pdf_url) { window.open(doc.pdf_url, '_blank'); return }
    if (doc.snapshot || doc.order_id) {
      try {
        const blob = await generatePdfBlob(doc)
        await shareOrDownloadBlob(blob, `${doc.document_number}.pdf`)
      } catch (err) {
        console.error('Failed to regenerate PDF:', err)
        setError('Failed to generate PDF. Please try again.')
      }
    } else {
      setError('No snapshot data available for this document.')
    }
  }

  const handleBulkDownload = async () => {
    setBulkProcessing(true)
    try {
      const selected = documents.filter(d => selectedIds.has(d.id))
      for (const doc of selected) {
        await handleDownload(doc)
        await new Promise(r => setTimeout(r, 500))
      }
    } finally { setBulkProcessing(false) }
  }

  const handleBulkDelete = async () => {
    if (!confirm(t('documents.bulk.confirmDelete', { count: selectedIds.size }))) return
    setBulkProcessing(true)
    try {
      const ids = Array.from(selectedIds)
      const { error } = await supabase.from('documents').delete().in('id', ids)
      if (error) throw error
      setSelectedIds(new Set())
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete documents')
    } finally { setBulkProcessing(false) }
  }

  const mapDocForExport = (doc: Document) => {
    const { customerName, orderNumber } = getSnapshotData(doc)
    return {
      document_number: doc.document_number,
      document_type: doc.document_type,
      customer_name: customerName,
      order_number: orderNumber,
      generated_at: doc.generated_at,
    }
  }

  // "All results" export fetches every matching row across all pages; selected
  // export uses the current page's ticked rows.
  const getAllExportData = async () => (await fetchAllDocumentsForExport(filters)).map(mapDocForExport)
  const selectedExportData = useMemo(
    () => documents.filter(d => selectedIds.has(d.id)).map(mapDocForExport),
    [documents, selectedIds], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleTypeFilterClick = (type: DocumentType) => {
    setTypeFilter(prev => (prev === type ? '' : type))
  }

  // Open the order's detail panel in-place (no navigation, so the user keeps
  // their place on the Invoices page).
  const handleOpenOrder = async (orderId: string) => {
    if (!orderId) return
    try {
      const order = await fetchOrderById(orderId)
      if (order) setViewingOrder(order)
    } catch (e) {
      console.error(e)
    }
  }

  const hasFilters = searchQuery || typeFilter || customerFilter || dateRangePreset !== 'all'

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      {!loading && <InvoiceStats stats={stats} t={t} />}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('documents.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="relative w-full sm:w-auto">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as DocumentType | '')}
            className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer">
            <option value="">{t('documents.allTypes')}</option>
            <option value="invoice">{t('documents.types.invoice')}</option>
            <option value="proforma">{t('documents.types.proforma')}</option>
            <option value="credit_note">{t('documents.types.credit_note')}</option>
            <option value="packing_slip">{t('documents.types.packing_slip')}</option>
            <option value="order_confirmation">{t('documents.types.order_confirmation')}</option>
            <option value="payment_reminder">{t('documents.types.payment_reminder')}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative w-full sm:w-auto">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select value={dateRangePreset} onChange={e => { const val = e.target.value as DatePreset; setDateRangePreset(val); setShowCustomDate(val === 'custom') }}
            className="w-full sm:w-auto pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer">
            <option value="all">{t('documents.dateRange.all')}</option>
            <option value="today">{t('documents.dateRange.today')}</option>
            <option value="thisWeek">{t('documents.dateRange.thisWeek')}</option>
            <option value="thisMonth">{t('documents.dateRange.thisMonth')}</option>
            <option value="thisYear">{t('documents.dateRange.thisYear')}</option>
            <option value="custom">{t('documents.dateRange.custom')}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {customers.length > 0 && (
          <div className="relative w-full sm:w-auto">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}
              className="w-full sm:w-auto pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer">
              <option value="">{t('documents.allCustomers')}</option>
              {customers.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}
        <ExportMenu
          getAllData={getAllExportData}
          selectedData={selectedExportData}
          totalCount={total}
          columns={documentExportColumns as never}
          filename={`${t('documents.export.filename')}_${new Date().toISOString().split('T')[0]}`}
          pdfTitle="Documenten"
          storageKey="documents"
        />
      </div>

      {/* Custom Date Inputs */}
      {showCustomDate && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
          <span className="text-slate-400 text-sm">{t('documents.dateRange.to')}</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      )}

      {/* Result Count */}
      {!loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('documents.matchCount', { count: total })}
        </p>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              {t('documents.bulk.selected', { count: selectedIds.size })}
            </span>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-green-600 dark:text-green-400 hover:underline">
              {t('documents.bulk.clear')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkDownload} disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {bulkProcessing ? t('documents.bulk.downloading') : t('documents.bulk.download')} ({selectedIds.size})
            </button>
            {canDelete && (
              <button onClick={handleBulkDelete} disabled={bulkProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('documents.bulk.delete')} ({selectedIds.size})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
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
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {hasFilters ? t('documents.noDocumentsMatch') : t('documents.noDocuments')}
            </p>
            {!hasFilters && <p className="text-sm text-slate-500 mt-1">{t('documents.generateFromOrder')}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" checked={selectedIds.size === documents.length && documents.length > 0} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <SortHeader label={t('documents.documentNumber')} field="document_number" current={sortField} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <SortHeader label={t('documents.customerName')} field="customer_name" current={sortField} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{t('documents.orderNumber')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <SortHeader label="Type" field="document_type" current={sortField} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <SortHeader label={t('documents.documentDate')} field="generated_at" current={sortField} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {documents.map(doc => {
                  const data = getSnapshotData(doc)
                  return (
                    <InvoiceTableRow
                      key={doc.id}
                      doc={doc}
                      data={data}
                      isSelected={selectedIds.has(doc.id)}
                      deleting={deleting === doc.id}
                      canDelete={canDelete}
                      t={t}
                      onToggleSelect={() => toggleSelect(doc.id)}
                      onDownload={() => handleDownload(doc)}
                      onDelete={() => handleDelete(doc)}
                      onTypeFilter={() => handleTypeFilterClick(doc.document_type)}
                      onNavigateOrder={() => handleOpenOrder(data.orderId)}
                    />
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
        ) : documents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {hasFilters ? t('documents.noDocumentsMatch') : t('documents.noDocuments')}
            </p>
          </div>
        ) : (
          documents.map(doc => {
            const data = getSnapshotData(doc)
            return (
              <InvoiceMobileCard
                key={doc.id}
                doc={doc}
                data={data}
                isSelected={selectedIds.has(doc.id)}
                deleting={deleting === doc.id}
                canDelete={canDelete}
                t={t}
                onToggleSelect={() => toggleSelect(doc.id)}
                onDownload={() => handleDownload(doc)}
                onDelete={() => handleDelete(doc)}
                onTypeFilter={() => handleTypeFilterClick(doc.document_type)}
                onNavigateOrder={() => handleOpenOrder(data.orderId)}
              />
            )
          })
        )}
      </div>

      {!loading && total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={total} onPageChange={goToPage} />
      )}

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-700 dark:text-blue-300">{t('documents.generateFromOrder')}</p>
      </div>

      {viewingOrder && (
        <OrderDetail
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onStatusChange={() => { setViewingOrder(null); loadDocuments() }}
        />
      )}
    </div>
  )
}
