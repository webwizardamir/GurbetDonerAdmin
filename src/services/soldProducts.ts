import { supabase } from './supabase'

export interface SoldProductItem {
  product_id: string
  product_name: string
  product_sku: string | null
  unit_type: string
  category_name: string | null
  total_quantity: number
  total_revenue: number
  current_stock: number | null
  track_stock: boolean
  order_count: number
}

export interface SoldProductsResult {
  items: SoldProductItem[]
  summary: {
    totalProducts: number
    totalQuantity: number
    totalRevenue: number
    trackedProducts: number
    lowStockCount: number
  }
  period: {
    start: string
    end: string
  }
}

// ===========================================================================
// Phase 4: per-(product, unit, customer, city) breakdown
// ===========================================================================
// The previous flat getSoldProducts() function called the get_sold_products
// RPC; it's been replaced by getSoldProductsBreakdown() below + client-side
// aggregation in useSoldProducts. Keep SoldProductsResult around because the
// PDF template still consumes its `summary` shape.

export interface SoldProductBreakdownRow {
  product_id: string
  product_name: string
  product_sku: string | null
  unit_type: string
  category_name: string | null
  customer_id: string
  customer_name: string
  city: string
  total_quantity: number
  total_revenue: number   // cents
  order_count: number
  current_stock: number | null
  track_stock: boolean
}

/** Fetch the per-(product, unit, customer, city) breakdown. Caller filters
 *  + groups in memory — keeps the RPC contract simple and the UI flexible. */
export async function getSoldProductsBreakdown(
  startDate: string,
  endDate: string,
): Promise<SoldProductBreakdownRow[]> {
  const { data, error } = await supabase.rpc('get_sold_products_breakdown', {
    p_start_date: startDate,
    p_end_date: endDate,
  })
  if (error) throw error
  return ((data as Array<{
    product_id: string
    product_name: string
    product_sku: string | null
    unit_type: string
    category_name: string | null
    customer_id: string
    customer_name: string
    city: string
    total_quantity: number | string
    total_revenue: number | string
    order_count: number | string
    current_stock: number | string | null
    track_stock: boolean
  }>) ?? []).map(r => ({
    product_id:     r.product_id,
    product_name:   r.product_name,
    product_sku:    r.product_sku,
    unit_type:      r.unit_type,
    category_name:  r.category_name,
    customer_id:    r.customer_id,
    customer_name:  r.customer_name,
    city:           r.city,
    total_quantity: Number(r.total_quantity) || 0,
    total_revenue:  Number(r.total_revenue)  || 0,
    order_count:    Number(r.order_count)    || 0,
    current_stock:  r.track_stock ? Number(r.current_stock ?? 0) : null,
    track_stock:    r.track_stock,
  }))
}

// Get date helpers
export function getDateRangePresets() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Yesterday
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Last 7 days
  const last7Start = new Date(today)
  last7Start.setDate(last7Start.getDate() - 6)

  // This week (Monday to today)
  const thisWeekStart = new Date(today)
  const dayOfWeek = thisWeekStart.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  thisWeekStart.setDate(thisWeekStart.getDate() - daysToMonday)

  // Last week
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
  const lastWeekStart = new Date(lastWeekEnd)
  lastWeekStart.setDate(lastWeekStart.getDate() - 6)

  return {
    yesterday: { start: yesterdayStr, end: yesterdayStr, label: 'Yesterday' },
    today: { start: todayStr, end: todayStr, label: 'Today' },
    last7Days: { start: last7Start.toISOString().split('T')[0], end: todayStr, label: 'Last 7 days' },
    thisWeek: { start: thisWeekStart.toISOString().split('T')[0], end: todayStr, label: 'This week' },
    lastWeek: { start: lastWeekStart.toISOString().split('T')[0], end: lastWeekEnd.toISOString().split('T')[0], label: 'Last week' },
  }
}

// Get stock status
export function getStockStatus(item: SoldProductItem): {
  status: 'critical' | 'low' | 'ok' | 'not_tracked'
  label: string
  color: string
} {
  if (!item.track_stock) {
    return { status: 'not_tracked', label: 'Not tracked', color: 'slate' }
  }

  const stock = item.current_stock || 0
  const sold = item.total_quantity

  if (stock < sold) {
    return { status: 'critical', label: 'Critical', color: 'red' }
  }
  if (stock < sold * 2) {
    return { status: 'low', label: 'Low', color: 'amber' }
  }
  return { status: 'ok', label: 'OK', color: 'green' }
}

// Calculate suggested refill
export function getSuggestedRefill(item: SoldProductItem, daysBuffer = 3): number | null {
  if (!item.track_stock) return null

  const stock = item.current_stock || 0
  const dailySales = item.total_quantity // This is for the selected period
  const targetStock = dailySales * daysBuffer

  const needed = targetStock - stock
  return needed > 0 ? Math.ceil(needed) : 0
}
