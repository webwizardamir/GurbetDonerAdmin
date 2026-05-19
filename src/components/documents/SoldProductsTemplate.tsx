import { useState } from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
  PDFViewer,
} from '@react-pdf/renderer'
import {
  X,
  Download,
  Eye,
  Printer,
  Loader2,
  FileText,
} from 'lucide-react'
import type { SoldProductItem, SoldProductsResult } from '../../services/soldProducts'
import { getStockStatus, getSuggestedRefill } from '../../services/soldProducts'

// A4: 595.28 x 841.89 points
const styles = StyleSheet.create({
  // PAGE
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 28,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#16a34a',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8,
    color: '#64748b',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateBox: {
    backgroundColor: '#f1f5f9',
    padding: 5,
    paddingHorizontal: 10,
  },
  dateLabel: {
    fontSize: 6.5,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  dateValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },

  // SUMMARY CARDS (compact)
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 6.5,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  summaryValueGreen: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
  },
  summaryValueAmber: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#d97706',
  },

  // TABLE
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  th: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  rowEven: {
    backgroundColor: '#f8fafc',
  },
  rowOdd: {
    backgroundColor: '#ffffff',
  },
  rowCritical: {
    backgroundColor: '#fef2f2',
  },
  rowLow: {
    backgroundColor: '#fffbeb',
  },
  td: {
    fontSize: 7.5,
  },
  tdBold: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },

  // Column widths
  colProduct: { flex: 2, paddingRight: 6 },
  colCategory: { flex: 1, paddingRight: 6 },
  colSold: { width: 65, textAlign: 'right', paddingRight: 6 },
  colStock: { width: 65, textAlign: 'right', paddingRight: 6 },
  colStatus: { width: 50, textAlign: 'center', paddingRight: 6 },
  colRefill: { width: 65, textAlign: 'right' },

  // Status badges
  statusBadge: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 1,
    paddingHorizontal: 3,
    textAlign: 'center',
  },
  statusCritical: {
    backgroundColor: '#fecaca',
    color: '#dc2626',
  },
  statusLow: {
    backgroundColor: '#fde68a',
    color: '#d97706',
  },
  statusOk: {
    backgroundColor: '#bbf7d0',
    color: '#16a34a',
  },
  statusNA: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },

  // Refill badge
  refillBadge: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    paddingVertical: 1,
    paddingHorizontal: 3,
    textAlign: 'right',
  },

  // FOOTER
  footer: {
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 6.5,
    color: '#94a3b8',
    textAlign: 'center',
  },
  footerNote: {
    fontSize: 6.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
    fontStyle: 'italic',
  },
})

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Format quantity with unit (Dutch for PDFs)
function formatQuantity(qty: number, unit: string): string {
  if (unit === 'kg') {
    return `${qty.toFixed(1)} kg`
  }
  if (unit === 'piece') {
    return `${Math.round(qty)} ${qty === 1 ? 'stuk' : 'stuks'}`
  }
  if (unit === 'zak') {
    return `${Math.round(qty)} ${qty === 1 ? 'zak' : 'zakken'}`
  }
  if (unit === 'doos') {
    return `${Math.round(qty)} ${qty === 1 ? 'doos' : 'dozen'}`
  }
  return `${Math.round(qty)} ${unit}`
}

interface DateRange {
  start: string
  end: string
  label: string
}

interface SoldProductsPDFDocumentProps {
  items: SoldProductItem[]
  summary: SoldProductsResult['summary']
  dateRange: DateRange
}

// Driver-routing mode: one Page per group, page break in between automatically
// from @react-pdf's Page elements. Each group's header shows the city/customer
// name so the driver can identify their printout at a glance.
interface SoldProductsGroup {
  key: string
  name: string
  items: SoldProductItem[]
  totalQuantity: number
  totalRevenue: number
}

interface SoldProductsGroupedPDFProps {
  groups: SoldProductsGroup[]
  dateRange: DateRange
  groupByLabel: string  // localized 'Stad' / 'Klant' for the cover
}

