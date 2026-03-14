// Product performance analytics: top products, ABC analysis, slow movers, category revenue

import { supabase } from './supabase'

export interface TopProduct {
  productName: string
  totalQuantity: number
  totalRevenue: number
  totalProfit: number
  unitType: string
}

export interface ProductPerformanceRow {
  productName: string
  categoryName: string
  totalRevenue: number
  totalCogs: number
  totalProfit: number
  profitMargin: number
  totalQuantity: number
  orderCount: number
  abcClass: 'A' | 'B' | 'C'
}

export interface SlowMoverRow {
  productId: string
  productName: string
  sku: string
  currentStock: number
  stockValue: number
  lastSaleDate: string | null
  daysSinceLastSale: number | null
}

export interface CategoryRevenueRow {
  categoryName: string
  totalRevenue: number
  totalCogs: number
  totalProfit: number
  profitMargin: number
}

export interface LowStockProduct {
  id: string
  name: string
  sku: string
  stockQuantity: number
  unitType: string
}

// Get top products by revenue
export async function getTopProducts(
  startDate: string,
  endDate: string,
  limit = 10
): Promise<TopProduct[]> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select(`
      product_name,
      quantity,
      total,
      cost_cents,
      unit_type,
      order:orders!inner(status, order_date)
    `)
    .in('order.status', ['completed', 'delivered'])
    .gte('order.order_date', startDate)
    .lte('order.order_date', endDate)
    .limit(10000)

  if (error) throw error

  // Group by product name
  const grouped = new Map<string, {
    quantity: number
    revenue: number
    profit: number
    unitType: string
  }>()

  for (const item of items || []) {
    const name = item.product_name
    const qty = Number(item.quantity || 0)
    const lineRevenue = item.total || 0
    const lineCost = qty * Number(item.cost_cents || 0)
    const existing = grouped.get(name) || {
      quantity: 0,
      revenue: 0,
      profit: 0,
      unitType: item.unit_type || 'piece',
    }
    grouped.set(name, {
      quantity: existing.quantity + qty,
      revenue: existing.revenue + lineRevenue,
      profit: existing.profit + (lineRevenue - lineCost),
      unitType: existing.unitType,
    })
  }

  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      productName: name,
      totalQuantity: data.quantity,
      totalRevenue: data.revenue,
      totalProfit: data.profit,
      unitType: data.unitType,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit)
}

