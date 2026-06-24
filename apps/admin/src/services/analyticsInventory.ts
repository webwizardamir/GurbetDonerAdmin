// Inventory analytics: expiry risk, turnover ratios, batch aging
// Uses server-side RPC functions to avoid PostgREST 1000-row limit

import { supabase } from './supabase'

export interface ExpiryRiskRow {
  batchId: string
  productName: string
  productSku: string
  lotNumber: string
  expiryDate: string | null
  daysToExpiry: number | null
  quantityRemaining: number
  valueAtRisk: number
  riskLevel: 'expired' | 'critical' | 'warning' | 'ok'
}

export interface TurnoverRow {
  productName: string
  stockQty: number
  stockValue: number
  cogsInPeriod: number
  turnoverRatio: number
  daysToSell: number | null
}

export interface BatchAgingBucket {
  label: string
  value: number
  count: number
}

// Get expiry risk (placeholder until product_batches table is configured)
export async function getExpiryRisk(): Promise<ExpiryRiskRow[]> {
  return []
}

// Get inventory turnover ratios using server-side RPC
export async function getInventoryTurnover(
  startDate: string,
  endDate: string
): Promise<TurnoverRow[]> {
  const { data, error } = await supabase.rpc('get_inventory_turnover', {
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) throw error

  return (data || []).map((row: {
    product_name: string
    stock_qty: number
    stock_value: number
    cogs_in_period: number
    turnover_ratio: number
    days_to_sell: number | null
  }) => ({
    productName: row.product_name,
    stockQty: Number(row.stock_qty),
    stockValue: Number(row.stock_value),
    cogsInPeriod: Number(row.cogs_in_period),
    turnoverRatio: Number(row.turnover_ratio),
    daysToSell: row.days_to_sell != null ? Number(row.days_to_sell) : null,
  }))
}

// Get batch aging buckets (placeholder until product_batches table is configured)
export async function getBatchAging(): Promise<BatchAgingBucket[]> {
  return [
    { label: '0-30', value: 0, count: 0 },
    { label: '31-60', value: 0, count: 0 },
    { label: '61-90', value: 0, count: 0 },
    { label: '91-180', value: 0, count: 0 },
    { label: '180+', value: 0, count: 0 },
  ]
}
