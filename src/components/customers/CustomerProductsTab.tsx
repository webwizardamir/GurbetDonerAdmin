import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Package, Calendar, AlertCircle } from 'lucide-react'
import {
  fetchCustomerItemsSummary,
  type CustomerItemSummary,
} from '../../services/customers'
import { useAuth } from '../../context/AuthContext'
import { formatPrice } from '../../utils/format'

interface CustomerProductsTabProps {
  customerId: string
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

export default function CustomerProductsTab({ customerId }: CustomerProductsTabProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'

  // Q3b default = last 12 months
  const [range, setRange] = useState<DateRangeKey>('last12')
  const [rows, setRows] = useState<CustomerItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Footer SUMs
  const totals = useMemo(() => {
    let qty = 0, orders = 0, revenue = 0, profit = 0
    for (const r of rows) {
      qty     += Number(r.total_quantity) || 0
      orders  += Number(r.order_count)    || 0
      revenue += Number(r.total_revenue)  || 0
      profit  += Number(r.total_profit)   || 0
    }
    return { qty, orders, revenue, profit }
  }, [rows])

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
        {!loading && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('customerDetail.products.rowsLoaded', { count: rows.length })}
          </span>
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
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Package className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{t('customerDetail.products.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.id')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.unit')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.qty')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.orders')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.lastOrdered')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.avgPrice')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.revenue')}</th>
                  {isOwner && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('customerDetail.products.columns.profit')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {rows.map((r, idx) => (
                  <tr key={`${r.product_id ?? 'x'}-${r.unit_type}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 font-mono text-sm text-slate-900 dark:text-white">
                      {r.product_code ?? <span className="text-slate-400 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {r.product_name}
                      {r.category_name && (
                        <div className="text-xs text-slate-500 dark:text-slate-500">{r.category_name}</div>
                      )}
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
                ))}
              </tbody>
              {/* SUM footer */}
              <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600">
                <tr>
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
