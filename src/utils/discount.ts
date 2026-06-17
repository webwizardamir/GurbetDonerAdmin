// Order discount math — shared by the order form (live display) and the order
// service (authoritative recompute on create/update). Keeping a single source
// for the algorithm guarantees the totals the user sees match what is stored.
//
// All money is integer cents. Discounts are applied BEFORE BTW (they reduce the
// taxable base). An order-level discount is distributed across the lines in
// proportion to each line's post-line-discount ex-VAT base, so every per-line
// `tax_amount`/`total` stays fully net — which keeps the invoice VAT breakdown
// and the refund RPC correct with no special-casing.

export type DiscountType = 'percentage' | 'fixed'

// percentage -> value is BASIS POINTS (10% = 1000). fixed -> value is CENTS.
// Resolves to a cents discount, clamped to [0, baseCents] so it can never
// exceed the goods value or go negative.
export function resolveDiscountCents(
  type: DiscountType | null | undefined,
  value: number | null | undefined,
  baseCents: number,
): number {
  if (!type || value == null || value <= 0 || baseCents <= 0) return 0
  const d = type === 'fixed'
    ? Math.round(value)
    : Math.round((baseCents * value) / 10000)
  return Math.min(Math.max(d, 0), baseCents)
}

export interface DiscountLineInput {
  unitPrice: number // cents
  quantity: number
  taxRate: number // effective rate (already reverse-charge adjusted) as a percentage, e.g. 9
  lineDiscountType?: DiscountType | null
  lineDiscountValue?: number | null
}

export interface DiscountLineResult {
  lineGross: number // unitPrice * quantity, ex-VAT, before any discount
  lineDiscount: number // the LINE portion only, cents
  orderDiscountShare: number // this line's share of the order-level discount, cents
  finalBase: number // ex-VAT, net of BOTH discounts
  tax: number // cents
  total: number // incl. VAT, fully net
}

export interface OrderTotalsResult {
  lines: DiscountLineResult[]
  subtotal: number // gross ex-VAT (Σ lineGross)
  lineDiscountTotal: number // Σ line discounts, cents
  orderDiscount: number // resolved order-level discount, cents
  discountTotal: number // lineDiscountTotal + orderDiscount (= orders.discount)
  tax: number // cents
  total: number // subtotal - discountTotal + tax
}

// Distribute `amount` cents across `weights` using the largest-remainder
// method, so the parts sum to EXACTLY `amount` (no penny drift). Zero-weight
// lines never receive a cent.
function distributeProportionally(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  if (amount <= 0 || totalWeight <= 0) return weights.map(() => 0)

  const floors = weights.map(w => Math.floor((amount * w) / totalWeight))
  let remainder = amount - floors.reduce((s, f) => s + f, 0)

  // Rank by the integer fractional remainder (amount*w mod totalWeight) desc,
  // tie-break by larger weight then lower index — all integer math, no floats.
  const ranked = weights
    .map((w, i) => ({ i, frac: amount * w - floors[i] * totalWeight, weight: w }))
    .sort((a, b) => (b.frac - a.frac) || (b.weight - a.weight) || (a.i - b.i))

  const result = [...floors]
  for (let k = 0; k < ranked.length && remainder > 0; k++) {
    if (ranked[k].weight <= 0) continue
    result[ranked[k].i] += 1
    remainder--
  }
  return result
}

export function computeOrderTotals(
  lines: DiscountLineInput[],
  orderDiscountType?: DiscountType | null,
  orderDiscountValue?: number | null,
): OrderTotalsResult {
  // Step 1 — line discount + ex-VAT base after the line discount.
  const staged = lines.map(l => {
    const lineGross = Math.round(l.unitPrice * l.quantity)
    const lineDiscount = resolveDiscountCents(l.lineDiscountType, l.lineDiscountValue, lineGross)
    return { taxRate: l.taxRate, lineGross, lineDiscount, netBase: lineGross - lineDiscount }
  })

  // Step 2 — order-level discount over the post-line-discount ex-VAT subtotal.
  const postLineSubtotal = staged.reduce((s, l) => s + l.netBase, 0)
  const orderDiscount = resolveDiscountCents(orderDiscountType, orderDiscountValue, postLineSubtotal)

  // Step 3 — distribute the order discount across lines by ex-VAT weight.
  const shares = distributeProportionally(orderDiscount, staged.map(l => l.netBase))

  // Step 4 + 5 — per-line net values and order totals.
  let subtotal = 0
  let lineDiscountTotal = 0
  let tax = 0
  let total = 0
  const resultLines: DiscountLineResult[] = staged.map((l, i) => {
    const share = Math.min(shares[i], l.netBase)
    const finalBase = l.netBase - share
    const lineTax = Math.round((finalBase * l.taxRate) / 100)
    const lineTotal = finalBase + lineTax

    subtotal += l.lineGross
    lineDiscountTotal += l.lineDiscount
    tax += lineTax
    total += lineTotal

    return {
      lineGross: l.lineGross,
      lineDiscount: l.lineDiscount,
      orderDiscountShare: share,
      finalBase,
      tax: lineTax,
      total: lineTotal,
    }
  })

  return {
    lines: resultLines,
    subtotal,
    lineDiscountTotal,
    orderDiscount,
    discountTotal: lineDiscountTotal + orderDiscount,
    tax,
    total,
  }
}
