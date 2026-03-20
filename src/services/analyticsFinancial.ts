// Financial analytics: revenue/profit summaries, monthly comparisons, revenue by day/payment method
// Uses server-side RPC functions for accurate aggregation (no row-limit issues).

import { supabase } from './supabase'
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

// Get revenue data grouped by day (server-side RPC)
export async function getRevenueByDay(
  startDate: string,
  endDate: string
): Promise<RevenueDataPoint[]> {
  const { data, error } = await supabase.rpc('get_revenue_by_day', {
    p_start: startDate,
    p_end: endDate,
  })

  if (error) throw error

  // RPC returns camelCase keys
  const rows = (data as Array<{ date: string; revenue: number; profit: number; orderCount: number }>) || []

  return rows.map(r => ({
    date: r.date,
    revenue: r.revenue ?? 0,
    profit: r.profit ?? 0,
    orderCount: r.orderCount ?? 0,
  }))
}

// Get revenue breakdown by payment method (server-side RPC)
export async function getRevenueByPaymentMethod(
  startDate: string,
  endDate: string
): Promise<PaymentMethodBreakdown[]> {
  const { data, error } = await supabase.rpc('get_revenue_by_payment_method', {
    p_start: startDate,
    p_end: endDate,
  })

  if (error) throw error

  const rows = (data as Array<{ method: string; count: number; revenue: number }>) || []

  return rows.map(r => ({
    method: r.method as PaymentMethod,
    count: r.count,
    revenue: r.revenue,
  }))
}

// Get financial summary with previous period comparison (server-side RPC)
export async function getFinancialSummary(
  startDate: string,
  endDate: string
): Promise<FinancialSummary> {
  const { data, error } = await supabase.rpc('get_financial_summary', {
    p_start: startDate,
    p_end: endDate,
  })

  if (error) throw error

  // RPC returns camelCase JSON keys
  const d = data as Record<string, unknown>
  const prev = (d.prev || {}) as Record<string, number>

  return {
    grossRevenue: Number(d.grossRevenue ?? 0),
    totalDiscounts: Number(d.totalDiscounts ?? 0),
    netRevenue: Number(d.netRevenue ?? 0),
    totalCogs: Number(d.totalCogs ?? 0),
    grossProfit: Number(d.grossProfit ?? 0),
    grossMargin: Number(d.grossMargin ?? 0),
    vatCollected: Number(d.vatCollected ?? 0),
    cashRevenue: Number(d.cashRevenue ?? 0),
    bankRevenue: Number(d.bankRevenue ?? 0),
    orderCount: Number(d.orderCount ?? d.order_count ?? 0),
    prev: {
      grossRevenue: Number(prev.grossRevenue ?? 0),
      grossProfit: Number(prev.grossProfit ?? 0),
      orderCount: Number(prev.orderCount ?? 0),
    },
  }
}

// Get monthly revenue/profit comparison for a given year (server-side RPC)
export async function getMonthlyComparison(year: number): Promise<MonthlyRow[]> {
  const { data, error } = await supabase.rpc('get_monthly_comparison', {
    p_year: year,
  })

  if (error) throw error

  const monthLabels = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

  // RPC returns camelCase with monthLabel included
  const rows = (data as Array<Record<string, unknown>>) || []

  return rows.map(r => ({
    month: Number(r.month ?? 0),
    monthLabel: String(r.monthLabel || monthLabels[Number(r.month ?? 1) - 1]),
    revenue: Number(r.revenue ?? 0),
    profit: Number(r.profit ?? 0),
    orders: Number(r.orders ?? 0),
  }))
}
