import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, Loader2, Truck, Route as RouteIcon, Navigation,
  FileText, Copy, AlertTriangle, RefreshCw, Share2, Receipt, ListFilter,
  Save, BookmarkCheck, Info, Globe,
} from 'lucide-react'
import { useDeliveryRoute } from '../../hooks/useDeliveryRoute'
import { buildGoogleMapsUrl, formatDistance, formatDuration, etaClock } from '../../utils/route'
import { renderInvoicesToFiles, type InvoiceOutputMode } from '../../utils/renderInvoices'
import DeliveryStopList from './DeliveryStopList'
import LoadingOrderList from './LoadingOrderList'
import DeliveryRoutePDF from '../documents/DeliveryRouteTemplate'

// Display order for the status filter. `draft` is deliberately absent — a
// Concept order is unfinalised and never routable (it is already excluded
// server-side in fetchRouteOrders), so it must not even be offered here.
const ROUTE_STATUS_ORDER = ['pending', 'pending_payment', 'on_hold', 'processing', 'delivered', 'completed']

interface Props {
  day: string
  endDay?: string
  dayLabel: string
  cities?: string[]
  /** Optional admin-only customer-type filter (e.g. a Horeca-only route). */
  customerType?: string[]
  /** Fired whenever the (manual or optimized) route order changes, with the
   *  order ids flattened into exact delivery sequence — so the day-close modal
   *  can print invoices in route order. */
  onRouteOrderChange?: (orderedOrderIds: string[]) => void
  /** Fired with the order ids of the stops that were deliberately taken off the
   *  round, so Dagafsluiting can start with those orders unticked. */
  onExcludedOrdersChange?: (excludedOrderIds: string[]) => void
  onClose: () => void
}

