// Financial analytics: revenue/profit summaries, monthly comparisons, revenue by day/payment method

import { supabase } from './supabase'
import { fetchOrderItemsCostChunked, getOrderItemsCost, getPreviousPeriod } from './analyticsHelpers'
import type { PaymentMethod } from '../types'

export interface RevenueDataPoint {
  date: string
  revenue: number
  profit: number
  orderCount: number
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod
  count: number
  revenue: number
}

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
  prev: {
    grossRevenue: number
    grossProfit: number
    orderCount: number
  }
  orderCount: number
}

export interface MonthlyRow {
  month: number
  monthLabel: string
  revenue: number
  profit: number
  orders: number
}

// Get revenue data grouped by day
export async function getRevenueByDay(
  startDate: string,
  endDate: string
): Promise<RevenueDataPoint[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_date, total')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .order('order_date')
    .limit(10000)

  if (error) throw error

  // Fetch order items for profit calculation (chunked)
  const orderIds = (orders || []).map(o => o.id)
  const itemsByOrder = await fetchOrderItemsCostChunked(orderIds)

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
    const orderCost = itemsByOrder.get(order.id) || 0
    grouped.set(dateStr, {
      revenue: existing.revenue + orderRevenue,
      profit: existing.profit + (orderRevenue - orderCost),
      count: existing.count + 1,
    })
  }

  return Array.from(grouped.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    profit: data.profit,
    orderCount: data.count,
  }))
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
    .limit(10000)

  if (error) throw error

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
    .filter(item => item.method !== 'none')
    .sort((a, b) => b.revenue - a.revenue)
}

// Get financial summary with previous period comparison
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
    .limit(10000)

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
  const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate)

  const { data: prevOrders } = await supabase
    .from('orders')
    .select('id, total')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', prevStart)
    .lte('order_date', prevEnd)
    .limit(10000)

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

// Get monthly revenue/profit comparison for a given year
export async function getMonthlyComparison(year: number): Promise<MonthlyRow[]> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, order_date')
    .in('status', ['completed', 'delivered'])
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .limit(10000)

  if (error) throw error

  const orderIds = (orders || []).map(o => o.id)
  const costByOrder = await fetchOrderItemsCostChunked(orderIds)

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
