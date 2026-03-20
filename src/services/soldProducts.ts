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

// Get sold products for a date range using server-side RPC
export async function getSoldProducts(
  startDate: string,
  endDate: string
): Promise<SoldProductsResult> {
  const { data, error } = await supabase.rpc('get_sold_products', {
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) throw error

  // Build result items from RPC data
  const items: SoldProductItem[] = (data || []).map((row: {
    product_id: string
    product_name: string
    product_sku: string
    unit_type: string
    category_name: string
    total_quantity: number
    total_revenue: number
    current_stock: number
    track_stock: boolean
    order_count: number
  }) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    product_sku: row.product_sku || null,
    unit_type: row.unit_type,
    category_name: row.category_name || null,
    total_quantity: Number(row.total_quantity),
    total_revenue: Number(row.total_revenue),
    current_stock: row.track_stock ? Number(row.current_stock) : null,
    track_stock: row.track_stock,
    order_count: Number(row.order_count),
  }))

  // Sort: tracked products with low stock first, then by quantity sold
  items.sort((a, b) => {
    // Tracked products come first
    if (a.track_stock && !b.track_stock) return -1
    if (!a.track_stock && b.track_stock) return 1

    // Among tracked products, sort by urgency (low stock relative to sales)
    if (a.track_stock && b.track_stock) {
      const aRatio = (a.current_stock || 0) / (a.total_quantity || 1)
      const bRatio = (b.current_stock || 0) / (b.total_quantity || 1)
      if (aRatio !== bRatio) return aRatio - bRatio
    }

    // Then by quantity sold (descending)
    return b.total_quantity - a.total_quantity
  })

  // Calculate summary
  const trackedItems = items.filter(i => i.track_stock)
  const lowStockItems = trackedItems.filter(i =>
    (i.current_stock || 0) < i.total_quantity * 2
  )

  return {
    items,
    summary: {
      totalProducts: items.length,
      totalQuantity: items.reduce((sum, i) => sum + i.total_quantity, 0),
      totalRevenue: items.reduce((sum, i) => sum + i.total_revenue, 0),
      trackedProducts: trackedItems.length,
      lowStockCount: lowStockItems.length,
    },
    period: {
      start: startDate,
      end: endDate,
    },
  }
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
