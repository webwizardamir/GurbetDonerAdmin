import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Loader2, FileText, AlertCircle, CheckSquare, Square, Truck, Package, Receipt, Plus, Minus } from 'lucide-react'
import Modal from '../ui/Modal'
import { buildSoldProductsDocument } from './SoldProductsTemplate'
import { fetchOrders } from '../../services/orders'
import { renderInvoicesToFiles } from '../../utils/renderInvoices'
import { formatPrice } from '../../utils/format'

type SoldProductsDocArgs = Parameters<typeof buildSoldProductsDocument>[0]

interface DayRange {
  start: string
  end: string
  label: string
}

interface Props {
  dateRange: DayRange
  /** Optional admin-only customer-type filter (e.g. a Horeca-only day close). */
  customerType?: string
  /** Sold-products data already loaded on the page, for the optional PDF. */
  soldProducts?: SoldProductsDocArgs
  /** Hand off to the route planner (it needs a billed Google optimize). */
  onOpenRoute: () => void
  /** Order ids in the currently planned delivery-route sequence (if any), so
   *  invoices can be printed in route order. */
  routeOrderedIds?: string[]
  onClose: () => void
}

interface OrderRow {
  orderId: string
  orderNumber: string
  customerName: string
  total: number
  selected: boolean
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const BIG_BATCH = 100
const MAX_COPIES = 5

export default function DayCloseModal({ dateRange, customerType, soldProducts, onOpenRoute, routeOrderedIds, onClose }: Props) {
  const { t } = useTranslation()
  const hasRouteOrder = !!routeOrderedIds && routeOrderedIds.length > 0
  const [useRouteOrder, setUseRouteOrder] = useState(true)

  // Reorder the selected invoice ids to follow the planned delivery route:
  // route-sequenced ids first (in route order), any remaining ids after.
  const orderInvoiceIds = (ids: string[]): string[] => {
    if (!hasRouteOrder || !useRouteOrder) return ids
    const set = new Set(ids)
    const inRoute = routeOrderedIds!.filter(id => set.has(id))
    const seen = new Set(inRoute)
    return [...inRoute, ...ids.filter(id => !seen.has(id))]
  }

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [capped, setCapped] = useState(false)

  // What to produce. Invoices on by default; sold-products & route are opt-in.
  const [doInvoices, setDoInvoices] = useState(true)
  const [doSoldProducts, setDoSoldProducts] = useState(false)
  const [doRoute, setDoRoute] = useState(false)
  const [invoiceMode, setInvoiceMode] = useState<'combined' | 'separate'>('combined')
  const [copies, setCopies] = useState(1)

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingOrders(true)
    setOrdersError(null)
    const FETCH_LIMIT = 1000
    fetchOrders({ dateFrom: dateRange.start, dateTo: dateRange.end, limit: FETCH_LIMIT, customerType })
      .then(rows => {
        if (cancelled) return
        setCapped(rows.length >= FETCH_LIMIT)
        const usable = rows
          .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
          .map<OrderRow>(o => ({
            orderId: o.id,
            orderNumber: o.order_number,
            customerName: o.customer?.company_name ?? '—',
            total: o.total,
            selected: true,
          }))
        setOrders(usable)
      })
      .catch(e => { if (!cancelled) setOrdersError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoadingOrders(false) })
    return () => { cancelled = true }
  }, [dateRange.start, dateRange.end, customerType])

  const selectedIds = useMemo(() => orders.filter(o => o.selected).map(o => o.orderId), [orders])
  const allSelected = orders.length > 0 && selectedIds.length === orders.length

  const toggleOrder = (id: string) =>
    setOrders(prev => prev.map(o => (o.orderId === id ? { ...o, selected: !o.selected } : o)))
  const toggleAll = () =>
    setOrders(prev => prev.map(o => ({ ...o, selected: !allSelected })))

  // Generate is meaningful only if at least one output is enabled (and, for
  // invoices, at least one order is selected).
  const canGenerate =
    !generating &&
    ((doInvoices && selectedIds.length > 0) || (doSoldProducts && !!soldProducts) || doRoute)

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    setProgress(null)
    // Track how many invoice numbers were actually issued, so a mid-batch
    // failure can tell the operator to re-run (already-issued numbers are
    // reused, never duplicated).
    let issued = 0
    try {
      if (doInvoices && selectedIds.length > 0) {
        setProgress({ done: 0, total: selectedIds.length })
        const orderedIds = orderInvoiceIds(selectedIds)
        issued = await renderInvoicesToFiles(orderedIds, {
          mode: invoiceMode,
          combinedFilename: `dagfacturen-${dateRange.start}`,
          copies: invoiceMode === 'combined' ? copies : 1,
          onProgress: (done, total) => { issued = done; setProgress({ done, total }) },
        })
      }

      if (doSoldProducts && soldProducts) {
        const blob = await pdf(buildSoldProductsDocument(soldProducts)).toBlob()
        downloadBlob(blob, `verkochte-producten-${dateRange.start}.pdf`)
      }

      if (doRoute) {
        onOpenRoute()
        onClose()
        return
      }

      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setGenError(issued > 0 ? `${t('dayClose.errorIssued', { n: issued })} ${msg}` : msg)
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  return (
    <Modal isOpen onClose={() => !generating && onClose()} title={t('dayClose.title')} maxWidth="max-w-2xl">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('dayClose.subtitle', { range: dateRange.label })}</p>

        {/* What to produce */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('dayClose.outputs')}</h3>
          <OutputToggle
            checked={doInvoices}
            onToggle={() => setDoInvoices(v => !v)}
            icon={<Receipt className="w-4 h-4 text-green-600 dark:text-green-400" />}
            label={t('dayClose.invoices')}
            hint={t('dayClose.invoicesHint')}
          />
          <OutputToggle
            checked={doSoldProducts}
            onToggle={() => setDoSoldProducts(v => !v)}
            disabled={!soldProducts}
            icon={<Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            label={t('dayClose.soldProducts')}
            hint={t('dayClose.soldProductsHint')}
          />
          <OutputToggle
            checked={doRoute}
            onToggle={() => setDoRoute(v => !v)}
            icon={<Truck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
            label={t('dayClose.route')}
            hint={t('dayClose.routeHint')}
          />
        </section>

        {/* Invoice options */}
        {doInvoices && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('dayClose.outputFormat')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['combined', 'separate'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInvoiceMode(m)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    invoiceMode === m
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {m === 'combined' ? t('dayClose.combined') : t('dayClose.separate')}
                </button>
              ))}
            </div>

            {invoiceMode === 'combined' && (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">{t('dayClose.copies')}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{t('dayClose.copiesHint')}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCopies(c => Math.max(1, c - 1))}
                    disabled={copies <= 1}
                    aria-label={t('dayClose.copiesDecrease')}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{copies}</span>
                  <button
                    type="button"
                    onClick={() => setCopies(c => Math.min(MAX_COPIES, c + 1))}
                    disabled={copies >= MAX_COPIES}
                    aria-label={t('dayClose.copiesIncrease')}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {hasRouteOrder && (
              <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
                <input type="checkbox" checked={useRouteOrder} onChange={() => setUseRouteOrder(v => !v)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('dayClose.useRouteOrder')}</span>
              </label>
            )}

            {/* Order list */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <button type="button" onClick={toggleAll} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  {allSelected ? <CheckSquare className="w-4 h-4 text-green-600" /> : <Square className="w-4 h-4" />}
                  {t('dayClose.selectAll')}
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {t('dayClose.selectedCount', { n: selectedIds.length, total: orders.length })}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
                ) : ordersError ? (
                  <div className="px-3 py-4 text-sm text-red-600 dark:text-red-400">{ordersError}</div>
                ) : orders.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('dayClose.noOrders')}</div>
                ) : (
                  orders.map(o => (
                    <label key={o.orderId} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <input
                        type="checkbox"
                        checked={o.selected}
                        onChange={() => toggleOrder(o.orderId)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                      />
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">{o.orderNumber}</span>
                      <span className="text-sm text-slate-900 dark:text-white truncate flex-1 min-w-0">{o.customerName}</span>
                      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300 shrink-0">{formatPrice(o.total)}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {capped && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">{t('dayClose.cappedWarning')}</p>
              </div>
            )}
            {orders.length > BIG_BATCH && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">{t('dayClose.bigBatchWarning', { n: orders.length })}</p>
              </div>
            )}
          </section>
        )}

        {genError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">{genError}</div>
          </div>
        )}

        {generating && progress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{t('dayClose.generating')}</span>
              <span className="tabular-nums">{progress.done}/{progress.total}</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => !generating && onClose()}
          disabled={generating}
          className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {t('dayClose.generate')}
        </button>
      </div>
    </Modal>
  )
}

function OutputToggle({ checked, onToggle, icon, label, hint, disabled }: {
  checked: boolean
  onToggle: () => void
  icon: React.ReactNode
  label: string
  hint: string
  disabled?: boolean
}) {
  return (
    <label className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
      disabled
        ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
        : checked
          ? 'border-green-400 dark:border-green-700 bg-green-50/40 dark:bg-green-900/10 cursor-pointer'
          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
      />
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </label>
  )
}
