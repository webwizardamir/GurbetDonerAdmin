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
  orderCount: number
}

export interface TopProduct {
  productName: string
  totalQuantity: number
  totalRevenue: number
  unitType: string
}

export interface KPIData {
  totalRevenue: number
  totalOrders: number
  totalItems: number
  averageOrderValue: number
  // Comparison with previous period
  revenueGrowth: number
  ordersGrowth: number
}

// Get revenue data grouped by day
export async function getRevenueByDay(
  startDate: string,
  endDate: string
): Promise<RevenueDataPoint[]> {
  // Fetch completed orders within date range
  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_date, total')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .order('order_date')

  if (error) throw error

  // Group by date
  const grouped = new Map<string, { revenue: number; count: number }>()

  // Initialize all dates in range
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    grouped.set(dateStr, { revenue: 0, count: 0 })
    current.setDate(current.getDate() + 1)
  }

  // Aggregate orders
  for (const order of orders || []) {
    const dateStr = order.order_date
    const existing = grouped.get(dateStr) || { revenue: 0, count: 0 }
    grouped.set(dateStr, {
      revenue: existing.revenue + (order.total || 0),
      count: existing.count + 1,
    })
  }

  // Convert to array
  return Array.from(grouped.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
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
      total,
      customer:customers(id, company_name)
    `)
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)

  if (error) throw error

  // Group by customer
  const grouped = new Map<string, {
    id: string
    companyName: string
    revenue: number
    count: number
  }>()

  for (const order of orders || []) {
    // Supabase returns an array for nested relations - take first element
    const customerData = order.customer as unknown
    const customer = Array.isArray(customerData) ? customerData[0] : customerData
    if (!customer) continue

    const existing = grouped.get(customer.id) || {
      id: customer.id,
      companyName: customer.company_name,
      revenue: 0,
      count: 0,
    }
    grouped.set(customer.id, {
      ...existing,
      revenue: existing.revenue + (order.total || 0),
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
    unitType: string
  }>()

  for (const item of items || []) {
    const name = item.product_name
    const existing = grouped.get(name) || {
      quantity: 0,
      revenue: 0,
      unitType: item.unit_type || 'piece',
    }
    grouped.set(name, {
      quantity: existing.quantity + Number(item.quantity || 0),
      revenue: existing.revenue + (item.total || 0),
      unitType: existing.unitType,
    })
  }

  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      productName: name,
      totalQuantity: data.quantity,
      totalRevenue: data.revenue,
      unitType: data.unitType,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit)
}

// Get KPIs with period comparison
export async function getKPIs(
  startDate: string,
  endDate: string
): Promise<KPIData> {
  // Current period
  const { data: currentOrders, error: currentError } = await supabase
    .from('orders')
    .select('total')
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
    .select('total')
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

  // Calculate growth percentages
  const revenueGrowth = prevRevenue > 0
    ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
    : currentRevenue > 0 ? 100 : 0

  const ordersGrowth = prevOrderCount > 0
    ? ((currentOrderCount - prevOrderCount) / prevOrderCount) * 100
    : currentOrderCount > 0 ? 100 : 0

  return {
    totalRevenue: currentRevenue,
    totalOrders: currentOrderCount,
    totalItems: Math.round(currentItemCount),
    averageOrderValue: currentOrderCount > 0 ? Math.round(currentRevenue / currentOrderCount) : 0,
    revenueGrowth,
    ordersGrowth,
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
