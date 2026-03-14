// Customer performance analytics: top customers, customer segments, performance table

import { supabase } from './supabase'
import { fetchOrderItemsCostChunked } from './analyticsHelpers'

export interface TopCustomer {
  id: string
  companyName: string
  totalRevenue: number
  totalProfit: number
  orderCount: number
}

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
    .limit(10000)

  if (error) throw error

  // Fetch order items for profit calculation (chunked)
  const orderIds = (orders || []).map(o => o.id)
  const costByOrder = await fetchOrderItemsCostChunked(orderIds)

  // Group by customer
  const grouped = new Map<string, {
    id: string
    companyName: string
    revenue: number
    profit: number
    count: number
  }>()

  for (const order of orders || []) {
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

// Get full customer performance table
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
    .limit(10000)

  if (startDate) ordersQuery = ordersQuery.gte('order_date', startDate)
  if (endDate) ordersQuery = ordersQuery.lte('order_date', endDate)

  const { data: orders, error: ordError } = await ordersQuery

  if (ordError) throw ordError

  // Get order items for cost calculation (chunked)
  const orderIds = (orders || []).map(o => o.id)
  const costByOrder = await fetchOrderItemsCostChunked(orderIds)

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
