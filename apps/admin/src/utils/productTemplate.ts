/**
 * Product Excel template — single source of truth for the column spec.
 *
 * Used by:
 *   - `downloadProductTemplate()` to produce the blank template
 *   - `ProductImport.tsx` to validate uploaded files
 *   - `productExportColumns` in `export.ts` so an exported sheet is re-importable
 */

import type { Product, UnitType } from '../types'

export type TemplateColumnKey =
  | 'ID'
  | 'Naam'
  | 'SKU'
  | 'Barcode'
  | 'StandaardEenheid'
  | 'PrijsKg'
  | 'PrijsStuk'
  | 'PrijsZak'
  | 'PrijsDoos'
  | 'Kostprijs'
  | 'BtwPercent'
  | 'Voorraad'
  | 'VoorraadBijhouden'
  | 'Beschrijving'

export interface TemplateColumn {
  key: TemplateColumnKey
  header: string
  required: boolean
  ownerOnly?: boolean
  comment: string
}

export const PRODUCT_TEMPLATE_COLUMNS: readonly TemplateColumn[] = [
  { key: 'ID',                header: 'ID',                  required: false, comment: 'Product ID (MHF-NNNNN). Leeg laten = nieuw product met auto-ID. Bestaande ID = bijwerken.' },
  { key: 'Naam',              header: 'Naam',                required: true,  comment: 'Productnaam (verplicht).' },
  { key: 'SKU',               header: 'SKU',                 required: false, comment: 'Eigen SKU / artikelnummer (optioneel, uniek).' },
  { key: 'Barcode',           header: 'Barcode',             required: false, comment: 'EAN / UPC barcode (optioneel, uniek).' },
  { key: 'StandaardEenheid',  header: 'Standaard eenheid',   required: true,  comment: 'kg, piece, zak of doos.' },
  { key: 'PrijsKg',           header: 'Prijs per kg (€)',    required: false, comment: 'Verkoopprijs per kg, alleen invullen indien van toepassing.' },
  { key: 'PrijsStuk',         header: 'Prijs per stuk (€)',  required: false, comment: 'Verkoopprijs per stuk.' },
  { key: 'PrijsZak',          header: 'Prijs per zak (€)',   required: false, comment: 'Verkoopprijs per zak.' },
  { key: 'PrijsDoos',         header: 'Prijs per doos (€)',  required: false, comment: 'Verkoopprijs per doos.' },
  { key: 'Kostprijs',         header: 'Kostprijs (€)',       required: false, ownerOnly: true, comment: 'Inkoopprijs (alleen eigenaar).' },
  { key: 'BtwPercent',        header: 'BTW %',               required: false, comment: '0, 9 of 21 (standaard 9).' },
  { key: 'Voorraad',          header: 'Voorraad',            required: false, comment: 'Huidige voorraad (standaard 0).' },
  { key: 'VoorraadBijhouden', header: 'Voorraad bijhouden',  required: false, comment: 'Ja of Nee (standaard Ja).' },
  { key: 'Beschrijving',      header: 'Beschrijving',        required: false, comment: 'Korte productomschrijving.' },
] as const

export const TEMPLATE_HEADERS = PRODUCT_TEMPLATE_COLUMNS.map(c => c.header)

export const UNIT_TYPE_VALUES: UnitType[] = ['kg', 'piece', 'zak', 'doos']
export const VALID_TAX_RATES = [0, 9, 21]

/** Map a Product to a row keyed by template column key. */
function productToTemplateRow(
  p: Product,
  overlay?: PriceOverlay,
): Partial<Record<TemplateColumnKey, string | number>> {
  const priceByUnit = new Map<UnitType, number>()
  if (overlay) {
    // Price-list mode — prices come from overlay only; absent products = blank.
    const fromList = overlay.prices.get(p.id)
    if (fromList) {
      for (const [unit, cents] of fromList) priceByUnit.set(unit, cents)
    }
  } else {
    for (const u of p.unit_prices ?? []) {
      if (typeof u.price === 'number') {
        priceByUnit.set(u.unit_type as UnitType, u.price)   // cents
      }
    }
    // `base_price` on the products row is the canonical price for the default
    // unit_type. Many legacy rows only have base_price and no product_unit_prices
    // entries, so without this fallback their export columns would be blank.
    const defaultUnit = p.unit_type as UnitType
    if (!priceByUnit.has(defaultUnit) && typeof p.base_price === 'number' && p.base_price > 0) {
      priceByUnit.set(defaultUnit, p.base_price)
    }
  }
  const eur = (cents: number | null | undefined): number | '' =>
    typeof cents === 'number' ? Number((cents / 100).toFixed(2)) : ''
  const taxValue: number | '' = overlay
    ? (overlay.tax.get(p.id) ?? '')
    : p.tax_rate
  return {
    ID: p.product_code ?? '',
    Naam: p.name,
    SKU: p.sku ?? '',
    Barcode: p.barcode ?? '',
    StandaardEenheid: p.unit_type,
    PrijsKg: eur(priceByUnit.get('kg')),
    PrijsStuk: eur(priceByUnit.get('piece')),
    PrijsZak: eur(priceByUnit.get('zak')),
    PrijsDoos: eur(priceByUnit.get('doos')),
    Kostprijs: overlay ? '' : eur(p.cost_cents),
    BtwPercent: taxValue,
    Voorraad: overlay ? '' : p.stock_quantity,
    VoorraadBijhouden: overlay ? '' : (p.track_stock ? 'Ja' : 'Nee'),
    Beschrijving: p.description ?? '',
  }
}

