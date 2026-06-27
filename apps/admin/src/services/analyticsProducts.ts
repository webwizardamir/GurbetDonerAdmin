// Product performance analytics: top products, ABC analysis, slow movers, category revenue
// Uses server-side RPC functions to avoid PostgREST 1000-row limit

import { supabase } from './supabase'
import { statusArg, entityArg, type AnalyticsFilters } from './analyticsHelpers'

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

// Get top products by revenue using server-side RPC
export async function getTopProducts(
  startDate: string,
  endDate: string,
  limit = 10,
  statuses?: string[] | null,
  filters?: AnalyticsFilters | null
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc('get_top_products', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit,
    ...statusArg(statuses),
    ...entityArg(filters),
  })

  if (error) throw error

  return (data || []).map((row: {
    product_name: string
    total_quantity: number
    total_revenue: number
    total_profit: number
    unit_type: string
  }) => ({
    productName: row.product_name,
    totalQuantity: Number(row.total_quantity),
    totalRevenue: Number(row.total_revenue),
    totalProfit: Number(row.total_profit),
    unitType: row.unit_type,
  }))
}

// Get product performance with ABC classification using server-side RPC
export async function getProductPerformance(
  startDate: string,
  endDate: string,
  statuses?: string[] | null,
  filters?: AnalyticsFilters | null
): Promise<ProductPerformanceRow[]> {
  const { data, error } = await supabase.rpc('get_product_performance', {
    p_start_date: startDate,
    p_end_date: endDate,
    ...statusArg(statuses),
    ...entityArg(filters),
  })

  if (error) throw error

  const rows: ProductPerformanceRow[] = (data || []).map((row: {
    product_name: string
    category_name: string
    total_revenue: number
    total_cogs: number
    total_profit: number
    profit_margin: number
    total_quantity: number
    order_count: number
  }) => ({
    productName: row.product_name,
    categoryName: row.category_name,
    totalRevenue: Number(row.total_revenue),
    totalCogs: Number(row.total_cogs),
    totalProfit: Number(row.total_profit),
    profitMargin: Number(row.profit_margin),
    totalQuantity: Number(row.total_quantity),
    orderCount: Number(row.order_count),
    abcClass: 'C' as 'A' | 'B' | 'C',
  }))

  // Compute ABC classification (already sorted by revenue DESC from RPC)
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

// Get slow-moving products using server-side RPC
export async function getSlowMovers(daysSinceLastSale = 60): Promise<SlowMoverRow[]> {
  const { data, error } = await supabase.rpc('get_slow_movers', {
    p_days_since_last_sale: daysSinceLastSale,
  })

  if (error) throw error

  return (data || []).map((row: {
    product_id: string
    product_name: string
    sku: string
    current_stock: number
    stock_value: number
    last_sale_date: string | null
    days_since_last_sale: number | null
  }) => ({
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    currentStock: Number(row.current_stock),
    stockValue: Number(row.stock_value),
    lastSaleDate: row.last_sale_date,
    daysSinceLastSale: row.days_since_last_sale != null ? Number(row.days_since_last_sale) : null,
  }))
}

// Get revenue breakdown by category using server-side RPC
export async function getRevenueByCategoryFlat(
  startDate: string,
  endDate: string,
  statuses?: string[] | null
): Promise<CategoryRevenueRow[]> {
  const { data, error } = await supabase.rpc('get_revenue_by_category', {
    p_start_date: startDate,
    p_end_date: endDate,
    ...statusArg(statuses),
  })

  if (error) throw error

  return (data || []).map((row: {
    category_name: string
    total_revenue: number
    total_cogs: number
    total_profit: number
    profit_margin: number
  }) => ({
    categoryName: row.category_name,
    totalRevenue: Number(row.total_revenue),
    totalCogs: Number(row.total_cogs),
    totalProfit: Number(row.total_profit),
    profitMargin: Number(row.profit_margin),
  }))
}

// Get low stock products (small result set, no RPC needed)
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
