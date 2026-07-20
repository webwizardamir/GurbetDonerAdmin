import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, Loader2, Truck, Route as RouteIcon, Navigation,
  FileText, Copy, AlertTriangle, RefreshCw, Share2, Receipt,
} from 'lucide-react'
import { useDeliveryRoute } from '../../hooks/useDeliveryRoute'
import { buildGoogleMapsUrl, formatDistance, formatDuration, etaClock } from '../../utils/route'
import { renderInvoicesToFiles, type InvoiceOutputMode } from '../../utils/renderInvoices'
import DeliveryStopList from './DeliveryStopList'
import LoadingOrderList from './LoadingOrderList'
import DeliveryRoutePDF from '../documents/DeliveryRouteTemplate'

interface Props {
  day: string
  endDay?: string
  dayLabel: string
  cities?: string[]
  /** Optional admin-only customer-type filter (e.g. a Horeca-only route). */
  customerType?: string
  /** Fired whenever the (manual or optimized) route order changes, with the
   *  order ids flattened into exact delivery sequence — so the day-close modal
   *  can print invoices in route order. */
  onRouteOrderChange?: (orderedOrderIds: string[]) => void
  onClose: () => void
}

export default function DeliveryRoutePanel({ day, endDay, dayLabel, cities, customerType, onRouteOrderChange, onClose }: Props) {
  const { t } = useTranslation()
  const r = useDeliveryRoute(day, endDay, cities, customerType)
  const cityLabel = cities && cities.length ? cities.join(', ') : ''
  const [view, setView] = useState<'delivery' | 'loading'>('delivery')
  const [showPDF, setShowPDF] = useState(false)
  const [copied, setCopied] = useState(false)
  const [invoiceMenuOpen, setInvoiceMenuOpen] = useState(false)
  const [invoiceBusy, setInvoiceBusy] = useState(false)
  const [invoiceProgress, setInvoiceProgress] = useState<{ done: number; total: number } | null>(null)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)

  // Order ids flattened into exact delivery sequence (each stop = one customer
  // whose merged orderIds keep their order). Used for invoice printing + hand-off.
  const orderedInvoiceIds = useMemo(
    () => r.effectiveStops.flatMap(s => s.orderIds),
    [r.effectiveStops],
  )

  // Keep the parent (SoldProducts) in sync so DayCloseModal can follow this order.
  useEffect(() => {
    onRouteOrderChange?.(orderedInvoiceIds)
  }, [orderedInvoiceIds, onRouteOrderChange])

  const printInvoices = async (mode: InvoiceOutputMode) => {
    if (orderedInvoiceIds.length === 0) return
    setInvoiceBusy(true)
    setInvoiceError(null)
    setInvoiceProgress({ done: 0, total: orderedInvoiceIds.length })
    try {
      await renderInvoicesToFiles(orderedInvoiceIds, {
        mode,
        combinedFilename: `bezorgroute-facturen-${day}`,
        onProgress: (done, total) => setInvoiceProgress({ done, total }),
      })
      setInvoiceMenuOpen(false)
    } catch (e) {
      setInvoiceError(e instanceof Error ? e.message : String(e))
    } finally {
      setInvoiceBusy(false)
      setInvoiceProgress(null)
    }
  }

  const allSelected = r.selectedCount === r.candidateCount && r.candidateCount > 0
  // The manual order is authoritative — export stays enabled after a reorder.
  // Only a never-geocoded (just toggled-in) stop blocks it (handled by exportReady).
  const canExport = r.exportReady

  // Driver-facing text is always Dutch (like the PDFs), regardless of app
  // language. The range label is English, so format the date(s) in Dutch.
  const dutchDate = () => {
    const f = (d: string) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    return endDay && endDay !== day ? `${f(day)} t/m ${f(endDay)}` : f(day)
  }

  const routeText = () => {
    const er = r.effectiveRoute
    if (!er) return ''
    const lines = er.stops.map(s => {
      const eta = etaClock(er.departureTime, s.etaSeconds)
      return `${s.sequence}. ${s.customerName} — ${s.address.oneLine}${eta ? `  (${eta})` : ''}`
    })
    return `Bezorgroute ${dutchDate()}\n${lines.join('\n')}`
  }

  const handleCopy = () => {
    if (!r.effectiveRoute) return
    navigator.clipboard.writeText(routeText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mapsUrl = () => r.effectiveRoute ? buildGoogleMapsUrl(r.effectiveRoute.depot, r.effectiveRoute.stops, r.effectiveRoute.returnToDepot) : ''

  const openInMaps = () => { if (r.effectiveRoute) window.open(mapsUrl(), '_blank') }

  // Share the route with the driver (who has no app access): a Google Maps
  // directions link works for anyone — send it over WhatsApp.
  const shareWhatsApp = () => {
    if (!r.effectiveRoute) return
    const n = r.effectiveRoute.stops.length
    const text = `Bezorgroute ${dutchDate()} (${n} stops)\nRoute openen in Google Maps:\n${mapsUrl()}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg shrink-0">
              <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{t('route.title')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{dayLabel}{cityLabel ? ` · ${cityLabel}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 space-y-2.5">
          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-sm">
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={() => (allSelected ? r.selectNone() : r.selectAll())}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
              {t('route.selectAll')}
            </label>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">{t('route.stops')}: <span className="font-semibold text-slate-900 dark:text-white">{r.selectedCount}/{r.candidateCount}</span></span>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">{t('route.items')}: <span className="font-semibold text-slate-900 dark:text-white">{Math.round(r.itemCount)}</span></span>
            {r.route && !r.orderDirty && <span className="text-slate-500 dark:text-slate-400 tabular-nums">{formatDistance(r.effectiveTotals.distanceMeters)} · {formatDuration(r.effectiveTotals.durationSeconds)}</span>}
            {r.orderDirty && r.route && (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {t('route.etaStaleHint')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-sm">
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              {t('route.departure')}
              <input type="time" value={r.departureHHmm} onChange={e => r.updateDeparture(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </label>
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" checked={r.returnToDepot} onChange={r.toggleReturnToDepot}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500" />
              {t('route.returnToDepot')}
            </label>

            {r.route && (
              <div className="ml-auto inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {(['delivery', 'loading'] as const).map((v, i) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${view === v ? 'bg-cyan-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'} ${i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}>
                    {v === 'delivery' ? t('route.deliveryOrder') : t('route.loadingOrder')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-4 bg-slate-50 dark:bg-slate-900/40">
          {r.loadingCandidates ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-cyan-600 animate-spin" /></div>
          ) : r.candidatesError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">{r.candidatesError}</div>
          ) : r.candidateCount === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">{t('route.noStops')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {r.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">{r.error}</div>
              )}
              {r.route && !r.exportReady && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {t('route.needsReoptimize')}
                </div>
              )}
              {r.route?.truncatedOptimization && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {t('route.truncatedOptimization')}
                </div>
              )}
              {r.route && r.route.geocodeFailures.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-1.5">{t('route.geocodeFailed', { count: r.route.geocodeFailures.length })}</p>
                  <ul className="space-y-0.5">
                    {r.route.geocodeFailures.map(f => (
                      <li key={f.customerId} className="text-xs text-amber-600 dark:text-amber-400">{f.customerName} — {f.address.oneLine || t('route.noAddress')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {view === 'loading' && r.route ? (
                <LoadingOrderList loadingOrder={r.loadingOrder} />
              ) : (
                <DeliveryStopList
                  included={r.includedStops}
                  excluded={r.excludedStops}
                  hasRoute={!!r.route}
                  departureTime={r.effectiveRoute?.departureTime ?? null}
                  onToggle={r.toggleStop}
                  onMove={r.moveStop}
                  onMoveToPosition={r.moveStopToPosition}
                  onSetLock={r.setLock}
                />
              )}
            </div>
          )}
        </div>

        {/* Invoice print choice (route order) */}
        {invoiceMenuOpen && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-900/40">
            {invoiceError && (
              <div className="mb-2 text-sm text-red-600 dark:text-red-400">{invoiceError}</div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('route.printInvoicesAs')}</span>
              <button onClick={() => printInvoices('combined')} disabled={invoiceBusy}
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {invoiceBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                {t('dayClose.combined')}
              </button>
              <button onClick={() => printInvoices('separate')} disabled={invoiceBusy}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">
                {t('dayClose.separate')}
              </button>
              {invoiceProgress && <span className="text-sm text-slate-500 tabular-nums">{invoiceProgress.done}/{invoiceProgress.total}</span>}
              <button onClick={() => setInvoiceMenuOpen(false)} disabled={invoiceBusy}
                className="ml-auto text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 shrink-0 flex flex-wrap items-center gap-2">
          <button
            onClick={r.optimize}
            disabled={r.planning || r.selectedCount === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {r.planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RouteIcon className="w-4 h-4" />}
            {r.route ? t('route.reoptimize') : t('route.optimize')}
          </button>
          {r.route && r.orderDirty && (
            <button onClick={r.applyManualOrder} disabled={r.planning}
              title={t('route.refreshEtas')}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">{t('route.refreshEtas')}</span>
            </button>
          )}
          <button onClick={shareWhatsApp} disabled={!canExport}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50" title={t('route.shareWithDriver')}>
            <Share2 className="w-4 h-4" /> <span className="hidden md:inline">{t('route.shareWithDriver')}</span>
          </button>
          <button onClick={openInMaps} disabled={!canExport}
            className="p-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50" title={t('route.openInGoogleMaps')}>
            <Navigation className="w-4 h-4" />
          </button>
          <button onClick={() => setShowPDF(true)} disabled={!canExport}
            className="p-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50" title={t('route.printPdf')}>
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={() => setInvoiceMenuOpen(o => !o)} disabled={!canExport || orderedInvoiceIds.length === 0}
            className="p-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50" title={t('route.printInvoices')} aria-label={t('route.printInvoices')}>
            <Receipt className="w-4 h-4" />
          </button>
          <button onClick={handleCopy} disabled={!canExport}
            className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50" title={t('route.copy')}>
            <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-slate-700 dark:text-slate-300'}`} />
          </button>
        </div>
      </div>

      {showPDF && r.effectiveRoute && (
        <DeliveryRoutePDF route={r.effectiveRoute} day={day} onClose={() => setShowPDF(false)} />
      )}
    </div>
  )
}
