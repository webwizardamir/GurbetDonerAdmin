// Analytics helper utilities: chunked queries, shared cost calculations, date range helpers

import { supabase } from './supabase'
import { expandStatusFilter } from '../constants/orderStatus'

/**
 * Build the optional `p_statuses` argument for the analytics RPCs.
 * An empty/absent selection means "use the RPC default" (every order except
 * cancelled/refunded/draft). We OMIT the key entirely in that case (rather than
 * sending null) so the call still resolves against an older DB that predates
 * the p_statuses parameter — keeping default analytics working even if the
 * migration hasn't been applied yet. Only an explicit selection requires it.
 *
 * 🚨 The selection is EXPANDED through `expandStatusFilter` first, exactly as
 * `fetchOrders`/`fetchOrderCount` do it. Every RPC matches with
 * `status::text = ANY(p_statuses)` against the RAW stored value, and the live DB
 * default for a new order is the legacy `pending`, not `pending_payment` — the
 * two render the same label ("Wacht op betaling") and the filter only offers the
 * canonical one. Without the expansion, picking it asked for `pending_payment`
 * alone and matched **4 of 248** waiting orders on Melek (2 of 28 on Gurbet), so
 * their revenue and profit looked like they had vanished. The unfiltered totals
 * were always right — only the isolate-one-status view was broken.
 */
export function statusArg(statuses?: string[] | null): { p_statuses?: string[] } {
  if (!statuses || statuses.length === 0) return {}
  return { p_statuses: expandStatusFilter(statuses) }
}

/**
 * Optional entity filters for the analytics RPCs. Each dimension is independent
 * and nullable — an unset dimension means "all". Order-grained RPCs read
 * customerId/paymentMethod; item-grained RPCs additionally read productId/unitType.
 */
export interface AnalyticsFilters {
  customerId?: string | null
  productId?: string | null
  paymentMethod?: string | null   // 'cash' | 'bank'
  unitType?: string | null        // 'kg' | 'piece' | 'zak' | 'doos'
  customerType?: string | null    // 'horeca' | 'supermarkt' | 'other' (admin-only)
}

/**
 * Build the optional entity-filter args for an analytics RPC. Like `statusArg`,
 * we OMIT keys that aren't set so the call still resolves against a DB that
 * predates these params (migration 00069). `pass` limits which keys are emitted
 * so order-grained RPCs don't get product/unit args they don't accept.
 */
export function entityArg(
  f?: AnalyticsFilters | null,
  pass: Array<keyof AnalyticsFilters> = ['customerId', 'productId', 'paymentMethod', 'unitType', 'customerType'],
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!f) return out
  const map: Record<keyof AnalyticsFilters, string> = {
    customerId: 'p_customer_id',
    productId: 'p_product_id',
    paymentMethod: 'p_payment_method',
    unitType: 'p_unit_type',
    customerType: 'p_customer_type',
  }
  for (const key of pass) {
    const v = f[key]
    if (v) out[map[key]] = v
  }
  return out
}

// Stable string key for an AnalyticsFilters object — for hook effect deps.
export function filtersKey(f?: AnalyticsFilters | null): string {
  if (!f) return ''
  return `${f.customerId ?? ''}|${f.productId ?? ''}|${f.paymentMethod ?? ''}|${f.unitType ?? ''}|${f.customerType ?? ''}`
}

/**
 * Process an array in chunks to avoid Supabase `.in()` limits.
 * Supabase/PostgREST can struggle with very large IN lists,
 * so we cap each batch at 500 IDs.
 */
export async function fetchOrderItemsCostChunked(
  orderIds: string[]
): Promise<Map<string, number>> {
  const costByOrder = new Map<string, number>()
  if (orderIds.length === 0) return costByOrder

  const CHUNK_SIZE = 500
  for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
    const chunk = orderIds.slice(i, i + CHUNK_SIZE)
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity, cost_cents')
      .in('order_id', chunk)

    for (const item of itemsData || []) {
      const existing = costByOrder.get(item.order_id) || 0
      costByOrder.set(
        item.order_id,
        existing + Number(item.quantity) * Number(item.cost_cents || 0)
      )
    }
  }
  return costByOrder
}

/**
 * Calculate total cost from order items (sum of qty * cost_cents).
 * Uses chunked fetching for safety.
 */
export async function getOrderItemsCost(orderIds: string[]): Promise<number> {
  const costMap = await fetchOrderItemsCostChunked(orderIds)
  let total = 0
  for (const cost of costMap.values()) {
    total += cost
  }
  return total
}

/**
 * Calculate previous period date range given a current period.
 * Returns a period of the same duration immediately before the start date.
 */
export function getPreviousPeriod(startDate: string, endDate: string) {
  const startMs = new Date(startDate).getTime()
  const endMs = new Date(endDate).getTime()
  const duration = endMs - startMs
  const prevStart = new Date(startMs - duration - 86400000).toISOString().split('T')[0]
  const prevEnd = new Date(startMs - 86400000).toISOString().split('T')[0]
  return { prevStart, prevEnd }
}

// Get date range helpers
export function getDateRanges() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Last 7 days (7 days before today + today = 8 calendar days, matching WooCommerce)
  const last7Start = new Date(today)
  last7Start.setDate(last7Start.getDate() - 7)

  // Last 30 days
  const last30Start = new Date(today)
  last30Start.setDate(last30Start.getDate() - 29)

  // Last 90 days
  const last90Start = new Date(today)
  last90Start.setDate(last90Start.getDate() - 89)

  // This month
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  // Last month
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)

  // This year
  const thisYearStart = new Date(today.getFullYear(), 0, 1)

  // Helper to format date as YYYY-MM-DD in local timezone (not UTC)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return {
    today: { start: todayStr, end: todayStr, label: 'Today' },
    last7Days: { start: fmt(last7Start), end: todayStr, label: 'Last 7 days' },
    last30Days: { start: fmt(last30Start), end: todayStr, label: 'Last 30 days' },
    last90Days: { start: fmt(last90Start), end: todayStr, label: 'Last 90 days' },
    thisMonth: { start: fmt(thisMonthStart), end: todayStr, label: 'This month' },
    lastMonth: { start: fmt(lastMonthStart), end: fmt(lastMonthEnd), label: 'Last month' },
    thisYear: { start: fmt(thisYearStart), end: todayStr, label: 'This year' },
  }
}
