import { supabase } from './supabase'
import { ymdInAms, addDays, mondayOf, firstOfMonth, lastOfMonth } from '../utils/dateRange'

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
  customer_type: string | null   // admin-only classification (migration 00091/00092)
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
    customer_type: string | null
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
    customer_type:  r.customer_type ?? null,
    city:           r.city,
    total_quantity: Number(r.total_quantity) || 0,
    total_revenue:  Number(r.total_revenue)  || 0,
    order_count:    Number(r.order_count)    || 0,
    current_stock:  r.track_stock ? Number(r.current_stock ?? 0) : null,
    track_stock:    r.track_stock,
  }))
}

/**
 * Date-range presets for the Sold Products page, ordered shortest to longest.
 *
 * Returns bounds only — NO label. Labels are i18n keys resolved in
 * `useSoldProducts` (`soldProducts.ranges.*`) so they follow a language switch
 * and stop leaking hardcoded English into the clipboard export, the route panel
 * and the day-close modal.
 *
 * Dates come from `ymdInAms`, not `toISOString()`: see utils/dateRange.ts for
 * why the old code returned yesterday's date shortly after midnight.
 *
 * CALENDAR periods only — deliberately no rolling "laatste 7/30 dagen". Having
 * both read as duplicated ("vorige week" next to "laatste 7 dagen", "vorige
 * maand" next to "laatste 30 dagen") even though the spans differ, and for a
 * day-close / restocking workflow the calendar week and month are what get
 * reviewed. Re-adding a rolling window is a two-line change here plus a key in
 * soldProducts.ranges and an entry in DATE_RANGE_KEYS.
 */
export function getDateRangePresets(): Record<string, { start: string; end: string }> {
  const today = ymdInAms()
  const thisWeekStart = mondayOf(today)
  const lastWeekEnd = addDays(thisWeekStart, -1)
  const lastMonthDay = addDays(firstOfMonth(today), -1)

  return {
    today:      { start: today,                      end: today },
    yesterday:  { start: addDays(today, -1),         end: addDays(today, -1) },
    thisWeek:   { start: thisWeekStart,              end: today },
    lastWeek:   { start: addDays(lastWeekEnd, -6),   end: lastWeekEnd },
    thisMonth:  { start: firstOfMonth(today),        end: today },
    lastMonth:  { start: firstOfMonth(lastMonthDay), end: lastOfMonth(lastMonthDay) },
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
