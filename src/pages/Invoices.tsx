import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
  Hash,
  Upload,
  FileCheck,
  FileMinus,
  Files,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { fetchDocuments, type InvoiceData } from '../services/documents'
import { supabase } from '../services/supabase'
import type { Document, DocumentType } from '../types'
import { usePermission } from '../hooks/usePermission'
import { InvoiceTemplate } from '../components/documents/InvoiceTemplate'
import { ProformaTemplate } from '../components/documents/ProformaTemplate'
import { OrderConfirmationTemplate } from '../components/documents/OrderConfirmationTemplate'
import { PaymentReminderTemplate } from '../components/documents/PaymentReminderTemplate'
import { CreditNoteTemplate } from '../components/documents/CreditNoteTemplate'
import { PackingSlipTemplate } from '../components/documents/PackingSlipTemplate'
import StatCard from '../components/StatCard'
import { formatDateTime } from '../utils/format'
import { exportToExcelGeneric, documentExportColumns } from '../utils/export'

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

const DOC_ICON_COLORS: Record<DocumentType, { bg: string; text: string }> = {
  invoice: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
  proforma: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  credit_note: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
  order_confirmation: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' },
  payment_reminder: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  packing_slip: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300' },
}

const TYPE_BADGE_CLASSES: Record<DocumentType, string> = {
  invoice: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  proforma: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  credit_note: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  packing_slip: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  order_confirmation: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  payment_reminder: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
}

