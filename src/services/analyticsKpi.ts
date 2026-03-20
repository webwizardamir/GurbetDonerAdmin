// Dashboard KPIs, today's orders, and summary statistics

import { supabase } from './supabase'

// --- New dashboard interfaces (today-focused) ---

/** Owner variant of today stats */
export interface TodayStatsOwner {
  orders_today: number
  revenue_today: number
  profit_today: number
  pending_count: number
  yesterday_revenue: number
}

/** Shop manager variant of today stats */
export interface TodayStatsManager {
  orders_today: number
  items_to_pick: number
  pending_count: number
  deliveries_today: number
}

export type TodayStats = TodayStatsOwner | TodayStatsManager

export interface WeeklyStats {
  this_week_revenue: number
  this_week_orders: number
  last_week_revenue: number
  last_week_orders: number
  revenue_change_pct: number
  orders_change_pct: number
}

export interface ActionRequired {
  overdue_payments: number
  zero_stock_count: number
  orders_on_hold: number
}

export interface TodayOrderByStatus {
  status: string
  count: number
  total_amount: number
}

export type TodayOrdersByStatus = TodayOrderByStatus[]

// --- New dashboard RPC callers ---

export async function getTodayStats(isOwner: boolean): Promise<TodayStats> {
  const { data, error } = await supabase.rpc('get_today_stats', {
    p_is_owner: isOwner,
  })
  if (error) throw error
  return data as TodayStats
}

export async function getWeeklyStats(isOwner: boolean): Promise<WeeklyStats> {
  const { data, error } = await supabase.rpc('get_weekly_stats', {
    p_is_owner: isOwner,
  })
  if (error) throw error
  return data as WeeklyStats
}

export async function getActionRequired(): Promise<ActionRequired> {
  const { data, error } = await supabase.rpc('get_action_required')
  if (error) throw error
  return data as ActionRequired
}

export async function getTodayOrdersByStatus(): Promise<TodayOrdersByStatus> {
  const { data, error } = await supabase.rpc('get_today_orders_by_status')
  if (error) throw error
  return (data as TodayOrdersByStatus) || []
}

// --- Existing interfaces & functions (preserved) ---

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

// Get KPIs with period comparison (server-side RPC to avoid row limits)
export async function getKPIs(
  startDate: string,
  endDate: string
): Promise<KPIData> {
  const { data, error } = await supabase.rpc('get_kpis', {
    p_start: startDate,
    p_end: endDate,
  })

  if (error) throw error

  // RPC returns camelCase JSON keys directly
  const d = data as Record<string, number>
  console.log('[DEBUG getKPIs] dates:', startDate, '-', endDate, '| totalRevenue:', d.totalRevenue, '| raw:', JSON.stringify(d))

  return {
    totalRevenue: d.totalRevenue ?? 0,
    totalOrders: d.totalOrders ?? 0,
    totalItems: d.totalItems ?? 0,
    averageOrderValue: d.averageOrderValue ?? 0,
    totalProfit: d.totalProfit ?? 0,
    profitMargin: d.profitMargin ?? 0,
    revenueGrowth: d.revenueGrowth ?? 0,
    ordersGrowth: d.orderGrowth ?? 0,
    profitGrowth: d.profitGrowth ?? 0,
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
  // totalOrders = everything except cancelled/refunded (matches WooCommerce "Orders")
  // pendingOrders = pending_payment + on_hold + draft
  const [
    { count: totalOrderCount, error: compError },
    { count: pendingCount, error: pendError },
    { count: customerCount, error: custError },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("cancelled","refunded")'),
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
    totalOrders: totalOrderCount || 0,
    totalRevenue,
    totalCustomers: customerCount || 0,
    pendingOrders: pendingCount || 0,
  }
}