export default function DeliveryRoutePanel({ day, endDay, dayLabel, cities, customerType, onRouteOrderChange, onExcludedOrdersChange, onClose }: Props) {
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

  // Same channel for the stops taken off the round: Dagafsluiting starts with
  // those orders unticked instead of quietly invoicing what was just excluded.
  useEffect(() => {
    onExcludedOrdersChange?.(r.excludedOrderIds)
  }, [r.excludedOrderIds, onExcludedOrdersChange])

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

  // Only offer statuses that actually occur in this window, ordered by the
  // lifecycle above; anything unexpected (a legacy status) is appended so it
  // can never be silently unreachable.
  const statusOptions = useMemo(() => {
    const present = Object.keys(r.statusCounts).filter(s => r.statusCounts[s] > 0)
    const known = ROUTE_STATUS_ORDER.filter(s => present.includes(s))
    return [...known, ...present.filter(s => !ROUTE_STATUS_ORDER.includes(s)).sort()]
  }, [r.statusCounts])
  const totalOrderCount = useMemo(
    () => Object.values(r.statusCounts).reduce((n, v) => n + v, 0),
    [r.statusCounts],
  )

  const allSelected = r.selectedCount === r.candidateCount && r.candidateCount > 0
  // The manual order is authoritative — export stays enabled after a reorder.
  // Only a never-geocoded (just toggled-in) stop blocks it (handled by exportReady).
  const canExport = r.exportReady

  // "Opgeslagen om 07:41" — the saved-at clock, in the app language.
  const savedAtLabel = useMemo(() => {
    if (!r.savedPlan) return ''
    const d = new Date(r.savedPlan.savedAt)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }, [r.savedPlan])

  const savedFilterSummary = useMemo(() => {
    const f = r.savedPlan?.filters
    if (!f) return ''
    const parts: string[] = []
    if (f.cities?.length) parts.push(f.cities.join(', '))
    if (f.customerType?.length) parts.push(f.customerType.join(', '))
    if (f.statusFilter) parts.push(t(`orders.status.${f.statusFilter}`, { defaultValue: f.statusFilter }))
    return parts.length ? parts.join(' · ') : t('route.plan.noFilters')
  }, [r.savedPlan, t])

  // Driver-facing text is always Dutch (like the PDFs), regardless of app
  // language — so it formats the raw dates itself rather than reusing the
  // page's range label, which now follows the UI language.
  const dutchDate = () => {
    const f = (d: string) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    return endDay && endDay !== day ? `${f(day)} t/m ${f(endDay)}` : f(day)
  }

  const routeText = () => {
    const er = r.effectiveRoute
    if (!er) return ''
    const lines = er.stops.map(s => {
      const eta = etaClock(er.departureTime, s.etaSeconds)
      return `${s.sequence}. ${s.customerName}, ${s.address.oneLine}${eta ? `  (${eta})` : ''}`
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
              <ListFilter className="w-4 h-4 shrink-0" />
              <select value={r.statusFilter} onChange={e => r.setStatusFilter(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="">{t('route.allStatuses')} ({totalOrderCount})</option>
                {statusOptions.map(s => (
                  <option key={s} value={s}>
                    {t(`orders.status.${s}`, { defaultValue: s })} ({r.statusCounts[s]})
                  </option>
                ))}
              </select>
            </label>
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

            {/* Foreign stops are the exception, so this only appears on a day
                that actually has one. The preference is remembered, so a regular
                cross-border run is set once, not re-ticked every morning. */}
            {r.foreignCount > 0 && (
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer" title={t('route.includeForeignHint')}>
                <input type="checkbox" checked={r.includeForeign} onChange={r.toggleIncludeForeign}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500" />
                <Globe className="w-3.5 h-3.5 shrink-0" />
                {t('route.includeForeign', { count: r.foreignCount })}
              </label>
            )}

            {/* The loading order is the reverse of the arrangement on screen —
                it needs no Google run, so it is offered whenever there are
                stops, not only after an optimize. */}
            {r.selectedCount > 0 && (
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
              {r.saveError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">{r.saveError}</div>
              )}

              {/* Saved arrangement loaded — the whole point of the feature: the
                  manager sees whose round this is and does NOT have to optimize. */}
              {r.savedPlan && (
                <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl text-sm text-cyan-800 dark:text-cyan-300 flex items-start gap-2">
                  <BookmarkCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p>
                      {r.savedPlan.savedByName
                        ? t('route.plan.loadedBy', { name: r.savedPlan.savedByName, when: savedAtLabel })
                        : t('route.plan.loaded', { when: savedAtLabel })}
                    </p>
                    {r.dirtyVsSaved && <p className="text-xs mt-0.5 opacity-80">{t('route.plan.unsavedChanges')}</p>}
                  </div>
                </div>
              )}

              {/* Filters differ from the ones the plan was arranged under, so the
                  added/removed diff would be comparing two different sets. */}
              {r.savedFiltersMismatch && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t('route.plan.filterMismatch', { filters: savedFilterSummary })}</span>
                </div>
              )}

              {/* Drift: orders came in or fell away since the plan was saved. */}
              {r.drift?.hasDrift && !r.savedFiltersMismatch && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium">{t('route.plan.driftTitle')}</p>
                    {r.drift.addedOrderIds.length > 0 && (
                      <p>{t('route.plan.driftAdded', { count: r.drift.addedOrderIds.length })}
                        {r.drift.newCustomerIds.length > 0 && ` · ${t('route.plan.driftNewStops', { count: r.drift.newCustomerIds.length })}`}
                      </p>
                    )}
                    {r.drift.removedOrderIds.length > 0 && (
                      <p>{t('route.plan.driftRemoved', { count: r.drift.removedOrderIds.length })}</p>
                    )}
                    <p className="text-xs opacity-80">{t('route.plan.driftHint')}</p>
                  </div>
                </div>
              )}

              {/* No plan at all: the list is in candidate order, which is not a
                  round. Say so, so nobody prints an unarranged list by accident. */}
              {!r.hasPlan && r.selectedCount > 0 && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t('route.plan.notPlannedYet')}</span>
                </div>
              )}

              {/* A stop with no coordinates would silently vanish from the Maps
                  URL. Now that export no longer requires a Google run, this is
                  the only remaining hard blocker — so it is shown whenever it
                  applies, not just after an optimize. */}
              {!r.exportReady && !r.depotLoading && r.selectedCount > 0 && (
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
                      <li key={f.customerId} className="text-xs text-amber-600 dark:text-amber-400">{f.customerName} · {f.address.oneLine || t('route.noAddress')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {view === 'loading' ? (
                <LoadingOrderList loadingOrder={r.loadingOrder} />
              ) : (
                <DeliveryStopList
                  included={r.includedStops}
                  excluded={r.excludedStops}
                  hasRoute={r.hasPlan}
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
          {/* Save the arrangement for whoever opens this day next. No Google
              call — it stores the sequence, not a new computation. Emphasised
              while it differs from what is stored, quiet once it matches. */}
          <button onClick={r.save} disabled={r.saving || r.selectedCount === 0}
            title={t('route.plan.save')}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${
              r.dirtyVsSaved || !r.savedPlan
                ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}>
            {r.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('route.plan.save')}</span>
          </button>
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
