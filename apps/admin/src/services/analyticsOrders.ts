// Order analytics: status distribution, order performance table
// Uses server-side RPC functions to avoid PostgREST 1000-row limit

import { supabase } from './supabase'
import { canonicalStatus } from '../constants/orderStatus'
import { statusArg, entityArg, type AnalyticsFilters } from './analyticsHelpers'

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
  endDate: string,
  statuses?: string[] | null
): Promise<OrderStatusCount[]> {
  const { data, error } = await supabase.rpc('get_orders_by_status', {
    p_start_date: startDate,
    p_end_date: endDate,
    ...statusArg(statuses),
  })

  if (error) throw error

  // GROUP BY o.status groups the RAW stored value, so the legacy `pending` and
  // `pending_payment` come back as two rows — and they render the same label, so
  // the pie showed two identical "Wacht op betaling" slices (245 + 4 on Melek)
  // and the legend read as a bug. Merge onto the status the UI actually shows.
  const merged = new Map<string, OrderStatusCount>()
  for (const row of (data || []) as { status: string; count: number; revenue: number }[]) {
    const status = canonicalStatus(row.status)
    const prev = merged.get(status)
    if (prev) {
      prev.count += Number(row.count)
      prev.revenue += Number(row.revenue)
    } else {
      merged.set(status, { status, count: Number(row.count), revenue: Number(row.revenue) })
    }
  }
  // The RPC orders by count DESC; merging can reorder, so re-sort to match.
  return Array.from(merged.values()).sort((a, b) => b.count - a.count)
}

// Get detailed order performance table using server-side RPC
export async function getOrderPerformance(
  startDate: string,
  endDate: string,
  statuses?: string[] | null,
  filters?: AnalyticsFilters | null
): Promise<OrderPerformanceRow[]> {
  const { data, error } = await supabase.rpc('get_order_performance', {
    p_start_date: startDate,
    p_end_date: endDate,
    ...statusArg(statuses),
    ...entityArg(filters, ['customerId', 'paymentMethod', 'customerType']),
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
