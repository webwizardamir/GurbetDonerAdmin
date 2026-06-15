import { useState } from 'react'
import {
  Document, Page, View, Text, StyleSheet, pdf, BlobProvider,
} from '@react-pdf/renderer'
import { X, Download, Eye, Printer, Loader2, Truck } from 'lucide-react'
import type { PlannedRoute, PlannedStop } from '../../services/route'
import { formatDistance, formatDuration, etaClock } from '../../utils/route'
import { formatQuantityWithUnit } from '../../utils/format'

// Delivery-route sheet. Dutch only (operational/legal consistency). Brand cyan
// to match the logistics/dispatch document family. Compact ruleset per CLAUDE.md.
const CYAN = '#0891b2'
const CYAN_DARK = '#0e7490'
const AMBER = '#f59e0b'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: 28, backgroundColor: '#ffffff', color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: CYAN },
  title: { fontSize: 18, textTransform: 'uppercase', letterSpacing: 1, color: CYAN, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 8, color: '#64748b', marginTop: 2 },
  metaBox: { alignItems: 'flex-end' },
  metaRow: { fontSize: 8, marginBottom: 1 },
  metaLabel: { color: '#64748b' },
  metaValue: { fontFamily: 'Helvetica-Bold' },

  totals: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  totalCard: { flex: 1, backgroundColor: '#f8fafc', borderTopWidth: 2, borderTopColor: CYAN, padding: 6 },
  totalLabel: { fontSize: 6.5, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' },
  totalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 1 },

  banner: { borderLeftWidth: 2, borderLeftColor: AMBER, backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  bannerText: { fontSize: 7.5, color: '#78350f', lineHeight: 1.35 },

  tHead: { flexDirection: 'row', backgroundColor: CYAN_DARK, paddingVertical: 4, paddingHorizontal: 5 },
  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  num: { width: 22, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  numAmber: { width: 22, fontFamily: 'Helvetica-Bold', fontSize: 8, color: CYAN_DARK },
  colCust: { flex: 2.4, paddingRight: 4 },
  colItems: { flex: 2, paddingRight: 4 },
  colRight: { width: 46, textAlign: 'right' },
  custName: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  custAddr: { fontSize: 7, color: '#475569' },
  note: { fontSize: 6.5, color: '#92400e', marginTop: 1 },
  itemLine: { fontSize: 7 },
  td: { fontSize: 7.5 },
  footer: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: CYAN, paddingTop: 6 },
  footerText: { fontSize: 6.5, color: '#64748b' },
  tag: { fontSize: 6, color: '#64748b' },
})

function manifestText(stop: PlannedStop): string {
  return stop.items
    .map(i => `${formatQuantityWithUnit(i.quantity, i.unitType)} ${i.productName}`)
    .join('\n')
}

function StopRow({ stop, index, amber, total, departureTime }: {
  stop: PlannedStop; index: number; amber?: boolean; total: number; departureTime: string | null
}) {
  const eta = etaClock(departureTime, stop.etaSeconds)
  const tag = amber
    ? (index === 0 ? ' (diepst)' : index === total - 1 ? ' (bij deuren)' : '')
    : ''
  return (
    <View style={styles.row} wrap={false}>
      <Text style={amber ? styles.numAmber : styles.num}>{index + 1}</Text>
      <View style={styles.colCust}>
        <Text style={styles.custName}>{stop.customerName}{tag ? <Text style={styles.tag}>{tag}</Text> : null}</Text>
        <Text style={styles.custAddr}>{stop.address.oneLine}</Text>
        {stop.deliveryNotes ? <Text style={styles.note}>{stop.deliveryNotes}</Text> : null}
      </View>
      <View style={styles.colItems}>
        <Text style={styles.itemLine}>{manifestText(stop)}</Text>
      </View>
      {!amber && (
        <>
          <Text style={[styles.td, styles.colRight]}>{eta ?? '—'}</Text>
          <Text style={[styles.td, styles.colRight]}>{formatDistance(stop.legDistanceMeters)}</Text>
        </>
      )}
    </View>
  )
}

