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
  /** order_items.total — incl-VAT, already net of line AND order discounts. */
  total?: number | null
  /** order_items.tax_amount — the VAT portion of `total`. */
  tax_amount?: number | null
}

interface ProfitOrder {
  subtotal: number
  items?: ProfitLine[] | null
}

export interface OrderProfit {
  totalCost: number
  profit: number
  margin: number
  /** Ex-VAT revenue the profit was computed against (post-discount). */
  revenue: number
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
  const lines = order.items ?? []
  const totalCost = lines.reduce((sum, l) => sum + lineCost(l), 0)

  // 🚨 orders.subtotal is PRE-discount: buildOrderRows persists
  // computeOrderTotals().subtotal, which sums lineGross (unit_price × qty)
  // before any line or order discount. Using it as the revenue base overstated
  // profit by exactly the discount — order 10528 (€75,00 discount, €62,50 cost,
  // €0,00 actually charged) reported +€12,50 profit instead of a €62,50 loss.
  //
  // (total − tax_amount) per line is ex-VAT AND net of both discount levels —
  // the same base lineProfit() uses — so the order figure is now the sum of the
  // per-line figures shown above it, and the two reconcile.
  //
  // Falls back to order.subtotal only when the caller passes lines without the
  // snapshot fields; identical result when nothing is discounted.
  const hasLineTotals = lines.length > 0 && lines.every(l => typeof l.total === 'number')
  const revenue = hasLineTotals
    ? lines.reduce((sum, l) => sum + ((l.total ?? 0) - (l.tax_amount ?? 0)), 0)
    : order.subtotal

  const profit = revenue - totalCost
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0
  return { totalCost, profit, margin, revenue }
}
