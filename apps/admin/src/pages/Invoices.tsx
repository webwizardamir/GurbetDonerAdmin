import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Loader2,
  Download,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Building2,
  Send,
} from 'lucide-react'
import {
  fetchDocumentsPaged,
  fetchDocumentStats,
  fetchDocumentCustomers,
  fetchAllDocumentsForExport,
  rebuildDocumentData,
  type InvoiceData,
  type DocumentListRow,
} from '../services/documents'
import { supabase } from '../services/supabase'
import type { Document, DocumentType } from '../types'
import Pagination from '../components/ui/Pagination'
import { useUrlListState } from '../hooks/useUrlListState'
import { usePermission } from '../hooks/usePermission'
import { useRowSelection } from '../hooks/useRowSelection'
import SelectionBar from '../components/ui/SelectionBar'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import BulkSendInvoicesModal from '../components/documents/BulkSendInvoicesModal'
import { renderDocumentBlob } from '../utils/renderDocumentBlob'
import InvoiceStats from '../components/documents/InvoiceStats'
import { InvoiceTableRow, InvoiceMobileCard } from '../components/documents/InvoiceRow'
import OrderDetail from '../components/orders/OrderDetail'
import { fetchOrderById, type OrderWithItems } from '../services/orders'
import { documentExportColumns } from '../utils/export'
import { shareOrDownloadBlob } from '../utils/shareBlob'
import ExportMenu from '../components/ui/ExportMenu'
import ListToolbar, { type ToolbarAction } from '../components/ui/ListToolbar'
import type { FilterDef } from '../components/ui/filterTypes'
import { ymdInAms, mondayOf, firstOfMonth } from '../utils/dateRange'

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
  // Amsterdam-pinned boundaries. Building a local midnight Date and then calling
  // toISOString() shifted every start back a day on a UTC+1/+2 browser, so
  // "Deze maand" began on the last day of the previous month.
  const todayStr = ymdInAms()
  switch (preset) {
    case 'today':
      return { start: todayStr, end: todayStr }
    case 'thisWeek':
      return { start: mondayOf(todayStr), end: todayStr }
    case 'thisMonth':
      return { start: firstOfMonth(todayStr), end: todayStr }
    case 'thisYear':
      return { start: `${todayStr.slice(0, 4)}-01-01`, end: todayStr }
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

  // Selection is deliberately NOT cleared on a search/filter/page change — that
  // is the whole point of useRowSelection, and it is what makes "search, tick,
  // search again, tick more, then send them all" possible. It also stores the
  // ROW, so every consumer below sees off-page picks too.
  const {
    selectedIds, selectedItems, selectedCount,
    toggle, toggleAllVisible, clear: clearSelection, setSelected,
  } = useRowSelection<DocumentListRow>()
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  // A stored row is a snapshot from whenever it was ticked; map ids back onto
  // the live list so anything still on screen shows current data (mirrors
  // Orders.tsx).
  const selectedDocs = useMemo(
    () => selectedItems.map(sel => documents.find(d => d.id === sel.id) ?? sel),
    [selectedItems, documents],
  )

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

  // Any filter/sort change returns to page 1 and mirrors the filters into the
  // URL. The initial run is skipped: it would otherwise reset the page we just
  // restored from the URL back to 1, and write the URL on mount.
  //
  // It deliberately does NOT touch the selection any more — clearing it here is
  // exactly what made ticking rows across two different searches impossible.
  const filtersInitRef = useRef(true)
  useEffect(() => {
    if (filtersInitRef.current) { filtersInitRef.current = false; return }
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

  // Select-all covers the rows on screen; picks made under other searches are
  // left alone. Must be computed with .every() rather than comparing counts —
  // with a surviving selection, 50 ticked on page 1 and 50 rows on page 2 would
  // otherwise render the box checked and select 50 more (see SelectionBar).
  const allVisibleSelected = documents.length > 0 && documents.every(d => selectedIds.has(d.id))
  const toggleSelectAll = () => toggleAllVisible(documents)

  const handleDelete = async (doc: Document) => {
    if (!confirm(t('documents.confirmDelete', { number: doc.document_number }))) return
    setDeleting(doc.id)
    try {
      const { error } = await supabase.from('documents').delete().eq('id', doc.id)
      if (error) throw error
      // Drop it from the selection too — it survives paging, so otherwise the
      // deleted row stays ticked and a later bulk download/export acts on a
      // document that no longer exists.
      setSelected(prev => { const next = new Map(prev); next.delete(doc.id); return next })
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
    try {
      data = await rebuildDocumentData(doc)
    } catch {
      data = doc.snapshot as unknown as InvoiceData
    }
    return renderDocumentBlob(doc.document_type, data)
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
      // selectedDocs, not the visible page — a selection built across several
      // searches must download in full. Keep the spacing: browsers throttle
      // rapid downloads (same reason as renderInvoices.tsx).
      for (const doc of selectedDocs) {
        await handleDownload(doc)
        await new Promise(r => setTimeout(r, 500))
      }
    } finally { setBulkProcessing(false) }
  }

  const handleBulkDelete = async () => {
    setConfirmBulkDelete(false)
    setBulkProcessing(true)
    try {
      const ids = Array.from(selectedIds)
      const { error } = await supabase.from('documents').delete().in('id', ids)
      if (error) throw error
      clearSelection()
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
  // export uses every ticked row — including ones picked under an earlier
  // search and no longer on screen (useRowSelection stores the row).
  const getAllExportData = async () => (await fetchAllDocumentsForExport(filters)).map(mapDocForExport)
  const selectedExportData = useMemo(
    () => selectedDocs.map(mapDocForExport),
    [selectedDocs],
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

  const filterDefs = useMemo<FilterDef[]>(() => [
    {
      id: 'type',
      kind: 'select',
      label: t('documents.allTypes'),
      value: typeFilter,
      onChange: v => setTypeFilter(v as DocumentType | ''),
      allLabel: t('documents.allTypes'),
      options: (['invoice', 'proforma', 'credit_note', 'packing_slip', 'order_confirmation', 'payment_reminder'] as const)
        .map(k => ({ value: k, label: t(`documents.types.${k}`) })),
    },
    {
      id: 'range',
      kind: 'select',
      label: t('documents.dateRange.label', { defaultValue: t('soldProducts.dateRange') }),
      icon: Calendar,
      value: dateRangePreset === 'all' ? '' : dateRangePreset,
      onChange: v => {
        const val = (v || 'all') as DatePreset
        setDateRangePreset(val)
        setShowCustomDate(val === 'custom')
      },
      allLabel: t('documents.dateRange.all'),
      options: (['today', 'thisWeek', 'thisMonth', 'thisYear', 'custom'] as const)
        .map(k => ({ value: k, label: t(`documents.dateRange.${k}`) })),
    },
    {
      id: 'customer',
      kind: 'select',
      label: t('documents.allCustomers'),
      icon: Building2,
      hidden: customers.length === 0,
      value: customerFilter,
      // Long list -> searchable picker rather than a native select.
      searchable: true,
      searchPlaceholder: t('orders.searchCustomer'),
      options: customers.map(name => ({ value: name, label: name })),
      onChange: setCustomerFilter,
      allLabel: t('documents.allCustomers'),
    },
  ], [t, typeFilter, dateRangePreset, customers, customerFilter])

  const toolbarActions = useMemo<ToolbarAction[]>(() => [{
    id: 'export',
    label: t('common.export'),
    icon: FileText,
    // Only action on this page, so it stays visible on mobile rather than
    // hiding a lone item behind an overflow menu.
    priority: 'primary',
    render: (mode) => (
      <ExportMenu
        variant={mode === 'menuitem' ? 'menuitem' : 'button'}
        getAllData={getAllExportData}
        selectedData={selectedExportData}
        onSelectionExported={clearSelection}
        totalCount={total}
        columns={documentExportColumns as never}
        filename={`${t('documents.export.filename')}_${ymdInAms()}`}
        pdfTitle="Documenten"
        storageKey="documents"
      />
    ),
    // Mounted at the toolbar root so the ⋮ menu closing cannot unmount it.
    renderOverlay: (open, onClose) => (
      <ExportMenu
        headless
        open={open}
        onOpenChange={o => { if (!o) onClose() }}
                getAllData={getAllExportData}
        selectedData={selectedExportData}
        onSelectionExported={clearSelection}
        totalCount={total}
        columns={documentExportColumns as never}
        filename={`${t('documents.export.filename')}_${ymdInAms()}`}
        pdfTitle="Documenten"
        storageKey="documents"
      />
    ),
    // `filters` is load-bearing here: the ExportMenu closes over
    // getAllExportData, which closes over filters. Without it, switching to a
    // different filter with the same result count reuses the memo and exports
    // the PREVIOUS filter's rows — and an export file is durable and forwarded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }], [t, total, selectedExportData, filters, clearSelection])

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      {!loading && <InvoiceStats stats={stats} t={t} />}

      {/* Search & Filters */}
      <ListToolbar
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: t('documents.searchPlaceholder') }}
        filters={filterDefs}
        actions={toolbarActions}
        resultCount={total}
        resultsLoading={loading}
        renderResultLabel={n => t('common.filters.showResults', { count: n })}
      />

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

      {/* Selection + bulk actions. The shared SelectionBar (rather than the old
          hand-rolled div) also gives the mobile card list a select-all, which it
          never had — the header checkbox lives inside the desktop-only table. */}
      <SelectionBar
        selectedCount={selectedCount}
        visibleCount={documents.length}
        allVisibleSelected={allVisibleSelected}
        // Must be about the VISIBLE rows, not the total count — otherwise a page
        // with nothing ticked shows the indeterminate dash while the table's own
        // header checkbox shows empty, and the two disagree.
        someVisibleSelected={documents.some(d => selectedIds.has(d.id))}
        onToggleSelectAll={toggleSelectAll}
        onClear={clearSelection}
      >
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setBulkSendOpen(true)} disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              <Send className="w-4 h-4" />
              {t('documents.bulk.sendEmail')} ({selectedCount})
            </button>
            <button onClick={handleBulkDownload} disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {bulkProcessing ? t('documents.bulk.downloading') : t('documents.bulk.download')} ({selectedCount})
            </button>
            {canDelete && (
              <button onClick={() => setConfirmBulkDelete(true)} disabled={bulkProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                <Trash2 className="w-4 h-4" />
                {t('documents.bulk.delete')} ({selectedCount})
              </button>
            )}
          </div>
        )}
      </SelectionBar>

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
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
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
                      onToggleSelect={() => toggle(doc)}
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
                onToggleSelect={() => toggle(doc)}
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

      {bulkSendOpen && (
        <BulkSendInvoicesModal
          docs={selectedDocs}
          onClose={() => setBulkSendOpen(false)}
          // The selection has been consumed — leaving it armed invites a second
          // send over the same rows.
          onFinished={() => { clearSelection(); void loadDocuments() }}
        />
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        variant="danger"
        message={t('documents.bulk.confirmDelete', { count: selectedCount })}
        confirmLabel={t('common.delete')}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  )
}
