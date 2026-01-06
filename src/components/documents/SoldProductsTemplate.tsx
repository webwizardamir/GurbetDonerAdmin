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
    fontSize: 9,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#16a34a',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateBox: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    paddingHorizontal: 12,
  },
  dateLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },

  // SUMMARY CARDS
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  summaryValueGreen: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
  },
  summaryValueAmber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#d97706',
  },

  // TABLE
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
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
    fontSize: 8,
  },
  tdBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  // Column widths (no revenue column - PDF is for refill workflow only)
  colProduct: { flex: 2, paddingRight: 8 },
  colCategory: { flex: 1, paddingRight: 8 },
  colSold: { width: 70, textAlign: 'right', paddingRight: 8 },
  colStock: { width: 70, textAlign: 'right', paddingRight: 8 },
  colStatus: { width: 55, textAlign: 'center', paddingRight: 8 },
  colRefill: { width: 70, textAlign: 'right' },

  // Status badges
  statusBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 4,
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
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: 'right',
  },

  // FOOTER
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
  footerNote: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
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
              <View key={item.product_id} style={rowStyle}>
                <View style={styles.colProduct}>
                  <Text style={styles.tdBold}>{item.product_name}</Text>
                  {item.product_sku && (
                    <Text style={[styles.td, { fontSize: 7, color: '#64748b' }]}>
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
        <View style={styles.footer}>
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
}

export default function SoldProductsPDF({
  items,
  summary,
  dateRange,
  onClose,
}: SoldProductsPDFProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)

  if (!summary) return null

  const handleDownload = async () => {
    setGenerating(true)
    try {
      const blob = await pdf(
        <SoldProductsPDFDocument items={items} summary={summary} dateRange={dateRange} />
      ).toBlob()

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
      const blob = await pdf(
        <SoldProductsPDFDocument items={items} summary={summary} dateRange={dateRange} />
      ).toBlob()
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
                <SoldProductsPDFDocument items={items} summary={summary} dateRange={dateRange} />
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
