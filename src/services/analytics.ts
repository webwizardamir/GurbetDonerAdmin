import { supabase } from './supabase'
import type { PaymentMethod } from '../types'

// Types for analytics data
export interface PaymentMethodBreakdown {
  method: PaymentMethod
  count: number
  revenue: number
}
export interface RevenueDataPoint {
  date: string
  revenue: number
  profit: number
  orderCount: number
}

export interface OrderStatusCount {
  status: string
  count: number
  revenue: number
}

export interface TopCustomer {
  id: string
  companyName: string
  totalRevenue: number
  totalProfit: number
  orderCount: number
}

export interface TopProduct {
  productName: string
  totalQuantity: number
  totalRevenue: number
  totalProfit: number
  unitType: string
}

export interface KPIData {
  totalRevenue: number
  totalOrders: number
  totalItems: number
  averageOrderValue: number
  totalProfit: number
  profitMargin: number // percentage
  // Comparison with previous period
  revenueGrowth: number
  ordersGrowth: number
  profitGrowth: number
}

// Get revenue data grouped by day
export async function getRevenueByDay(
  startDate: string,
  endDate: string
): Promise<RevenueDataPoint[]> {
  // Fetch completed orders within date range
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_date, total')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .order('order_date')

  if (error) throw error

  // Fetch order items for profit calculation
  const orderIds = (orders || []).map(o => o.id)
  let itemsByOrder = new Map<string, { cost: number }>()

  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity, cost_cents')
      .in('order_id', orderIds)

    for (const item of itemsData || []) {
      const existing = itemsByOrder.get(item.order_id) || { cost: 0 }
      itemsByOrder.set(item.order_id, {
        cost: existing.cost + (Number(item.quantity) * Number(item.cost_cents || 0)),
      })
    }
  }

  // Group by date
  const grouped = new Map<string, { revenue: number; profit: number; count: number }>()

  // Initialize all dates in range
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    grouped.set(dateStr, { revenue: 0, profit: 0, count: 0 })
    current.setDate(current.getDate() + 1)
  }

  // Aggregate orders
  for (const order of orders || []) {
    const dateStr = order.order_date
    const existing = grouped.get(dateStr) || { revenue: 0, profit: 0, count: 0 }
    const orderRevenue = order.total || 0
    const orderCost = itemsByOrder.get(order.id)?.cost || 0
    grouped.set(dateStr, {
      revenue: existing.revenue + orderRevenue,
      profit: existing.profit + (orderRevenue - orderCost),
      count: existing.count + 1,
    })
  }

  // Convert to array
  return Array.from(grouped.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    profit: data.profit,
    orderCount: data.count,
  }))
}

