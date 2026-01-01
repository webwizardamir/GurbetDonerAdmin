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

// Get sold products for a date range
export async function getSoldProducts(
  startDate: string,
  endDate: string
): Promise<SoldProductsResult> {
  // Fetch order items from all orders (except cancelled/refunded) in the date range
  // This helps track what was ordered for refill planning regardless of payment status
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      product_id,
      product_name,
      product_sku,
      unit_type,
      quantity,
      total,
      order:orders!inner(id, status, order_date)
    `)
    .not('order.status', 'in', '("cancelled","refunded")')
    .gte('order.order_date', startDate)
    .lte('order.order_date', endDate)

  if (itemsError) throw itemsError

  // Fetch products for current stock and tracking info
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id,
      stock_quantity,
      track_stock,
      category:categories(name)
    `)

  if (productsError) throw productsError

  // Create product lookup map
  const productMap = new Map<string, {
    stock_quantity: number
    track_stock: boolean
    category_name: string | null
  }>()

  for (const product of products || []) {
    const categoryData = product.category as unknown
    const category = Array.isArray(categoryData) ? categoryData[0] : categoryData
    productMap.set(product.id, {
      stock_quantity: product.stock_quantity || 0,
      track_stock: product.track_stock ?? false,
      category_name: category?.name || null,
    })
  }

  // Aggregate by product
  const aggregated = new Map<string, {
    product_id: string
    product_name: string
    product_sku: string | null
    unit_type: string
    total_quantity: number
    total_revenue: number
    order_ids: Set<string>
  }>()

  for (const item of orderItems || []) {
    const existing = aggregated.get(item.product_id) || {
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      unit_type: item.unit_type || 'piece',
      total_quantity: 0,
      total_revenue: 0,
      order_ids: new Set<string>(),
    }

    const orderData = item.order as unknown as { id: string }
    existing.total_quantity += Number(item.quantity) || 0
    existing.total_revenue += Number(item.total) || 0
    existing.order_ids.add(orderData.id)

    aggregated.set(item.product_id, existing)
  }

  // Build result items with stock info
  const items: SoldProductItem[] = Array.from(aggregated.values()).map(agg => {
    const productInfo = productMap.get(agg.product_id)
    return {
      product_id: agg.product_id,
      product_name: agg.product_name,
      product_sku: agg.product_sku,
      unit_type: agg.unit_type,
      category_name: productInfo?.category_name || null,
      total_quantity: agg.total_quantity,
      total_revenue: agg.total_revenue,
      current_stock: productInfo?.track_stock ? productInfo.stock_quantity : null,
      track_stock: productInfo?.track_stock ?? false,
      order_count: agg.order_ids.size,
    }
  })

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
