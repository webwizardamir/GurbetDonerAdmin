// Order analytics: status distribution, order performance table

import { supabase } from './supabase'
import { fetchOrderItemsCostChunked } from './analyticsHelpers'

export interface OrderStatusCount {
  status: string
  count: number
  revenue: number
}

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

// Get order counts by status using count queries for efficiency
export async function getOrdersByStatus(
  startDate: string,
  endDate: string
): Promise<OrderStatusCount[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, total')
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .limit(10000)

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

// Get detailed order performance table
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
    .limit(10000)

  if (error) throw error

  // Get order items for cost calculation (chunked)
  const orderIds = (orders || []).map(o => o.id)
  const costByOrder = await fetchOrderItemsCostChunked(orderIds)

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