function RouteDoc({ route, day }: { route: PlannedRoute; day: string }) {
  const loading = [...route.stops].reverse()
  const dateLabel = new Date(day).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })
  return (
    <Document>
      {/* Page 1 — delivery order */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Bezorgroute</Text>
            <Text style={styles.subtitle}>Vertrek vanaf {route.depot.label}{route.returnToDepot ? ' · terug naar depot' : ''}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaRow}><Text style={styles.metaLabel}>Datum: </Text><Text style={styles.metaValue}>{dateLabel}</Text></Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalCard}><Text style={styles.totalLabel}>Stops</Text><Text style={styles.totalValue}>{route.totals.stopCount}</Text></View>
          <View style={styles.totalCard}><Text style={styles.totalLabel}>Afstand</Text><Text style={styles.totalValue}>{formatDistance(route.totals.distanceMeters)}</Text></View>
          <View style={styles.totalCard}><Text style={styles.totalLabel}>Rijtijd</Text><Text style={styles.totalValue}>{formatDuration(route.totals.durationSeconds)}</Text></View>
        </View>

        <View style={styles.tHead}>
          <Text style={[styles.th, { width: 22 }]}>#</Text>
          <Text style={[styles.th, styles.colCust]}>Klant / adres</Text>
          <Text style={[styles.th, styles.colItems]}>Artikelen</Text>
          <Text style={[styles.th, styles.colRight]}>Aankomst</Text>
          <Text style={[styles.th, styles.colRight]}>Afstand</Text>
        </View>
        {route.stops.map((s, i) => (
          <StopRow key={s.customerId} stop={s} index={i} total={route.stops.length} departureTime={route.departureTime} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Bezorglijst — {dateLabel}</Text>
        </View>
      </Page>

      {/* Page 2 — loading order (reverse) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Inlaadvolgorde</Text>
            <Text style={styles.subtitle}>{dateLabel}</Text>
          </View>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Laadvolgorde = omgekeerd aan de bezorgvolgorde. </Text>
            Laad de laatste stop eerst (diep / vooraan in de wagen), de eerste stop als laatste (bij de deuren).
          </Text>
        </View>

        <View style={styles.tHead}>
          <Text style={[styles.th, { width: 22 }]}>#</Text>
          <Text style={[styles.th, styles.colCust]}>Klant / adres</Text>
          <Text style={[styles.th, styles.colItems]}>Artikelen</Text>
        </View>
        {loading.map((s, i) => (
          <StopRow key={s.customerId} stop={s} index={i} amber total={loading.length} departureTime={route.departureTime} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Inlaadlijst — {dateLabel}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default function DeliveryRoutePDF({ route, day, onClose }: {
  route: PlannedRoute; day: string; onClose: () => void
}) {
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const renderDoc = () => <RouteDoc route={route} day={day} />

  const handleDownload = async () => {
    setGenerating(true)
    try {
      const blob = await pdf(renderDoc()).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bezorgroute-${day}.pdf`
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
      if (printWindow) printWindow.onload = () => printWindow.print()
    } catch (err) {
      console.error('Failed to generate PDF for print:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col ${showPreview ? 'w-full max-w-5xl h-[90vh]' : 'w-full max-w-md'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bezorgroute Export</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{route.totals.stopCount} stops</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {showPreview ? (
            <div className="h-full">
              <BlobProvider document={renderDoc()}>
                {({ url, loading: blobLoading, error: blobError }) =>
                  blobError ? (
                    <div className="flex items-center justify-center h-full p-6 text-sm text-red-700 dark:text-red-300">Voorbeeld kon niet worden geladen</div>
                  ) : blobLoading || !url ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-cyan-600 animate-spin" /></div>
                  ) : (
                    <iframe title="route-preview" src={`${url}#toolbar=0&navpanes=0&view=Fit`} className="w-full h-full border-0" />
                  )
                }
              </BlobProvider>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3">
                <div className="flex justify-between"><span className="text-sm text-slate-500 dark:text-slate-400">Stops</span><span className="text-sm font-semibold text-slate-900 dark:text-white">{route.totals.stopCount}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-500 dark:text-slate-400">Totale afstand</span><span className="text-sm font-semibold text-slate-900 dark:text-white">{formatDistance(route.totals.distanceMeters)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-500 dark:text-slate-400">Rijtijd</span><span className="text-sm font-semibold text-slate-900 dark:text-white">{formatDuration(route.totals.durationSeconds)}</span></div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pagina 1: bezorglijst · Pagina 2: inlaadvolgorde (omgekeerd).</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowPreview(!showPreview)} className="flex-1 min-w-0 whitespace-nowrap inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <Eye className="w-4 h-4 shrink-0" />{showPreview ? 'Verbergen' : 'Preview'}
            </button>
            <button onClick={handlePrint} disabled={generating} className="flex-1 min-w-0 whitespace-nowrap inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
              <Printer className="w-4 h-4 shrink-0" />Print
            </button>
            <button onClick={handleDownload} disabled={generating} className="flex-1 min-w-0 whitespace-nowrap inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white font-medium rounded-xl transition-colors">
              {generating ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />}
              {generating ? 'Genereren...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
