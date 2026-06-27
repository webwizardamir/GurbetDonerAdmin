import { useEffect, useMemo, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Loader2, Package, Calendar, AlertCircle, Ruler, ChevronRight, ChevronDown } from 'lucide-react'
import {
  fetchCustomerItemsSummary,
  fetchCustomerProductOrders,
  type CustomerItemSummary,
  type CustomerProductOrder,
} from '../../services/customers'
import { useAuth } from '../../context/AuthContext'
import { formatPrice } from '../../utils/format'
import ExportMenu from '../ui/ExportMenu'
import SortableTh from '../ui/SortableTh'
import { useTableSort } from '../../hooks/useTableSort'
import { customerItemsSummaryExportColumns } from '../../utils/export'

interface CustomerProductsTabProps {
  customerId: string
  customerName: string
}

type DateRangeKey = 'last12' | 'last3' | 'last6' | 'thisYear' | 'all'

const DATE_RANGES: Record<DateRangeKey, { labelKey: string; months: number | null }> = {
  last3:    { labelKey: 'customerDetail.products.ranges.last3',  months: 3 },
  last6:    { labelKey: 'customerDetail.products.ranges.last6',  months: 6 },
  last12:   { labelKey: 'customerDetail.products.ranges.last12', months: 12 },
  thisYear: { labelKey: 'customerDetail.products.ranges.thisYear', months: 0 },
  all:      { labelKey: 'customerDetail.products.ranges.all',    months: null },
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function resolveRange(range: DateRangeKey): { start: string; end: string } {
  const end = new Date()
  if (range === 'all') {
    // Generous floor — covers all WC migration data and beyond.
    return { start: '2000-01-01', end: isoDate(end) }
  }
  if (range === 'thisYear') {
    return { start: `${end.getFullYear()}-01-01`, end: isoDate(end) }
  }
  const start = new Date(end)
  start.setMonth(start.getMonth() - DATE_RANGES[range].months!)
  return { start: isoDate(start), end: isoDate(end) }
}

export default function CustomerProductsTab({ customerId, customerName }: CustomerProductsTabProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'

  // Q3b default = last 12 months
  const [range, setRange] = useState<DateRangeKey>('last12')
  const [unitFilter, setUnitFilter] = useState<string>('')
  const [rows, setRows] = useState<CustomerItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Expandable rows — keyed by `${productId ?? productName}::${unit_type}`
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [orderCache, setOrderCache] = useState<Map<string, CustomerProductOrder[]>>(new Map())
  const [loadingOrders, setLoadingOrders] = useState<Set<string>>(new Set())

  const rowKey = (r: CustomerItemSummary) => `${r.product_id ?? r.product_name}::${r.unit_type}`

  const toggleExpand = (r: CustomerItemSummary) => {
    const key = rowKey(r)
    // Decide once based on the captured closure state — this is the same
    // value that setExpanded(prev => ...) will see, so the "should I fetch?"
    // branch below stays consistent with the new expanded state.
    const willOpen = !expanded.has(key)
    setExpanded(prev => {
      const next = new Set(prev)
      if (willOpen) next.add(key)
      else next.delete(key)
      return next
    })
    // Lazy-load orders the first time this row is opened
    if (willOpen && !orderCache.has(key)) {
      const { start, end } = resolveRange(range)
      setLoadingOrders(prev => new Set(prev).add(key))
      fetchCustomerProductOrders({
        customerId,
        productId: r.product_id,
        productName: r.product_name,
        unitType: r.unit_type,
        startDate: start,
        endDate: end,
      })
        .then(orders => setOrderCache(prev => new Map(prev).set(key, orders)))
        .catch(e => setError((e as Error).message))
        .finally(() => setLoadingOrders(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        }))
    }
  }

  // Clear cache when the range changes — drill-down must match the summary's window
  useEffect(() => {
    setExpanded(new Set())
    setOrderCache(new Map())
  }, [range])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const { start, end } = resolveRange(range)
    fetchCustomerItemsSummary(customerId, start, end)
      .then(data => { if (!cancelled) setRows(data) })
      .catch(e => { if (!cancelled) setError((e as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [customerId, range])

  // Distinct unit types from the loaded rows (no extra query)
  const unitOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.unit_type) s.add(r.unit_type)
    return Array.from(s).sort()
  }, [rows])

  // Phase 6: sortable columns. Default = revenue desc (matches the RPC's
  // own ORDER BY total_revenue DESC).
  type ItemSortKey = 'product_code' | 'name' | 'unit' | 'qty' | 'orders' | 'last_ordered' | 'avg_price' | 'revenue' | 'profit'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<ItemSortKey>('revenue', 'desc')

  const filteredRows = useMemo(() => {
    const filtered = rows.filter(r => {
      if (unitFilter && r.unit_type !== unitFilter) return false
      return true
    })
    return sortBy(filtered, {
      product_code: r => r.product_code ?? '',
      name:         r => r.product_name,
      unit:         r => r.unit_type,
      qty:          r => Number(r.total_quantity) || 0,
      orders:       r => Number(r.order_count)    || 0,
      last_ordered: r => r.last_ordered ?? '',
      avg_price:    r => Number(r.avg_unit_price) || 0,
      revenue:      r => Number(r.total_revenue)  || 0,
      profit:       r => Number(r.total_profit)   || 0,
    })
  }, [rows, unitFilter, sortBy])

  // Footer SUMs — over the *filtered* set so they always match what's visible
  const totals = useMemo(() => {
    let qty = 0, orders = 0, revenue = 0, profit = 0
    for (const r of filteredRows) {
      qty     += Number(r.total_quantity) || 0
      orders  += Number(r.order_count)    || 0
      revenue += Number(r.total_revenue)  || 0
      profit  += Number(r.total_profit)   || 0
    }
    return { qty, orders, revenue, profit }
  }, [filteredRows])

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={range}
            onChange={e => setRange(e.target.value as DateRangeKey)}
            className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
          >
            {Object.entries(DATE_RANGES).map(([k, v]) => (
              <option key={k} value={k}>{t(v.labelKey)}</option>
            ))}
          </select>
        </div>
        {unitOptions.length > 1 && (
          <div className="relative">
            <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
            >
              <option value="">{t('customerDetail.products.allUnits')}</option>
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}
        {!loading && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('customerDetail.products.rowsLoaded', { count: filteredRows.length })}
          </span>
        )}
        <div className="flex-1" />
        {!loading && filteredRows.length > 0 && (
          <ExportMenu
            getAllData={async () => filteredRows}
            totalCount={filteredRows.length}
            columns={(isOwner
              ? customerItemsSummaryExportColumns
              : customerItemsSummaryExportColumns.filter(c => c.key !== 'total_profit')
            ) as never}
            filename={`producten-${customerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}`}
            pdfTitle={`Producten — ${customerName}`}
            storageKey="customer-products"
            size="sm"
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Package className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{t('customerDetail.products.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-2 py-3 w-8" />
                  <SortableTh sortKey="product_code" current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('customerDetail.products.columns.id')}</SortableTh>
                  <SortableTh sortKey="name"         current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('customerDetail.products.columns.name')}</SortableTh>
                  <SortableTh sortKey="unit"         current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('customerDetail.products.columns.unit')}</SortableTh>
                  <SortableTh sortKey="qty"          current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('customerDetail.products.columns.qty')}</SortableTh>
                  <SortableTh sortKey="orders"       current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('customerDetail.products.columns.orders')}</SortableTh>
                  <SortableTh sortKey="last_ordered" current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('customerDetail.products.columns.lastOrdered')}</SortableTh>
                  <SortableTh sortKey="avg_price"    current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('customerDetail.products.columns.avgPrice')}</SortableTh>
                  <SortableTh sortKey="revenue"      current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('customerDetail.products.columns.revenue')}</SortableTh>
                  {isOwner && (
                    <SortableTh sortKey="profit" current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('customerDetail.products.columns.profit')}</SortableTh>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRows.map((r, idx) => {
                  const key = rowKey(r)
                  const isOpen = expanded.has(key)
                  const isLoadingOrders = loadingOrders.has(key)
                  const colSpan = isOwner ? 9 : 8
                  return (
                    <Fragment key={`${r.product_id ?? 'x'}-${r.unit_type}-${idx}`}>
                      <tr
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer"
                        onClick={() => toggleExpand(r)}
                      >
                        <td className="pl-2 pr-1 py-3 text-slate-400">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-slate-900 dark:text-white">
                          {r.product_code ?? <span className="text-slate-400 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {r.product_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{r.unit_type}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                          {Number(r.total_quantity).toLocaleString('nl-NL', { maximumFractionDigits: 3 })}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300 tabular-nums">{r.order_count}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {r.last_ordered ? new Date(r.last_ordered).toLocaleDateString('nl-NL') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300 tabular-nums">{formatPrice(r.avg_unit_price)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white tabular-nums">{formatPrice(r.total_revenue)}</td>
                        {isOwner && (
                          <td className={`px-4 py-3 text-right text-sm tabular-nums ${r.total_profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                            {formatPrice(r.total_profit)}
                          </td>
                        )}
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/60 dark:bg-slate-900/40">
                          <td />
                          <td colSpan={colSpan - 1} className="px-4 py-3">
                            {isLoadingOrders ? (
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('customerDetail.products.loadingOrders')}
                              </div>
                            ) : (
                              <ExpandedOrders orders={orderCache.get(key) ?? []} t={t} />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              {/* SUM footer */}
              <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600">
                <tr>
                  <td />
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase" colSpan={3}>{t('customerDetail.products.total')}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                    {totals.qty.toLocaleString('nl-NL', { maximumFractionDigits: 3 })}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{totals.orders}</td>
                  <td />
                  <td />
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{formatPrice(totals.revenue)}</td>
                  {isOwner && (
                    <td className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${totals.profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                      {formatPrice(totals.profit)}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ExpandedOrders({
  orders,
  t,
}: {
  orders: CustomerProductOrder[]
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  if (orders.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 italic">{t('customerDetail.products.noOrdersForLine')}</p>
  }
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
      <table className="w-full min-w-[500px] text-xs">
        <thead className="bg-slate-100 dark:bg-slate-800">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.expanded.orderNumber')}</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.expanded.date')}</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.expanded.qty')}</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.expanded.unitPrice')}</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.expanded.lineTotal')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {orders.map(o => (
            <tr key={o.order_id} className="bg-white dark:bg-slate-900/30">
              <td className="px-3 py-1.5">
                <Link to={`/orders/${o.order_id}/edit`} className="font-mono text-green-700 dark:text-green-400 hover:underline">
                  {o.order_number}
                </Link>
              </td>
              <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {new Date(o.order_date).toLocaleDateString('nl-NL')}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                {Number(o.quantity).toLocaleString('nl-NL', { maximumFractionDigits: 3 })}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-300">{formatPrice(o.unit_price)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-medium text-slate-900 dark:text-white">{formatPrice(o.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
