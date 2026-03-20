// Order analytics: status distribution, order performance table
// Uses server-side RPC functions to avoid PostgREST 1000-row limit

import { supabase } from './supabase'

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

// Get order counts by status using server-side RPC
export async function getOrdersByStatus(
  startDate: string,
  endDate: string
): Promise<OrderStatusCount[]> {
  const { data, error } = await supabase.rpc('get_orders_by_status', {
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) throw error

  return (data || []).map((row: { status: string; count: number; revenue: number }) => ({
    status: row.status,
    count: Number(row.count),
    revenue: Number(row.revenue),
  }))
}

// Get detailed order performance table using server-side RPC
export async function getOrderPerformance(
  startDate: string,
  endDate: string
): Promise<OrderPerformanceRow[]> {
  const { data, error } = await supabase.rpc('get_order_performance', {
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) throw error

  return (data || []).map((row: {
    order_id: string
    order_number: string
    order_date: string
    customer_name: string
    status: string
    payment_method: string
    subtotal: number
    discount_amount: number
    tax_amount: number
    total: number
    total_cost: number
    profit: number
    profit_margin: number
  }) => ({
    orderId: row.order_id,
    orderNumber: row.order_number || '',
    orderDate: row.order_date,
    customerName: row.customer_name,
    status: row.status,
    paymentMethod: row.payment_method,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    totalCost: Number(row.total_cost),
    profit: Number(row.profit),
    profitMargin: Number(row.profit_margin),
  }))
}