function TypeBadge({
  type,
  onClick,
  t,
}: {
  type: DocumentType
  onClick?: () => void
  t: (key: string) => string
}) {
  const className = TYPE_BADGE_CLASSES[type]
  return (
    <span
      className={`px-2.5 py-1 text-xs font-medium rounded-full ${className} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      {t(`documents.types.${type}`)}
    </span>
  )
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

// Date range bounds calculator
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

export default function Invoices() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { canDelete } = usePermission('documents')
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Sort state
  const [sortField, setSortField] = useState<SortField>('generated_at')
  const [sortDirection, setSortDirection] = useState<SortDir>('desc')

  // Date range state
  const [dateRangePreset, setDateRangePreset] = useState<DatePreset>('all')
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Customer filter
  const [customerFilter, setCustomerFilter] = useState('')

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [])

  // Clear selection on any filter change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [searchQuery, typeFilter, dateRangePreset, customStart, customEnd, customerFilter])

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDocuments()
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  // ─── Computed Data ────────────────────────────────────

  const uniqueCustomers = useMemo(() => {
    const names = new Set<string>()
    documents.forEach(doc => {
      const { customerName } = getSnapshotData(doc)
      if (customerName) names.add(customerName)
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [documents])

  const dateRangeBounds = useMemo(
    () => getDateBounds(dateRangePreset, customStart, customEnd),
    [dateRangePreset, customStart, customEnd]
  )

  const filteredDocuments = useMemo(() => {
    let result = documents.filter(doc => {
      // Type filter
      if (typeFilter && doc.document_type !== typeFilter) return false

      // Customer filter
      if (customerFilter) {
        const { customerName } = getSnapshotData(doc)
        if (customerName !== customerFilter) return false
      }

      // Date range filter
      if (dateRangeBounds) {
        const docDate = doc.generated_at.split('T')[0]
        if (docDate < dateRangeBounds.start || docDate > dateRangeBounds.end) return false
      }

      // Multi-field search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const { customerName, orderNumber } = getSnapshotData(doc)
        const matchNumber = doc.document_number.toLowerCase().includes(q)
        const matchCustomer = customerName.toLowerCase().includes(q)
        const matchOrder = orderNumber.toLowerCase().includes(q)
        if (!matchNumber && !matchCustomer && !matchOrder) return false
      }

      return true
    })

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'generated_at':
          cmp = a.generated_at.localeCompare(b.generated_at)
          break
        case 'document_number':
          cmp = a.document_number.localeCompare(b.document_number)
          break
        case 'document_type':
          cmp = a.document_type.localeCompare(b.document_type)
          break
        case 'customer_name': {
          const aName = getSnapshotData(a).customerName
          const bName = getSnapshotData(b).customerName
          cmp = aName.localeCompare(bName)
          break
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })

    return result
  }, [documents, typeFilter, searchQuery, customerFilter, dateRangeBounds, sortField, sortDirection])

  const stats = useMemo(() => {
    const invoices = filteredDocuments.filter(d => d.document_type === 'invoice').length
    const creditNotes = filteredDocuments.filter(d => d.document_type === 'credit_note').length
    return {
      total: filteredDocuments.length,
      invoices,
      creditNotes,
      other: filteredDocuments.length - invoices - creditNotes,
    }
  }, [filteredDocuments])

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
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocuments.length && filteredDocuments.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredDocuments.map(d => d.id)))
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(t('documents.confirmDelete', { number: doc.document_number }))) return

    setDeleting(doc.id)
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (error) throw error
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setDeleting(null)
    }
  }

  const generatePdfBlob = async (doc: Document) => {
    const data = doc.snapshot as unknown as InvoiceData
    let template
    switch (doc.document_type) {
      case 'invoice':
        template = <InvoiceTemplate data={data} />
        break
      case 'proforma':
        template = <ProformaTemplate data={data} />
        break
      case 'order_confirmation':
        template = <OrderConfirmationTemplate data={data} />
        break
      case 'payment_reminder':
        template = <PaymentReminderTemplate data={data} />
        break
      case 'credit_note':
        template = <CreditNoteTemplate data={data} />
        break
      case 'packing_slip':
        template = <PackingSlipTemplate data={data} />
        break
      default:
        template = <InvoiceTemplate data={data} />
    }
    return pdf(template).toBlob()
  }

  const handleDownload = async (doc: Document) => {
    if (doc.pdf_url) {
      window.open(doc.pdf_url, '_blank')
      return
    }

    if (doc.snapshot) {
      try {
        const blob = await generatePdfBlob(doc)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${doc.document_number}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
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
      const selected = filteredDocuments.filter(d => selectedIds.has(d.id))
      for (const doc of selected) {
        await handleDownload(doc)
        // Small delay between downloads to avoid browser blocking
        await new Promise(r => setTimeout(r, 500))
      }
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(t('documents.bulk.confirmDelete', { count: selectedIds.size }))) return

    setBulkProcessing(true)
    try {
      const ids = Array.from(selectedIds)
      const { error } = await supabase
        .from('documents')
        .delete()
        .in('id', ids)

      if (error) throw error
      setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)))
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete documents')
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleExport = () => {
    const exportData = filteredDocuments.map(doc => {
      const { customerName, orderNumber } = getSnapshotData(doc)
      return {
        document_number: doc.document_number,
        document_type: doc.document_type,
        customer_name: customerName,
        order_number: orderNumber,
        generated_at: doc.generated_at,
      }
    })
    const filename = `${t('documents.export.filename')}_${new Date().toISOString().split('T')[0]}`
    exportToExcelGeneric(exportData, documentExportColumns, filename)
  }

  const handleTypeFilterClick = (type: DocumentType) => {
    setTypeFilter(prev => (prev === type ? '' : type))
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label={t('documents.stats.totalDocuments')}
            value={stats.total}
            icon={Files}
            iconColor="text-slate-600 dark:text-slate-400"
            iconBg="bg-slate-100 dark:bg-slate-700"
          />
          <StatCard
            label={t('documents.stats.invoices')}
            value={stats.invoices}
            icon={FileCheck}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-50 dark:bg-green-900/20"
          />
          <StatCard
            label={t('documents.stats.creditNotes')}
            value={stats.creditNotes}
            icon={FileMinus}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            label={t('documents.stats.other')}
            value={stats.other}
            icon={FileText}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-50 dark:bg-blue-900/20"
          />
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('documents.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Type Filter */}
        <div className="relative w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as DocumentType | '')}
            className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
          >
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

        {/* Date Range Filter */}
        <div className="relative w-full sm:w-auto">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={dateRangePreset}
            onChange={e => {
              const val = e.target.value as DatePreset
              setDateRangePreset(val)
              setShowCustomDate(val === 'custom')
            }}
            className="w-full sm:w-auto pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
          >
            <option value="all">{t('documents.dateRange.all')}</option>
            <option value="today">{t('documents.dateRange.today')}</option>
            <option value="thisWeek">{t('documents.dateRange.thisWeek')}</option>
            <option value="thisMonth">{t('documents.dateRange.thisMonth')}</option>
            <option value="thisYear">{t('documents.dateRange.thisYear')}</option>
            <option value="custom">{t('documents.dateRange.custom')}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Customer Filter */}
        {uniqueCustomers.length > 0 && (
          <div className="relative w-full sm:w-auto">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className="w-full sm:w-auto pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
            >
              <option value="">{t('documents.allCustomers')}</option>
              {uniqueCustomers.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={filteredDocuments.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.export')}</span>
        </button>
      </div>

      {/* Custom Date Inputs */}
      {showCustomDate && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-slate-400 text-sm">{t('documents.dateRange.to')}</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      )}

      {/* Result Count */}
      {!loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('documents.resultCount', {
            filtered: filteredDocuments.length,
            total: documents.length,
          })}
        </p>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              {t('documents.bulk.selected', { count: selectedIds.size })}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              {t('documents.bulk.clear')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDownload}
              disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {bulkProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {bulkProcessing ? t('documents.bulk.downloading') : t('documents.bulk.download')} ({selectedIds.size})
            </button>
            {canDelete && (
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
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || typeFilter || customerFilter || dateRangePreset !== 'all'
                ? t('documents.noDocumentsMatch')
                : t('documents.noDocuments')}
            </p>
            {!searchQuery && !typeFilter && !customerFilter && dateRangePreset === 'all' && (
              <p className="text-sm text-slate-500 mt-1">{t('documents.generateFromOrder')}</p>
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
                      checked={selectedIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <SortHeader
                      label={t('documents.documentNumber')}
                      field="document_number"
                      current={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <SortHeader
                      label={t('documents.customerName')}
                      field="customer_name"
                      current={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {t('documents.orderNumber')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <SortHeader
                      label="Type"
                      field="document_type"
                      current={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <SortHeader
                      label={t('documents.documentDate')}
                      field="generated_at"
                      current={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredDocuments.map(doc => {
                  const { customerName, orderNumber, orderId } = getSnapshotData(doc)
                  const iconColors = DOC_ICON_COLORS[doc.document_type]

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                        selectedIds.has(doc.id) ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                      }`}
                    >
                      <td className="pl-4 pr-2 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${iconColors.bg} flex items-center justify-center shrink-0`}>
                            <FileText className={`w-5 h-5 ${iconColors.text}`} />
                          </div>
                          <p className="font-semibold font-mono text-slate-900 dark:text-white">
                            {doc.document_number}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {customerName ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{customerName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {orderNumber ? (
                          <button
                            onClick={() => navigate(`/orders/${orderId}`)}
                            className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 hover:underline font-mono"
                          >
                            <Hash className="w-3.5 h-3.5" />
                            {orderNumber}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <TypeBadge
                          type={doc.document_type}
                          onClick={() => handleTypeFilterClick(doc.document_type)}
                          t={t}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span className="text-sm">{formatDateTime(doc.generated_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            title={t('common.download')}
                          >
                            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(doc)}
                              disabled={deleting === doc.id}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={t('common.delete')}
                            >
                              {deleting === doc.id ? (
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
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || typeFilter || customerFilter || dateRangePreset !== 'all'
                ? t('documents.noDocumentsMatch')
                : t('documents.noDocuments')}
            </p>
          </div>
        ) : (
          filteredDocuments.map(doc => {
            const { customerName, orderNumber, orderId } = getSnapshotData(doc)
            const iconColors = DOC_ICON_COLORS[doc.document_type]

            return (
              <div
                key={doc.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${
                  selectedIds.has(doc.id) ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0 mt-1"
                    />
                    <div className={`w-10 h-10 rounded-xl ${iconColors.bg} flex items-center justify-center shrink-0`}>
                      <FileText className={`w-5 h-5 ${iconColors.text}`} />
                    </div>
                    <div>
                      <p className="font-semibold font-mono text-slate-900 dark:text-white">
                        {doc.document_number}
                      </p>
                      <TypeBadge
                        type={doc.document_type}
                        onClick={() => handleTypeFilterClick(doc.document_type)}
                        t={t}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                      title={t('common.download')}
                    >
                      <Download className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deleting === doc.id}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5 text-red-500" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer & Order info */}
                <div className="space-y-1.5 mb-3">
                  {customerName && (
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      {customerName}
                    </div>
                  )}
                  {orderNumber && (
                    <button
                      onClick={() => navigate(`/orders/${orderId}`)}
                      className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 hover:underline font-mono"
                    >
                      <Hash className="w-3.5 h-3.5" />
                      {orderNumber}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  {formatDateTime(doc.generated_at)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {t('documents.generateFromOrder')}
        </p>
      </div>
    </div>
  )
}
