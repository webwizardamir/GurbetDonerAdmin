/**
 * Catch-weight lines: goods COUNTED in pieces but PRICED per kilo.
 *
 * "35 stuks a 7 kg, EUR 4,70 per kg" is one order line whose stored `quantity`
 * is the 245 kg and whose `unit_price` is the EUR/kg. `piece_count` (35) and
 * `piece_weight_kg` (7) ride along as DESCRIPTIVE fields so the form, the
 * invoice, the packing slip and the driver's list can all say what the customer
 * actually counts, without any of them becoming a second source of truth for
 * money. See migration 00117 for the full reasoning.
 *
 * This module is deliberately DB-free and asset-free: the PDF templates import
 * it, and a template that pulls in `services/*` drags `services/supabase.ts`
 * (and its `import.meta.env` / `window` access at module scope) into the Vercel
 * Node bundle, which 500s /api/render-invoice for every caller. See CLAUDE.md.
 */

import { formatQuantity } from './format'

/**
 * Piece weight formatter, to the FULL 3 decimals the column stores.
 *
 * Deliberately not `formatQuantity`, which caps at 2: a 2,345 kg piece printed
 * as "2,35 kg" turns the breakdown into a sum that does not work out — the
 * reader multiplies 12 x 2,35 = 28,20 and the line says 28,14. The breakdown is
 * only worth printing if it multiplies back to the kilos beside it.
 *
 * Built lazily so this module stays cheap to import from a PDF template.
 */
let weightFormatter: Intl.NumberFormat | null = null
function formatWeight(kg: number): string {
  if (!weightFormatter) {
    weightFormatter = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
  }
  return weightFormatter.format(kg)
}

/**
 * Decimals kept on the derived kilo figure. `order_items.quantity` is
 * NUMERIC(10,3) and the order form already rounds free-typed quantities to 3,
 * so the derived value uses the same precision and can never be silently
 * truncated by the column on insert.
 */
export const CATCH_WEIGHT_QTY_DECIMALS = 3

/** Minimal shape a catch-weight line needs. Matches OrderItem and the form's line. */
export interface CatchWeightParts {
  pieceCount?: number | null
  pieceWeightKg?: number | null
}

/**
 * The kilos a catch-weight line represents. Rounded ONCE here so the line total
 * is computed from the same figure that is stored and printed: rounding the
 * quantity at display time only would let an invoice show 244,999 kg beside a
 * total priced on 245.
 */
export function catchWeightQuantity(pieceCount: number, pieceWeightKg: number): number {
  const f = 10 ** CATCH_WEIGHT_QTY_DECIMALS
  return Math.round(pieceCount * pieceWeightKg * f) / f
}

/** True when both parts are present and usable. Either alone is not a catch-weight line. */
export function isCatchWeight(parts: CatchWeightParts | null | undefined): boolean {
  if (!parts) return false
  const { pieceCount, pieceWeightKg } = parts
  return typeof pieceCount === 'number' && pieceCount > 0
    && typeof pieceWeightKg === 'number' && pieceWeightKg > 0
}

/**
 * The "35 x 7 kg" sub-line shown under the quantity everywhere a line is
 * rendered. Symbols only, no prose, so it needs no locale key and reads the
 * same on a Dutch invoice, an English one and the driver's list.
 *
 * Returns null when the line is not catch-weight, so every call site can render
 * it unconditionally and get nothing for an ordinary line.
 */
export function formatPieceBreakdown(parts: CatchWeightParts | null | undefined): string | null {
  if (!isCatchWeight(parts)) return null
  return `${formatQuantity(parts!.pieceCount!)} x ${formatWeight(parts!.pieceWeightKg!)} kg`
}

/**
 * Read the two fields off a raw `order_items` row (or a portal RPC's JSON).
 * Postgres serialises NUMERIC as a string through PostgREST, so both are coerced
 * and anything unusable collapses to null rather than NaN.
 */
export function catchWeightPartsOf(row: {
  piece_count?: number | string | null
  piece_weight_kg?: number | string | null
}): CatchWeightParts {
  const num = (v: number | string | null | undefined): number | null => {
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return { pieceCount: num(row.piece_count), pieceWeightKg: num(row.piece_weight_kg) }
}
