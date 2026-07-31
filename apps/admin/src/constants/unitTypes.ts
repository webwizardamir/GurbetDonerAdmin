// Product unit types: kg | piece | zak | doos.
//
// Centralized for the same reason as customerType.ts / orderStatus.ts — the set
// was previously re-declared at four sites with three different label sources,
// which is how the Products export ended up shipping only the DEFAULT unit while
// the price-list export shipped every unit as its own row.
//
// Two label families on purpose:
//   - unitTypeExportLabel  → Dutch literals for exported files (kg/stuk/zak/doos),
//     matching the rest of the export layer, whose headers are Dutch by convention.
//   - unitTypeUiLabel      → translated, via the `products.form.unitTypes.*` keys
//     the price-list pills and the product forms already use.

import type { UnitType } from '../types'

/**
 * Canonical order for anything that ENUMERATES unit types: filters, per-unit
 * export columns, the wide price-list row. Matches the column order of the
 * importable Excel template (Prijs per kg / stuk / zak / doos) so a wide export
 * and the template read the same left-to-right.
 *
 * NOTE: `components/products/ProductForm.tsx` keeps its own ALL_UNIT_TYPES in a
 * DIFFERENT order on purpose — there the array picks the fallback default unit,
 * so its order is behavioural, not cosmetic. Do not collapse it onto this one.
 */
export const UNIT_TYPES: readonly UnitType[] = ['kg', 'piece', 'zak', 'doos'] as const

export function isUnitType(v: unknown): v is UnitType {
  return typeof v === 'string' && (UNIT_TYPES as readonly string[]).includes(v)
}

/** Dutch labels for EXPORTED files. */
export const UNIT_TYPE_EXPORT_LABELS: Record<UnitType, string> = {
  kg: 'kg',
  piece: 'stuk',
  zak: 'zak',
  doos: 'doos',
}

/**
 * Export label. Falls through to the raw string for an unexpected value (an RPC
 * can return a unit this build doesn't know about) and to '' for a non-string.
 */
export function unitTypeExportLabel(v: unknown): string {
  if (isUnitType(v)) return UNIT_TYPE_EXPORT_LABELS[v]
  return typeof v === 'string' ? v : ''
}

/**
 * Translated label for on-screen use. `t` is taken as a parameter rather than
 * imported so this module stays a plain constants file with no i18next
 * dependency (and can be used from non-component code).
 */
export function unitTypeUiLabel(v: unknown, t: (key: string) => string): string {
  if (isUnitType(v)) return t(`products.form.unitTypes.${v}`)
  return typeof v === 'string' ? v : ''
}