export interface PriceOverlay {
  /** product_id → unit_type → price in cents. Replaces the product's natural prices. */
  prices: Map<string, Map<UnitType, number>>
  /** product_id → tax_rate. Replaces the product's natural tax_rate. */
  tax: Map<string, number>
  /** Filename override (e.g. "italy-2026-2026-05-19.xlsx"). */
  filename: string
}

export interface DownloadTemplateOptions {
  includeOwnerColumns?: boolean
  /** If provided (and non-empty), the template is filled with one row per product instead of a single sample row. */
  existingProducts?: Product[]
  /**
   * Price-list mode: replace each product's prices with overlay values.
   * Products absent from the overlay maps get blank price/tax cells, signaling
   * "not on this list yet — fill in to add". Used by the Price Lists detail
   * page so the same product template doubles as the price-list template.
   */
  priceOverlay?: PriceOverlay
}

/**
 * Build and download a product Excel template (.xlsx).
 * Includes frozen header, branded styling, cell comments, and data
 * validation lists on the enum columns. When `existingProducts` is
 * provided, one row per product is emitted (bulk-edit mode). Otherwise
 * a single sample row is emitted (blank-template mode).
 */
export async function downloadProductTemplate(
  optsOrIncludeOwner: boolean | DownloadTemplateOptions = true,
): Promise<void> {
  const opts: DownloadTemplateOptions = typeof optsOrIncludeOwner === 'boolean'
    ? { includeOwnerColumns: optsOrIncludeOwner }
    : optsOrIncludeOwner
  const includeOwnerColumns = opts.includeOwnerColumns ?? true
  const existing = opts.existingProducts ?? []
  const overlay = opts.priceOverlay
  const withData = existing.length > 0

  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Producten', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Filter columns based on owner permission
  const cols = PRODUCT_TEMPLATE_COLUMNS.filter(c => includeOwnerColumns || !c.ownerOnly)

  // Header row
  const headerRow = sheet.addRow(cols.map(c => c.header))
  headerRow.eachCell((cell, colNumber) => {
    const col = cols[colNumber - 1]
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: col.required ? 'FF166534' : 'FF16A34A' },
    }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.note = {
      texts: [{ text: col.comment }],
      margins: { insetmode: 'auto' },
    }
  })
  headerRow.height = 22

  if (withData) {
    // One row per existing product — re-import-safe for bulk edits.
    for (const p of existing) {
      const data = productToTemplateRow(p, overlay)
      sheet.addRow(cols.map(c => data[c.key] ?? ''))
    }
  } else {
    // Single illustrative sample row — delete before importing.
    const sample: Partial<Record<TemplateColumnKey, string | number>> = {
      ID: '',
      Naam: 'Voorbeeld product',
      SKU: '',
      Barcode: '',
      StandaardEenheid: 'kg',
      PrijsKg: 8.5,
      PrijsStuk: '',
      PrijsZak: '',
      PrijsDoos: '',
      Kostprijs: 5,
      BtwPercent: 9,
      Voorraad: 0,
      VoorraadBijhouden: 'Ja',
      Beschrijving: 'Voorbeeld omschrijving',
    }
    const sampleRow = sheet.addRow(cols.map(c => sample[c.key] ?? ''))
    sampleRow.eachCell(cell => {
      cell.font = { italic: true, color: { argb: 'FF94A3B8' } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
    })
  }

  // Column widths
  cols.forEach((c, i) => {
    sheet.getColumn(i + 1).width = Math.max(c.header.length + 4, 14)
  })

  // Data validation on enum columns — extend at least 200 rows past the
  // last data row so admins can append new products with the dropdowns intact.
  const validationLastRow = Math.max(1000, existing.length + 200)
  const unitColIdx = cols.findIndex(c => c.key === 'StandaardEenheid') + 1
  const trackColIdx = cols.findIndex(c => c.key === 'VoorraadBijhouden') + 1
  if (unitColIdx > 0) {
    for (let r = 2; r <= validationLastRow; r++) {
      sheet.getCell(r, unitColIdx).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"kg,piece,zak,doos"'],
      }
    }
  }
  if (trackColIdx > 0) {
    for (let r = 2; r <= validationLastRow; r++) {
      sheet.getCell(r, trackColIdx).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Ja,Nee"'],
      }
    }
  }

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  const dateStr = new Date().toISOString().split('T')[0]
  link.download = overlay
    ? overlay.filename
    : (withData ? `products-${dateStr}.xlsx` : 'product-template.xlsx')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
