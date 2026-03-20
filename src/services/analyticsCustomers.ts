// Customer performance analytics: top customers, customer segments, performance table
// Uses server-side RPC functions to avoid PostgREST 1000-row limit

import { supabase } from './supabase'

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

// Get top customers by revenue using server-side RPC
export async function getTopCustomers(
  startDate: string,
  endDate: string,
  limit = 10
): Promise<TopCustomer[]> {
  const { data, error } = await supabase.rpc('get_top_customers', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit,
  })

  if (error) throw error

  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.customer_id || row.customer_name || ''),
    companyName: String(row.company_name || row.customer_name || 'Unknown'),
    totalRevenue: Number(row.total_revenue ?? 0),
    totalProfit: Number(row.total_profit ?? 0),
    orderCount: Number(row.order_count ?? 0),
  }))
}

// Get full customer performance table using server-side RPC
export async function getCustomerPerformance(
  startDate?: string,
  endDate?: string
): Promise<CustomerPerformanceRow[]> {
  const { data, error } = await supabase.rpc('get_customer_performance', {
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  })

  if (error) throw error

  return (data || []).map((row: {
    customer_id: string
    company_name: string
    total_revenue: number
    total_profit: number
    total_tax: number
    profit_margin: number
    order_count: number
    avg_order_value: number
    last_order_date: string | null
    days_since_last_order: number | null
  }) => ({
    customerId: row.customer_id,
    companyName: row.company_name,
    totalRevenue: Number(row.total_revenue),
    totalProfit: Number(row.total_profit),
    totalTax: Number(row.total_tax),
    profitMargin: Number(row.profit_margin),
    orderCount: Number(row.order_count),
    avgOrderValue: Number(row.avg_order_value),
    lastOrderDate: row.last_order_date,
    daysSinceLastOrder: row.days_since_last_order != null ? Number(row.days_since_last_order) : null,
  }))
}