// Get order counts by status
export async function getOrdersByStatus(
  startDate: string,
  endDate: string
): Promise<OrderStatusCount[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, total')
    .gte('order_date', startDate)
    .lte('order_date', endDate)

  if (error) throw error

  // Group by status
  const grouped = new Map<string, { count: number; revenue: number }>()

  for (const order of orders || []) {
    const status = order.status || 'unknown'
    const existing = grouped.get(status) || { count: 0, revenue: 0 }
    grouped.set(status, {
      count: existing.count + 1,
      revenue: existing.revenue + (order.total || 0),
    })
  }

  return Array.from(grouped.entries())
    .map(([status, data]) => ({
      status,
      count: data.count,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.count - a.count)
}

// Get revenue breakdown by payment method
export async function getRevenueByPaymentMethod(
  startDate: string,
  endDate: string
): Promise<PaymentMethodBreakdown[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('payment_method, total')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)

  if (error) throw error

  // Group by payment method
  const grouped = new Map<PaymentMethod, { count: number; revenue: number }>()

  for (const order of orders || []) {
    const method = (order.payment_method || 'none') as PaymentMethod
    const existing = grouped.get(method) || { count: 0, revenue: 0 }
    grouped.set(method, {
      count: existing.count + 1,
      revenue: existing.revenue + (order.total || 0),
    })
  }

  return Array.from(grouped.entries())
    .map(([method, data]) => ({
      method,
      count: data.count,
      revenue: data.revenue,
    }))
    .filter(item => item.method !== 'none') // Only show cash and bank
    .sort((a, b) => b.revenue - a.revenue)
}

// Get top customers by revenue
export async function getTopCustomers(
  startDate: string,
  endDate: string,
  limit = 10
): Promise<TopCustomer[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, total,
      customer:customers(id, company_name)
    `)
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)

  if (error) throw error

  // Fetch order items for profit calculation
  const orderIds = (orders || []).map(o => o.id)
  const costByOrder = new Map<string, number>()

  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity, cost_cents')
      .in('order_id', orderIds)

    for (const item of itemsData || []) {
      const existing = costByOrder.get(item.order_id) || 0
      costByOrder.set(item.order_id, existing + (Number(item.quantity) * Number(item.cost_cents || 0)))
    }
  }

  // Group by customer
  const grouped = new Map<string, {
    id: string
    companyName: string
    revenue: number
    profit: number
    count: number
  }>()

  for (const order of orders || []) {
    // Supabase returns an array for nested relations - take first element
    const customerData = order.customer as unknown
    const customer = Array.isArray(customerData) ? customerData[0] : customerData
    if (!customer) continue

    const orderRevenue = order.total || 0
    const orderCost = costByOrder.get(order.id) || 0
    const existing = grouped.get(customer.id) || {
      id: customer.id,
      companyName: customer.company_name,
      revenue: 0,
      profit: 0,
      count: 0,
    }
    grouped.set(customer.id, {
      ...existing,
      revenue: existing.revenue + orderRevenue,
      profit: existing.profit + (orderRevenue - orderCost),
      count: existing.count + 1,
    })
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map(c => ({
      id: c.id,
      companyName: c.companyName,
      totalRevenue: c.revenue,
      totalProfit: c.profit,
      orderCount: c.count,
    }))
}

// Get top products by revenue
export async function getTopProducts(
  startDate: string,
  endDate: string,
  limit = 10
): Promise<TopProduct[]> {
  // Note: order_items stores line total in 'total' column, not 'line_total'
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

// Helper: calculate total cost from order items
async function getOrderItemsCost(orderIds: string[]): Promise<number> {
  if (orderIds.length === 0) return 0

  const { data } = await supabase
    .from('order_items')
    .select('quantity, cost_cents')
    .in('order_id', orderIds)

  return (data || []).reduce((sum, item) =>
    sum + (Number(item.quantity) * Number(item.cost_cents || 0)), 0)
}

// Get KPIs with period comparison
export async function getKPIs(
  startDate: string,
  endDate: string
): Promise<KPIData> {
  // Current period
  const { data: currentOrders, error: currentError } = await supabase
    .from('orders')
    .select('id, total')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)

  if (currentError) throw currentError

  // Current period items count
  const { data: currentItems, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      quantity,
      order:orders!inner(status, order_date)
    `)
    .in('order.status', ['completed', 'delivered'])
    .gte('order.order_date', startDate)
    .lte('order.order_date', endDate)

  if (itemsError) throw itemsError

  // Calculate previous period (same duration before start date)
  const startMs = new Date(startDate).getTime()
  const endMs = new Date(endDate).getTime()
  const duration = endMs - startMs
  const prevStart = new Date(startMs - duration - 86400000).toISOString().split('T')[0]
  const prevEnd = new Date(startMs - 86400000).toISOString().split('T')[0]

  // Previous period
  const { data: prevOrders, error: prevError } = await supabase
    .from('orders')
    .select('id, total')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', prevStart)
    .lte('order_date', prevEnd)

  if (prevError) throw prevError

  // Calculate metrics
  const currentRevenue = (currentOrders || []).reduce((sum, o) => sum + (o.total || 0), 0)
  const currentOrderCount = (currentOrders || []).length
  const currentItemCount = (currentItems || []).reduce((sum, i) => sum + Number(i.quantity || 0), 0)

  const prevRevenue = (prevOrders || []).reduce((sum, o) => sum + (o.total || 0), 0)
  const prevOrderCount = (prevOrders || []).length

  // Profit calculation
  const currentCost = await getOrderItemsCost((currentOrders || []).map(o => o.id))
  const prevCost = await getOrderItemsCost((prevOrders || []).map(o => o.id))

  const currentProfit = currentRevenue - currentCost
  const prevProfit = prevRevenue - prevCost
  const profitMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0

  // Calculate growth percentages
  const revenueGrowth = prevRevenue > 0
    ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
    : currentRevenue > 0 ? 100 : 0

  const ordersGrowth = prevOrderCount > 0
    ? ((currentOrderCount - prevOrderCount) / prevOrderCount) * 100
    : currentOrderCount > 0 ? 100 : 0

  const profitGrowth = prevProfit > 0
    ? ((currentProfit - prevProfit) / prevProfit) * 100
    : currentProfit > 0 ? 100 : 0

  return {
    totalRevenue: currentRevenue,
    totalOrders: currentOrderCount,
    totalItems: Math.round(currentItemCount),
    averageOrderValue: currentOrderCount > 0 ? Math.round(currentRevenue / currentOrderCount) : 0,
    totalProfit: currentProfit,
    profitMargin,
    revenueGrowth,
    ordersGrowth,
    profitGrowth,
  }
}

