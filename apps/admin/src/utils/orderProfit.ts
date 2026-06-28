// Shared per-order profit math. Profit convention (matches the analytics RPCs):
//   revenue = order.subtotal (cents, ex-VAT, post-discount)
//   totalCost = Σ (line.cost_cents × line.quantity)
//   profit = revenue − totalCost
//   margin = profit / revenue × 100
// Cost is the immutable order_items.cost_cents snapshot, so figures never drift.
// Owner-gating is the caller's responsibility — this only does the arithmetic.

interface ProfitLine {
  quantity: number
  cost_cents?: number | null
}

interface ProfitOrder {
  subtotal: number
  items?: ProfitLine[] | null
}

export interface OrderProfit {
  totalCost: number
  profit: number
  margin: number
}

// Per-line cost (cents) — cost_cents × quantity, 0 when cost is unknown.
export function lineCost(line: ProfitLine): number {
  return (line.cost_cents ?? 0) * line.quantity
}

// Per-line profit (cents) against a line revenue base. Pass the EX-VAT revenue
// (e.g. line_total − tax_amount) — never the VAT-inclusive line_total, or profit
// is inflated by the line's BTW (cost_cents is ex-VAT).
export function lineProfit(revenueCents: number, line: ProfitLine): number {
  return revenueCents - lineCost(line)
}

export function computeOrderProfit(order: ProfitOrder): OrderProfit {
  const totalCost = (order.items ?? []).reduce((sum, l) => sum + lineCost(l), 0)
  const profit = order.subtotal - totalCost
  const margin = order.subtotal > 0 ? (profit / order.subtotal) * 100 : 0
  return { totalCost, profit, margin }
}
