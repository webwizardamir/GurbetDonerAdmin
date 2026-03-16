// Dashboard KPIs, today's orders, and summary statistics

import { supabase } from './supabase'
import { getOrderItemsCost } from './analyticsHelpers'

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

export interface TodayOrder {
  id: string
  orderNumber: string
  customerName: string
  total: number
  status: string
  paymentMethod: string
  itemCount: number
}

export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  pendingOrders: number
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
    .limit(10000)

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
    .limit(10000)

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
    .limit(10000)

  if (prevError) throw prevError

  // Calculate metrics
  const currentRevenue = (currentOrders || []).reduce((sum, o) => sum + (o.total || 0), 0)
  const currentOrderCount = (currentOrders || []).length
  const currentItemCount = (currentItems || []).reduce((sum, i) => sum + Number(i.quantity || 0), 0)

  const prevRevenue = (prevOrders || []).reduce((sum, o) => sum + (o.total || 0), 0)
  const prevOrderCount = (prevOrders || []).length

  // Profit calculation (chunked)
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
    .limit(200)

  if (error) throw error

  return (data || []).map(order => {
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

// Get dashboard summary stats using count queries instead of fetching all rows
export async function getDashboardStats(): Promise<DashboardStats> {
  // Get counts by status using head:true + count:'exact' to avoid fetching rows
  const [
    { count: completedCount, error: compError },
    { count: pendingCount, error: pendError },
    { count: customerCount, error: custError },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['completed', 'delivered']),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending_payment', 'on_hold', 'draft']),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true }),
  ])

  if (compError) throw compError
  if (pendError) throw pendError
  if (custError) throw custError

  // Use server-side RPC to sum revenue (avoids PostgREST 1000 row limit)
  const { data: revenueData, error: revError } = await supabase
    .rpc('get_dashboard_revenue')

  if (revError) throw revError

  const totalRevenue = typeof revenueData === 'number' ? revenueData : 0

  return {
    totalOrders: completedCount || 0,
    totalRevenue,
    totalCustomers: customerCount || 0,
    pendingOrders: pendingCount || 0,
  }
}
