// Inventory analytics: expiry risk, turnover ratios, batch aging

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

// Get inventory turnover ratios
export async function getInventoryTurnover(
  startDate: string,
  endDate: string
): Promise<TurnoverRow[]> {
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, stock_quantity, cost_cents')
    .eq('track_stock', true)
    .gt('stock_quantity', 0)
    .order('stock_quantity', { ascending: false })

  if (prodError) throw prodError
  if (!products || products.length === 0) return []

  // Get COGS per product in period
  const productIds = products.map(p => p.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      product_id,
      quantity,
      cost_cents,
      order:orders!inner(status, order_date)
    `)
    .in('product_id', productIds)
    .in('order.status', ['completed', 'delivered'])
    .gte('order.order_date', startDate)
    .lte('order.order_date', endDate)
    .limit(10000)

  if (itemsError) throw itemsError

  const cogsMap = new Map<string, number>()
  for (const item of items || []) {
    const cost = Number(item.quantity || 0) * Number(item.cost_cents || 0)
    cogsMap.set(item.product_id, (cogsMap.get(item.product_id) || 0) + cost)
  }

  // Calculate days in period
  const periodDays = Math.max(1, Math.floor(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  ) + 1)

  return products
    .map(p => {
      const stockValue = (p.stock_quantity || 0) * (p.cost_cents || 0)
      const cogs = cogsMap.get(p.id) || 0
      const turnover = stockValue > 0 ? cogs / stockValue : 0
      const daysToSell = turnover > 0 ? Math.round(periodDays / turnover) : null

      return {
        productName: p.name,
        stockQty: p.stock_quantity || 0,
        stockValue,
        cogsInPeriod: cogs,
        turnoverRatio: Math.round(turnover * 100) / 100,
        daysToSell,
      }
    })
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 20)
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