// Get today's orders for dashboard
export interface TodayOrder {
  id: string
  orderNumber: string
  customerName: string
  total: number
  status: string
  paymentMethod: string
  itemCount: number
}

export async function getTodaysOrders(): Promise<TodayOrder[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total,
      status,
      payment_method,
      customer:customers(company_name),
      items:order_items(id)
    `)
    .eq('order_date', today)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map(order => {
    // Supabase returns single relation as object or array
    const customerData = order.customer as unknown
    const customer = Array.isArray(customerData)
      ? (customerData[0] as { company_name: string } | undefined)
      : (customerData as { company_name: string } | null)

    return {
      id: order.id,
      orderNumber: order.order_number,
      customerName: customer?.company_name || 'Unknown',
      total: order.total || 0,
      status: order.status,
      paymentMethod: order.payment_method || 'none',
      itemCount: (order.items as unknown[])?.length || 0,
    }
  })
}

// Get dashboard summary stats
export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  pendingOrders: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Get order stats
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('status, total')

  if (ordersError) throw ordersError

  // Get customer count
  const { count: customerCount, error: customersError } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })

  if (customersError) throw customersError

  const completedOrders = (orders || []).filter(o =>
    ['completed', 'delivered'].includes(o.status)
  )

  const pendingOrders = (orders || []).filter(o =>
    ['pending_payment', 'on_hold', 'draft'].includes(o.status)
  )

  return {
    totalOrders: completedOrders.length,
    totalRevenue: completedOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    totalCustomers: customerCount || 0,
    pendingOrders: pendingOrders.length,
  }
}

// Get low stock products
export interface LowStockProduct {
  id: string
  name: string
  sku: string
  stockQuantity: number
  unitType: string
}

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

// ==========================================
// Products Tab Service Functions
// ==========================================

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

export interface SlowMoverRow {
  productId: string
  productName: string
  sku: string
  currentStock: number
  stockValue: number
  lastSaleDate: string | null
  daysSinceLastSale: number | null
}

export async function getSlowMovers(daysSinceLastSale = 60): Promise<SlowMoverRow[]> {
  // Get all tracked products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, cost_cents')
    .eq('track_stock', true)
    .gt('stock_quantity', 0)

  if (prodError) throw prodError
  if (!products || products.length === 0) return []

  // Get last sale date per product from order_items
  const productIds = products.map(p => p.id)
  const { data: salesData, error: salesError } = await supabase
    .from('order_items')
    .select(`
      product_id,
      order:orders!inner(order_date, status)
    `)
    .in('product_id', productIds)
    .in('order.status', ['completed', 'delivered'])

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

export interface CategoryRevenueRow {
  categoryName: string
  totalRevenue: number
  totalCogs: number
  totalProfit: number
  profitMargin: number
}

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

// ==========================================
// Customers Tab Service Functions
// ==========================================

export interface CustomerPerformanceRow {
  customerId: string
  companyName: string
  totalRevenue: number
  totalProfit: number
  totalTax: number
  profitMargin: number
  orderCount: number
  avgOrderValue: number
  lastOrderDate: string | null
  daysSinceLastOrder: number | null
}

export async function getCustomerPerformance(
  startDate?: string,
  endDate?: string
): Promise<CustomerPerformanceRow[]> {
  // Get ALL customers
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('id, company_name')

  if (custError) throw custError
  if (!customers || customers.length === 0) return []

  // Get all completed/delivered orders with customer_id
  let ordersQuery = supabase
    .from('orders')
    .select('id, customer_id, total, tax_amount, order_date')
    .in('status', ['completed', 'delivered'])

  if (startDate) ordersQuery = ordersQuery.gte('order_date', startDate)
  if (endDate) ordersQuery = ordersQuery.lte('order_date', endDate)

  const { data: orders, error: ordError } = await ordersQuery

  if (ordError) throw ordError

  // Get order items for cost calculation
  const orderIds = (orders || []).map(o => o.id)
  const costByOrder = new Map<string, number>()

  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity, cost_cents')
      .in('order_id', orderIds)

    for (const item of itemsData || []) {
      const existing = costByOrder.get(item.order_id) || 0
      costByOrder.set(item.order_id, existing + (Number(item.quantity) * Number(item.cost_cents || 0)))
    }
  }

  // Aggregate per customer
  const statsMap = new Map<string, {
    revenue: number
    profit: number
    tax: number
    count: number
    lastDate: string | null
  }>()

  for (const order of orders || []) {
    const custId = order.customer_id
    if (!custId) continue
    const orderRevenue = order.total || 0
    const orderCost = costByOrder.get(order.id) || 0
    const orderTax = order.tax_amount || 0
    const existing = statsMap.get(custId)
    if (existing) {
      existing.revenue += orderRevenue
      existing.profit += (orderRevenue - orderCost)
      existing.tax += orderTax
      existing.count += 1
      if (!existing.lastDate || order.order_date > existing.lastDate) {
        existing.lastDate = order.order_date
      }
    } else {
      statsMap.set(custId, {
        revenue: orderRevenue,
        profit: orderRevenue - orderCost,
        tax: orderTax,
        count: 1,
        lastDate: order.order_date,
      })
    }
  }

  const today = new Date()

  return customers.map(c => {
    const stats = statsMap.get(c.id)
    const revenue = stats?.revenue || 0
    const profit = stats?.profit || 0
    const tax = stats?.tax || 0
    const count = stats?.count || 0
    const lastDate = stats?.lastDate || null
    const daysSince = lastDate
      ? Math.floor((today.getTime() - new Date(lastDate).getTime()) / 86400000)
      : null

    return {
      customerId: c.id,
      companyName: c.company_name,
      totalRevenue: revenue,
      totalProfit: profit,
      totalTax: tax,
      profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      orderCount: count,
      avgOrderValue: count > 0 ? Math.round(revenue / count) : 0,
      lastOrderDate: lastDate,
      daysSinceLastOrder: daysSince,
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ==========================================
// Financial Tab Service Functions
// ==========================================

export interface FinancialSummary {
  grossRevenue: number
  totalDiscounts: number
  netRevenue: number
  totalCogs: number
  grossProfit: number
  grossMargin: number
  vatCollected: number
  cashRevenue: number
  bankRevenue: number
  // Previous period for comparison
  prev: {
    grossRevenue: number
    grossProfit: number
    orderCount: number
  }
  orderCount: number
}

export async function getFinancialSummary(
  startDate: string,
  endDate: string
): Promise<FinancialSummary> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, subtotal, tax_amount, discount_amount, payment_method')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)

  if (error) throw error

  const orderIds = (orders || []).map(o => o.id)
  const totalCogs = await getOrderItemsCost(orderIds)

  const grossRevenue = (orders || []).reduce((sum, o) => sum + (o.total || 0), 0)
  const totalDiscounts = (orders || []).reduce((sum, o) => sum + (o.discount_amount || 0), 0)
  const vatCollected = (orders || []).reduce((sum, o) => sum + (o.tax_amount || 0), 0)
  const netRevenue = grossRevenue
  const grossProfit = netRevenue - totalCogs

  const cashRevenue = (orders || [])
    .filter(o => o.payment_method === 'cash')
    .reduce((sum, o) => sum + (o.total || 0), 0)
  const bankRevenue = (orders || [])
    .filter(o => o.payment_method === 'bank')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  // Previous period
  const startMs = new Date(startDate).getTime()
  const endMs = new Date(endDate).getTime()
  const duration = endMs - startMs
  const prevStart = new Date(startMs - duration - 86400000).toISOString().split('T')[0]
  const prevEnd = new Date(startMs - 86400000).toISOString().split('T')[0]

  const { data: prevOrders } = await supabase
    .from('orders')
    .select('id, total')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', prevStart)
    .lte('order_date', prevEnd)

  const prevRevenue = (prevOrders || []).reduce((sum, o) => sum + (o.total || 0), 0)
  const prevCogs = await getOrderItemsCost((prevOrders || []).map(o => o.id))

  return {
    grossRevenue,
    totalDiscounts,
    netRevenue,
    totalCogs,
    grossProfit,
    grossMargin: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
    vatCollected,
    cashRevenue,
    bankRevenue,
    orderCount: (orders || []).length,
    prev: {
      grossRevenue: prevRevenue,
      grossProfit: prevRevenue - prevCogs,
      orderCount: (prevOrders || []).length,
    },
  }
}

export interface MonthlyRow {
  month: number
  monthLabel: string
  revenue: number
  profit: number
  orders: number
}

export async function getMonthlyComparison(year: number): Promise<MonthlyRow[]> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, order_date')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)

  if (error) throw error

  const orderIds = (orders || []).map(o => o.id)
  const costByOrder = new Map<string, number>()

  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity, cost_cents')
      .in('order_id', orderIds)

    for (const item of itemsData || []) {
      const existing = costByOrder.get(item.order_id) || 0
      costByOrder.set(item.order_id, existing + (Number(item.quantity) * Number(item.cost_cents || 0)))
    }
  }

  const monthLabels = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  const months: MonthlyRow[] = monthLabels.map((label, i) => ({
    month: i + 1,
    monthLabel: label,
    revenue: 0,
    profit: 0,
    orders: 0,
  }))

  for (const order of orders || []) {
    const monthIdx = new Date(order.order_date).getMonth()
    const orderRevenue = order.total || 0
    const orderCost = costByOrder.get(order.id) || 0
    months[monthIdx].revenue += orderRevenue
    months[monthIdx].profit += (orderRevenue - orderCost)
    months[monthIdx].orders += 1
  }

  return months
}

// ==========================================
// Inventory Tab Service Functions
// ==========================================

export interface ExpiryRiskRow {
  batchId: string
  productName: string
  productSku: string
  lotNumber: string
  expiryDate: string | null
  daysToExpiry: number | null
  quantityRemaining: number
  valueAtRisk: number
  riskLevel: 'expired' | 'critical' | 'warning' | 'ok'
}

export async function getExpiryRisk(): Promise<ExpiryRiskRow[]> {
  // Batch tracking table (product_batches) is not yet configured
  return []
}

export interface TurnoverRow {
  productName: string
  stockQty: number
  stockValue: number
  cogsInPeriod: number
  turnoverRatio: number
  daysToSell: number | null
}

export async function getInventoryTurnover(
  startDate: string,
  endDate: string
): Promise<TurnoverRow[]> {
  // Get products with stock
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, stock_quantity, cost_cents')
    .eq('track_stock', true)
    .gt('stock_quantity', 0)
    .order('stock_quantity', { ascending: false })

  if (prodError) throw prodError
  if (!products || products.length === 0) return []

  // Get COGS per product in period
  const productIds = products.map(p => p.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      product_id,
      quantity,
      cost_cents,
      order:orders!inner(status, order_date)
    `)
    .in('product_id', productIds)
    .in('order.status', ['completed', 'delivered'])
    .gte('order.order_date', startDate)
    .lte('order.order_date', endDate)

  if (itemsError) throw itemsError

  const cogsMap = new Map<string, number>()
  for (const item of items || []) {
    const cost = Number(item.quantity || 0) * Number(item.cost_cents || 0)
    cogsMap.set(item.product_id, (cogsMap.get(item.product_id) || 0) + cost)
  }

  // Calculate days in period
  const periodDays = Math.max(1, Math.floor(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  ) + 1)

  return products
    .map(p => {
      const stockValue = (p.stock_quantity || 0) * (p.cost_cents || 0)
      const cogs = cogsMap.get(p.id) || 0
      const turnover = stockValue > 0 ? cogs / stockValue : 0
      const daysToSell = turnover > 0 ? Math.round(periodDays / turnover) : null

      return {
        productName: p.name,
        stockQty: p.stock_quantity || 0,
        stockValue,
        cogsInPeriod: cogs,
        turnoverRatio: Math.round(turnover * 100) / 100,
        daysToSell,
      }
    })
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 20)
}

