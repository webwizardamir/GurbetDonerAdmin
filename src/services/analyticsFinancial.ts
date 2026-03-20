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

  const rows = (data as Array<{ date: string; revenue: number; profit: number; order_count: number }>) || []

  return rows.map(r => ({
    date: r.date,
    revenue: r.revenue,
    profit: r.profit,
    orderCount: r.order_count,
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

  const d = data as {
    gross_revenue: number
    net_revenue: number
    total_tax: number
    total_discount: number
    total_cogs: number
    gross_profit: number
    margin_pct: number
    cash_revenue: number
    bank_revenue: number
    order_count: number
    prev_gross_revenue: number
    prev_gross_profit: number
    prev_order_count: number
  }

  return {
    grossRevenue: d.gross_revenue,
    totalDiscounts: d.total_discount,
    netRevenue: d.net_revenue,
    totalCogs: d.total_cogs,
    grossProfit: d.gross_profit,
    grossMargin: d.margin_pct,
    vatCollected: d.total_tax,
    cashRevenue: d.cash_revenue,
    bankRevenue: d.bank_revenue,
    orderCount: d.order_count,
    prev: {
      grossRevenue: d.prev_gross_revenue,
      grossProfit: d.prev_gross_profit,
      orderCount: d.prev_order_count,
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

  const rows = (data as Array<{ month: number; revenue: number; profit: number; orders: number }>) || []

  return rows.map(r => ({
    month: r.month,
    monthLabel: monthLabels[r.month - 1],
    revenue: r.revenue,
    profit: r.profit,
    orders: r.orders,
  }))
}