function GroupedItemsTable({ items }: { items: SoldProductItem[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.colProduct]}>Product</Text>
        <Text style={[styles.th, styles.colCategory]}>Categorie</Text>
        <Text style={[styles.th, styles.colSold]}>Verkocht</Text>
        <Text style={[styles.th, styles.colStock]}>Voorraad</Text>
        <Text style={[styles.th, styles.colStatus]}>Status</Text>
        <Text style={[styles.th, styles.colRefill]}>Bijvullen</Text>
      </View>
      {items.map((item, idx) => {
        const status = getStockStatus(item)
        const refill = getSuggestedRefill(item)
        const rowStyle = [
          styles.tableRow,
          status.status === 'critical' ? styles.rowCritical :
          status.status === 'low' ? styles.rowLow :
          idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
        ]
        const statusStyle = [
          styles.statusBadge,
          status.status === 'critical' ? styles.statusCritical :
          status.status === 'low' ? styles.statusLow :
          status.status === 'ok' ? styles.statusOk :
          styles.statusNA,
        ]
        return (
          <View key={`${item.product_id}-${item.unit_type}`} wrap={false} style={rowStyle}>
            <View style={styles.colProduct}>
              <Text style={styles.tdBold}>{item.product_name}</Text>
              {item.product_sku && (
                <Text style={[styles.td, { fontSize: 6.5, color: '#64748b' }]}>SKU: {item.product_sku}</Text>
              )}
            </View>
            <Text style={[styles.td, styles.colCategory]}>{item.category_name || '—'}</Text>
            <Text style={[styles.tdBold, styles.colSold]}>{formatQuantity(item.total_quantity, item.unit_type)}</Text>
            <Text style={[styles.td, styles.colStock]}>
              {item.track_stock ? formatQuantity(item.current_stock || 0, item.unit_type) : '—'}
            </Text>
            <View style={styles.colStatus}>
              <Text style={statusStyle}>
                {status.status === 'critical' ? 'CRIT' :
                 status.status === 'low' ? 'LAAG' :
                 status.status === 'ok' ? 'OK' : 'N/A'}
              </Text>
            </View>
            <View style={styles.colRefill}>
              {refill !== null && refill > 0 ? (
                <Text style={styles.refillBadge}>+{formatQuantity(refill, item.unit_type)}</Text>
              ) : (
                <Text style={styles.td}>—</Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function SoldProductsGroupedPDFDocument({ groups, dateRange, groupByLabel }: SoldProductsGroupedPDFProps) {
  return (
    <Document>
      {groups.map(g => {
        const groupTotalQty = g.items.reduce((s, i) => s + i.total_quantity, 0)
        return (
          <Page key={g.key} size="A4" style={styles.page}>
            {/* Header — group name is dominant, period is the subtitle */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>{g.name}</Text>
                <Text style={styles.subtitle}>
                  {groupByLabel} · Verkochte producten voor bijvullen
                </Text>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateLabel}>Periode</Text>
                  <Text style={styles.dateValue}>
                    {dateRange.start === dateRange.end
                      ? formatDate(dateRange.start)
                      : `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Compact summary for this group */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Producten</Text>
                <Text style={styles.summaryValue}>{g.items.length}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Totaal verkocht</Text>
                <Text style={styles.summaryValue}>{Math.round(groupTotalQty)}</Text>
              </View>
            </View>

            <GroupedItemsTable items={g.items} />

            <View style={styles.footer} wrap={false}>
              <Text style={styles.footerText}>
                Gegenereerd op {new Date().toLocaleDateString('nl-NL', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

// The actual PDF document
function SoldProductsPDFDocument({ items, summary, dateRange }: SoldProductsPDFDocumentProps) {
  const trackedCount = items.filter(i => i.track_stock).length
  const untrackedCount = items.length - trackedCount

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Verkochte Producten</Text>
            <Text style={styles.subtitle}>
              Overzicht voor bijvullen van voorraad
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Periode</Text>
              <Text style={styles.dateValue}>
                {dateRange.start === dateRange.end
                  ? formatDate(dateRange.start)
                  : `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Cards - No revenue (PDF is for refill workflow only) */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Producten</Text>
            <Text style={styles.summaryValue}>{summary.totalProducts}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Totaal Verkocht</Text>
            <Text style={styles.summaryValue}>{Math.round(summary.totalQuantity)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Lage Voorraad</Text>
            <Text style={summary.lowStockCount > 0 ? styles.summaryValueAmber : styles.summaryValue}>
              {summary.lowStockCount}
            </Text>
          </View>
        </View>

        {/* Products Table - No revenue column */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colProduct]}>Product</Text>
            <Text style={[styles.th, styles.colCategory]}>Categorie</Text>
            <Text style={[styles.th, styles.colSold]}>Verkocht</Text>
            <Text style={[styles.th, styles.colStock]}>Voorraad</Text>
            <Text style={[styles.th, styles.colStatus]}>Status</Text>
            <Text style={[styles.th, styles.colRefill]}>Bijvullen</Text>
          </View>

          {items.map((item, idx) => {
            const status = getStockStatus(item)
            const refill = getSuggestedRefill(item)

            const rowStyle = [
              styles.tableRow,
              status.status === 'critical' ? styles.rowCritical :
              status.status === 'low' ? styles.rowLow :
              idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
            ]

            const statusStyle = [
              styles.statusBadge,
              status.status === 'critical' ? styles.statusCritical :
              status.status === 'low' ? styles.statusLow :
              status.status === 'ok' ? styles.statusOk :
              styles.statusNA,
            ]

            return (
              <View key={item.product_id} wrap={false} style={rowStyle}>
                <View style={styles.colProduct}>
                  <Text style={styles.tdBold}>{item.product_name}</Text>
                  {item.product_sku && (
                    <Text style={[styles.td, { fontSize: 6.5, color: '#64748b' }]}>
                      SKU: {item.product_sku}
                    </Text>
                  )}
                </View>
                <Text style={[styles.td, styles.colCategory]}>
                  {item.category_name || '—'}
                </Text>
                <Text style={[styles.tdBold, styles.colSold]}>
                  {formatQuantity(item.total_quantity, item.unit_type)}
                </Text>
                <Text style={[styles.td, styles.colStock]}>
                  {item.track_stock ? formatQuantity(item.current_stock || 0, item.unit_type) : '—'}
                </Text>
                <View style={styles.colStatus}>
                  <Text style={statusStyle}>
                    {status.status === 'critical' ? 'CRIT' :
                     status.status === 'low' ? 'LAAG' :
                     status.status === 'ok' ? 'OK' : 'N/A'}
                  </Text>
                </View>
                <View style={styles.colRefill}>
                  {refill !== null && refill > 0 ? (
                    <Text style={styles.refillBadge}>
                      +{formatQuantity(refill, item.unit_type)}
                    </Text>
                  ) : (
                    <Text style={styles.td}>—</Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} wrap={false}>
          <Text style={styles.footerText}>
            Gegenereerd op {new Date().toLocaleDateString('nl-NL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {untrackedCount > 0 && (
            <Text style={styles.footerNote}>
              {untrackedCount} product{untrackedCount !== 1 ? 'en' : ''} zonder voorraadtracking.
              Alleen bijvulsuggesties voor getrackte producten.
            </Text>
          )}
        </View>
      </Page>
    </Document>
  )
}

interface SoldProductsPDFProps {
  items: SoldProductItem[]
  summary: SoldProductsResult['summary'] | null
  dateRange: DateRange
  onClose: () => void
  // Driver-routing mode (Phase 4) — when both are supplied, the PDF renders
  // one page per group instead of the flat document.
  groups?: SoldProductsGroup[]
  groupByLabel?: string
}

export default function SoldProductsPDF({
  items,
  summary,
  dateRange,
  onClose,
  groups,
  groupByLabel,
}: SoldProductsPDFProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)

  if (!summary) return null

  const grouped = groups && groups.length > 0
  const renderDoc = () => grouped
    ? <SoldProductsGroupedPDFDocument groups={groups!} dateRange={dateRange} groupByLabel={groupByLabel ?? ''} />
    : <SoldProductsPDFDocument items={items} summary={summary} dateRange={dateRange} />

  const handleDownload = async () => {
    setGenerating(true)
    try {
      const blob = await pdf(renderDoc()).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `verkochte-producten-${dateRange.start}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = async () => {
    setGenerating(true)
    try {
      const blob = await pdf(renderDoc()).toBlob()
      const url = URL.createObjectURL(blob)

      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    } catch (err) {
      console.error('Failed to generate PDF for print:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col ${
        showPreview ? 'w-full max-w-5xl h-[90vh]' : 'w-full max-w-md'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Verkochte Producten Export
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {dateRange.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showPreview ? (
            <div className="h-full">
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                {renderDoc()}
              </PDFViewer>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Summary - No revenue (PDF is for refill workflow) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Periode</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {dateRange.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Producten</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {summary.totalProducts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Totaal verkocht</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {Math.round(summary.totalQuantity)} items
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Lage voorraad</span>
                  <span className={`text-sm font-semibold ${summary.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                    {summary.lowStockCount} producten
                  </span>
                </div>
              </div>

              {/* Stock info */}
              {summary.lowStockCount > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <span className="font-semibold">{summary.lowStockCount}</span> product{summary.lowStockCount !== 1 ? 'en' : ''} met lage voorraad.
                    Bijvulsuggesties zijn berekend op basis van 3 dagen buffer.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Verbergen' : 'Preview'}
            </button>

            <button
              onClick={handlePrint}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {generating ? 'Genereren...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