export interface BatchAgingBucket {
  label: string
  value: number
  count: number
}

export async function getBatchAging(): Promise<BatchAgingBucket[]> {
  // Batch tracking table (product_batches) is not yet configured
  return [
    { label: '0-30', value: 0, count: 0 },
    { label: '31-60', value: 0, count: 0 },
    { label: '61-90', value: 0, count: 0 },
    { label: '91-180', value: 0, count: 0 },
    { label: '180+', value: 0, count: 0 },
  ]
}

// Get date range helpers
export function getDateRanges() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Last 7 days
  const last7Start = new Date(today)
  last7Start.setDate(last7Start.getDate() - 6)

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

  return {
    today: { start: todayStr, end: todayStr, label: 'Today' },
    last7Days: { start: last7Start.toISOString().split('T')[0], end: todayStr, label: 'Last 7 days' },
    last30Days: { start: last30Start.toISOString().split('T')[0], end: todayStr, label: 'Last 30 days' },
    last90Days: { start: last90Start.toISOString().split('T')[0], end: todayStr, label: 'Last 90 days' },
    thisMonth: { start: thisMonthStart.toISOString().split('T')[0], end: todayStr, label: 'This month' },
    lastMonth: { start: lastMonthStart.toISOString().split('T')[0], end: lastMonthEnd.toISOString().split('T')[0], label: 'Last month' },
    thisYear: { start: thisYearStart.toISOString().split('T')[0], end: todayStr, label: 'This year' },
  }
}