// Get product performance with ABC classification
export async function getProductPerformance(
  startDate: string,
  endDate: string
): Promise<ProductPerformanceRow[]> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select(`
      product_name,
      product_id,
      quantity,
      total,
      cost_cents,
      order_id,
      order:orders!inner(status, order_date)
    `)
    .in('order.status', ['completed', 'delivered'])
    .gte('order.order_date', startDate)
    .lte('order.order_date', endDate)
    .limit(10000)

  if (error) throw error

  // Fetch product categories
  const productIds = [...new Set((items || []).map(i => i.product_id).filter(Boolean))]
  const categoryMap = new Map<string, string>()

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, category:categories(name)')
      .in('id', productIds)

    for (const p of products || []) {
      const catData = p.category as unknown
      const cat = Array.isArray(catData) ? catData[0] : catData
      categoryMap.set(p.id, (cat as { name: string } | null)?.name || '')
    }
  }

  // Group by product name
  const grouped = new Map<string, {
    productName: string
    categoryName: string
    revenue: number
    cogs: number
    quantity: number
    orderIds: Set<string>
  }>()

  for (const item of items || []) {
    const name = item.product_name
    const qty = Number(item.quantity || 0)
    const lineRevenue = item.total || 0
    const lineCost = qty * Number(item.cost_cents || 0)
    const existing = grouped.get(name)

    if (existing) {
      existing.revenue += lineRevenue
      existing.cogs += lineCost
      existing.quantity += qty
      existing.orderIds.add(item.order_id)
    } else {
      grouped.set(name, {
        productName: name,
        categoryName: categoryMap.get(item.product_id) || '',
        revenue: lineRevenue,
        cogs: lineCost,
        quantity: qty,
        orderIds: new Set([item.order_id]),
      })
    }
  }

  // Convert to array and sort by revenue
  const rows = Array.from(grouped.values())
    .map(g => ({
      productName: g.productName,
      categoryName: g.categoryName,
      totalRevenue: g.revenue,
      totalCogs: g.cogs,
      totalProfit: g.revenue - g.cogs,
      profitMargin: g.revenue > 0 ? ((g.revenue - g.cogs) / g.revenue) * 100 : 0,
      totalQuantity: g.quantity,
      orderCount: g.orderIds.size,
      abcClass: 'C' as 'A' | 'B' | 'C',
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Compute ABC classification
  const totalRevenue = rows.reduce((sum, r) => sum + r.totalRevenue, 0)
  let cumulative = 0
  for (const row of rows) {
    cumulative += row.totalRevenue
    const share = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 100
    if (share <= 80) row.abcClass = 'A'
    else if (share <= 95) row.abcClass = 'B'
    else row.abcClass = 'C'
  }

  return rows
}

// Get slow-moving products (no sales in N days)
export async function getSlowMovers(daysSinceLastSale = 60): Promise<SlowMoverRow[]> {
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, cost_cents')
    .eq('track_stock', true)
    .gt('stock_quantity', 0)

  if (prodError) throw prodError
  if (!products || products.length === 0) return []

  const productIds = products.map(p => p.id)
  const { data: salesData, error: salesError } = await supabase
    .from('order_items')
    .select(`
      product_id,
      order:orders!inner(order_date, status)
    `)
    .in('product_id', productIds)
    .in('order.status', ['completed', 'delivered'])
    .limit(10000)

  if (salesError) throw salesError

  // Find max order_date per product
  const lastSaleMap = new Map<string, string>()
  for (const item of salesData || []) {
    const orderData = item.order as unknown
    const order = Array.isArray(orderData) ? orderData[0] : orderData
    if (!order) continue
    const date = (order as { order_date: string }).order_date
    const existing = lastSaleMap.get(item.product_id)
    if (!existing || date > existing) {
      lastSaleMap.set(item.product_id, date)
    }
  }

  const today = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysSinceLastSale)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  return products
    .filter(p => {
      const lastSale = lastSaleMap.get(p.id)
      return !lastSale || lastSale <= cutoffStr
    })
    .map(p => {
      const lastSale = lastSaleMap.get(p.id) || null
      const daysSince = lastSale
        ? Math.floor((today.getTime() - new Date(lastSale).getTime()) / 86400000)
        : null
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku || '',
        currentStock: p.stock_quantity || 0,
        stockValue: (p.stock_quantity || 0) * (p.cost_cents || 0),
        lastSaleDate: lastSale,
        daysSinceLastSale: daysSince,
      }
    })
    .sort((a, b) => (b.daysSinceLastSale || 9999) - (a.daysSinceLastSale || 9999))
}

// Get revenue breakdown by category
export async function getRevenueByCategoryFlat(
  startDate: string,
  endDate: string
): Promise<CategoryRevenueRow[]> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      quantity,
      total,
      cost_cents,
      order:orders!inner(status, order_date)
    `)
    .in('order.status', ['completed', 'delivered'])
    .gte('order.order_date', startDate)
    .lte('order.order_date', endDate)
    .limit(10000)

  if (error) throw error

  // Fetch product categories
  const productIds = [...new Set((items || []).map(i => i.product_id).filter(Boolean))]
  const categoryMap = new Map<string, string>()

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, category:categories(name)')
      .in('id', productIds)

    for (const p of products || []) {
      const catData = p.category as unknown
      const cat = Array.isArray(catData) ? catData[0] : catData
      categoryMap.set(p.id, (cat as { name: string } | null)?.name || '')
    }
  }

  // Group by category
  const grouped = new Map<string, { revenue: number; cogs: number }>()
  for (const item of items || []) {
    const cat = categoryMap.get(item.product_id) || ''
    const qty = Number(item.quantity || 0)
    const lineRevenue = item.total || 0
    const lineCost = qty * Number(item.cost_cents || 0)
    const existing = grouped.get(cat) || { revenue: 0, cogs: 0 }
    grouped.set(cat, {
      revenue: existing.revenue + lineRevenue,
      cogs: existing.cogs + lineCost,
    })
  }

  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      categoryName: name || '',
      totalRevenue: data.revenue,
      totalCogs: data.cogs,
      totalProfit: data.revenue - data.cogs,
      profitMargin: data.revenue > 0 ? ((data.revenue - data.cogs) / data.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// Get low stock products
export async function getLowStockProducts(threshold = 30): Promise<LowStockProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, unit_type, track_stock')
    .eq('track_stock', true)
    .lt('stock_quantity', threshold)
    .order('stock_quantity', { ascending: true })
    .limit(5)

  if (error) throw error

  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku || '',
    stockQuantity: p.stock_quantity || 0,
    unitType: p.unit_type || 'piece',
  }))
}
