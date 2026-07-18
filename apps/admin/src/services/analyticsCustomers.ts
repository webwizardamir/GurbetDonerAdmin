// Customer performance analytics: top customers, customer segments, performance table
// Uses server-side RPC functions to avoid PostgREST 1000-row limit

import { supabase } from './supabase'
import { statusArg, entityArg, type AnalyticsFilters } from './analyticsHelpers'

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

// Get top customers by revenue using server-side RPC.
// The RPC currently returns customer_name only — we backfill customer_id
// client-side so links navigate to the correct /customers/:uuid route.
export async function getTopCustomers(
  startDate: string,
  endDate: string,
  limit = 10,
  statuses?: string[] | null,
  filters?: AnalyticsFilters | null
): Promise<TopCustomer[]> {
  const { data, error } = await supabase.rpc('get_top_customers', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit,
    ...statusArg(statuses),
    ...entityArg(filters, ['customerType']),
  })

  if (error) throw error

  interface Row { rpcId: string | null; companyName: string; totalRevenue: number; totalProfit: number; orderCount: number }
  const rows: Row[] = (data || []).map((row: Record<string, unknown>) => ({
    rpcId: row.customer_id ? String(row.customer_id) : null,
    companyName: String(row.company_name || row.customer_name || 'Unknown'),
    totalRevenue: Number(row.total_revenue ?? 0),
    totalProfit: Number(row.total_profit ?? 0),
    orderCount: Number(row.order_count ?? 0),
  }))

  // Backfill missing customer IDs in one batched query
  const missingNames = [...new Set(rows.filter(r => !r.rpcId).map(r => r.companyName))]
  const idByName = new Map<string, string>()
  if (missingNames.length) {
    const { data: custs } = await supabase
      .from('customers')
      .select('id, company_name')
      .in('company_name', missingNames)
    for (const c of custs ?? []) idByName.set(c.company_name, c.id)
  }

  return rows.map(r => ({
    id: r.rpcId ?? idByName.get(r.companyName) ?? '',
    companyName: r.companyName,
    totalRevenue: r.totalRevenue,
    totalProfit: r.totalProfit,
    orderCount: r.orderCount,
  }))
}

// Get full customer performance table using server-side RPC
export async function getCustomerPerformance(
  startDate?: string,
  endDate?: string,
  statuses?: string[] | null,
  filters?: AnalyticsFilters | null
): Promise<CustomerPerformanceRow[]> {
  const { data, error } = await supabase.rpc('get_customer_performance', {
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    ...statusArg(statuses),
    ...entityArg(filters, ['customerId', 'paymentMethod', 'customerType']),
  })

  if (error) throw error

  return (data || []).map((row: Record<string, unknown>) => {
    const totalRevenue = Number(row.total_revenue ?? 0)
    const totalCost = Number(row.total_cost ?? 0)
    const totalProfit = Number(row.total_profit ?? 0)
    const profitMargin = Number(row.profit_margin ?? 0)
    const totalOrders = Number(row.total_orders ?? 0)
    const avgOrderValue = Number(row.avg_order_value ?? 0)
    // Tax is not returned by the RPC; derive as revenue - cost - profit if needed, else 0
    const totalTax = totalRevenue > 0 ? Math.max(0, totalRevenue - totalCost - totalProfit) : 0

    return {
      customerId: String(row.customer_id || ''),
      companyName: String(row.customer_name || 'Unknown'),
      totalRevenue,
      totalProfit,
      totalTax,
      profitMargin,
      orderCount: totalOrders,
      avgOrderValue,
      lastOrderDate: row.last_order_date ? String(row.last_order_date) : null,
      daysSinceLastOrder: row.last_order_date != null
        ? Math.floor((Date.now() - new Date(String(row.last_order_date)).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }
  })
}
