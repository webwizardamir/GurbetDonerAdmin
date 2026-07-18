import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getSoldProductsBreakdown,
  getDateRangePresets,
  type SoldProductBreakdownRow,
  type SoldProductItem,
  type SoldProductsResult,
} from '../services/soldProducts'
import { CUSTOMER_TYPE_LABELS } from '../constants/customerType'

export type DateRangeKey = 'yesterday' | 'today' | 'last7Days' | 'thisWeek' | 'lastWeek' | 'custom'

interface DateRange {
  start: string
  end: string
  label: string
}

export function useSoldProducts() {
  const presets = getDateRangePresets()

  const [dateRange, setDateRangeState] = useState<DateRange>(presets.today)
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('today')
  const [breakdown, setBreakdown] = useState<SoldProductBreakdownRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state (Phase 4)
  // City supports multi-select (empty array = all cities).
  const [cityFilter, setCityFilter] = useState<string[]>([])
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [unitFilter, setUnitFilter] = useState<string>('')
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('')
  const [groupBy, setGroupBy] = useState<'none' | 'city' | 'customer' | 'customerType'>('none')

  const setDateRange = useCallback((
    key: DateRangeKey,
    customRange?: { start: string; end: string },
  ) => {
    const next: DateRange = (key === 'custom' && customRange)
      ? { ...customRange, label: 'Custom' }
      : (getDateRangePresets()[key as keyof typeof presets] || getDateRangePresets().yesterday)
    setDateRangeState(next)
    setDateRangeKey(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await getSoldProductsBreakdown(dateRange.start, dateRange.end)
      setBreakdown(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sold products')
    } finally {
      setLoading(false)
    }
  }, [dateRange.start, dateRange.end])

  // Depend on fetchData itself so any future change to its deps stays in sync.
  useEffect(() => { void fetchData() }, [fetchData])

  // Distinct option lists for filter dropdowns — derived from the loaded breakdown
  const cityOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of breakdown) if (r.city) s.add(r.city)
    return Array.from(s).sort()
  }, [breakdown])

  const customerOptions = useMemo(() => {
    const m = new Map<string, string>()   // id → name
    for (const r of breakdown) m.set(r.customer_id, r.customer_name)
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [breakdown])

  const categoryOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of breakdown) if (r.category_name) s.add(r.category_name)
    return Array.from(s).sort()
  }, [breakdown])

  const unitOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of breakdown) if (r.unit_type) s.add(r.unit_type)
    return Array.from(s).sort()
  }, [breakdown])

  // Filtered breakdown — drives both the flat table (aggregated up) and the
  // groupings in subsequent steps.
  const filteredBreakdown = useMemo(() => {
    const citySet = cityFilter.length ? new Set(cityFilter) : null
    return breakdown.filter(r => {
      if (citySet            && !(r.city && citySet.has(r.city)))       return false
      if (customerFilter     && r.customer_id   !== customerFilter)     return false
      if (categoryFilter     && r.category_name !== categoryFilter)     return false
      if (unitFilter         && r.unit_type     !== unitFilter)         return false
      if (customerTypeFilter && r.customer_type !== customerTypeFilter) return false
      return true
    })
  }, [breakdown, cityFilter, customerFilter, categoryFilter, unitFilter, customerTypeFilter])

  // Aggregate to one row per (product_id, unit_type) — the legacy shape the
  // existing flat table expects. Stock/track flags are constant per product
  // so we just take the first row's value.
  const items: SoldProductItem[] = useMemo(() => {
    const acc = new Map<string, SoldProductItem & { _orderIds: Set<string> }>()
    for (const r of filteredBreakdown) {
      const key = `${r.product_id}::${r.unit_type}`
      let row = acc.get(key)
      if (!row) {
        row = {
          product_id: r.product_id,
          product_name: r.product_name,
          product_sku: r.product_sku,
          unit_type: r.unit_type,
          category_name: r.category_name,
          total_quantity: 0,
          total_revenue: 0,
          current_stock: r.current_stock,
          track_stock: r.track_stock,
          order_count: 0,
          _orderIds: new Set(),
        }
        acc.set(key, row)
      }
      row.total_quantity += r.total_quantity
      row.total_revenue  += r.total_revenue
      // order_count from the RPC is per-(product, customer, city); summing
      // it across breakdown rows can double-count if one order has items
      // for the same product in multiple cities (impossible per the city
      // resolution) so summing is safe in practice. Keep it as a sum for now.
      row.order_count    += r.order_count
    }
    const arr = Array.from(acc.values()).map(({ _orderIds: _o, ...rest }) => rest)
    // Sort: tracked low-stock first, then by qty desc
    arr.sort((a, b) => {
      if (a.track_stock && !b.track_stock) return -1
      if (!a.track_stock && b.track_stock) return 1
      if (a.track_stock && b.track_stock) {
        const aRatio = (a.current_stock || 0) / (a.total_quantity || 1)
        const bRatio = (b.current_stock || 0) / (b.total_quantity || 1)
        if (aRatio !== bRatio) return aRatio - bRatio
      }
      return b.total_quantity - a.total_quantity
    })
    return arr
  }, [filteredBreakdown])

  // Grouped derivation — for driver-routing view (Group by City) and
  // per-customer breakdown (Group by Customer). Each group contains
  // its own per-(product, unit) aggregated items + totals.
  interface SoldProductsGroup {
    key: string
    name: string
    items: SoldProductItem[]
    totalQuantity: number
    totalRevenue: number
    orderCount: number     // distinct order count in this group, approximate
  }

  const groups: SoldProductsGroup[] = useMemo(() => {
    if (groupBy === 'none') return []

    // Bucket breakdown rows by the chosen dimension
    const buckets = new Map<string, { name: string; rows: SoldProductBreakdownRow[] }>()
    for (const r of filteredBreakdown) {
      const ct = r.customer_type as keyof typeof CUSTOMER_TYPE_LABELS | null
      const key  = groupBy === 'city' ? (r.city || '__none__')
                 : groupBy === 'customerType' ? (r.customer_type || '__none__')
                 : r.customer_id
      const name = groupBy === 'city' ? (r.city || '—')
                 : groupBy === 'customerType' ? (ct && CUSTOMER_TYPE_LABELS[ct] ? CUSTOMER_TYPE_LABELS[ct] : 'Geen type')
                 : r.customer_name
      let b = buckets.get(key)
      if (!b) { b = { name, rows: [] }; buckets.set(key, b) }
      b.rows.push(r)
    }

    // Aggregate each bucket's rows to (product_id, unit_type) items
    const out: SoldProductsGroup[] = []
    for (const [key, { name, rows }] of buckets) {
      const acc = new Map<string, SoldProductItem>()
      for (const r of rows) {
        const k = `${r.product_id}::${r.unit_type}`
        let row = acc.get(k)
        if (!row) {
          row = {
            product_id: r.product_id,
            product_name: r.product_name,
            product_sku: r.product_sku,
            unit_type: r.unit_type,
            category_name: r.category_name,
            total_quantity: 0,
            total_revenue: 0,
            current_stock: r.current_stock,
            track_stock: r.track_stock,
            order_count: 0,
          }
          acc.set(k, row)
        }
        row.total_quantity += r.total_quantity
        row.total_revenue  += r.total_revenue
        row.order_count    += r.order_count
      }
      const items = Array.from(acc.values()).sort((a, b) => b.total_revenue - a.total_revenue)
      out.push({
        key,
        name,
        items,
        totalQuantity: items.reduce((s, i) => s + i.total_quantity, 0),
        totalRevenue:  items.reduce((s, i) => s + i.total_revenue,  0),
        orderCount:    items.reduce((s, i) => s + i.order_count,    0),
      })
    }

    out.sort((a, b) => b.totalRevenue - a.totalRevenue)
    return out
  }, [filteredBreakdown, groupBy])

  const summary: SoldProductsResult['summary'] = useMemo(() => {
    const tracked = items.filter(i => i.track_stock)
    const lowStock = tracked.filter(i => (i.current_stock || 0) < i.total_quantity * 2)
    return {
      totalProducts: items.length,
      totalQuantity: items.reduce((s, i) => s + i.total_quantity, 0),
      totalRevenue:  items.reduce((s, i) => s + i.total_revenue,  0),
      trackedProducts: tracked.length,
      lowStockCount: lowStock.length,
    }
  }, [items])

  return {
    loading,
    error,
    items,
    summary,
    dateRange,
    dateRangeKey,
    setDateRange,
    refresh: fetchData,
    dateRanges: presets,
    // Phase 4 additions
    breakdown,
    filteredBreakdown,
    cityFilter,        setCityFilter,
    customerFilter,    setCustomerFilter,
    categoryFilter,    setCategoryFilter,
    unitFilter,        setUnitFilter,
    customerTypeFilter, setCustomerTypeFilter,
    cityOptions,
    customerOptions,
    categoryOptions,
    unitOptions,
    groupBy,           setGroupBy,
    groups,
  }
}