// ==========================================
// Orders Tab Service Functions
// ==========================================

export interface OrderPerformanceRow {
  orderId: string
  orderNumber: string
  orderDate: string
  customerName: string
  status: string
  paymentMethod: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  totalCost: number
  profit: number
  profitMargin: number
}

export async function getOrderPerformance(
  startDate: string,
  endDate: string
): Promise<OrderPerformanceRow[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, order_date, status, payment_method,
      subtotal, discount_amount, tax_amount, total,
      customer:customers(company_name)
    `)
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .order('order_date', { ascending: false })

  if (error) throw error

  // Get order items for cost calculation
  const orderIds = (orders || []).map(o => o.id)
  const costByOrder = new Map<string, number>()

  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity, cost_cents')
      .in('order_id', orderIds)

    for (const item of itemsData || []) {
      const existing = costByOrder.get(item.order_id) || 0
      costByOrder.set(item.order_id, existing + (Number(item.quantity) * Number(item.cost_cents || 0)))
    }
  }

  return (orders || []).map(order => {
    const customerData = order.customer as unknown
    const customer = Array.isArray(customerData) ? customerData[0] : customerData
    const customerName = (customer as { company_name: string } | null)?.company_name || 'Unknown'

    const totalCost = costByOrder.get(order.id) || 0
    const orderTotal = order.total || 0
    const profit = orderTotal - totalCost

    return {
      orderId: order.id,
      orderNumber: order.order_number || '',
      orderDate: order.order_date,
      customerName,
      status: order.status,
      paymentMethod: order.payment_method || 'none',
      subtotal: order.subtotal || 0,
      discountAmount: order.discount_amount || 0,
      taxAmount: order.tax_amount || 0,
      total: orderTotal,
      totalCost,
      profit,
      profitMargin: orderTotal > 0 ? (profit / orderTotal) * 100 : 0,
    }
  })
}
