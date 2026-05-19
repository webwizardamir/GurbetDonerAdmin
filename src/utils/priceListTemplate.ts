/**
 * Price-list Excel template — single source of truth for the column spec.
 *
 * Used by:
 *   - `downloadPriceListTemplate()` to produce the template (blank or with
 *     existing items)
 *   - `PriceListImport.tsx` to validate uploaded files
 *
 * Mirrors the product-template pattern in `productTemplate.ts`.
 */

import type { PriceListItemWithProduct } from '../services/priceLists'
import type { UnitType } from '../types'

export type PriceListColumnKey =
  | 'ProductID'
  | 'ProductNaam'
  | 'Eenheid'
  | 'Prijs'
  | 'BtwPercent'

export interface PriceListTemplateColumn {
  key: PriceListColumnKey
  header: string
  required: boolean
  comment: string
}

export const PRICE_LIST_TEMPLATE_COLUMNS: readonly PriceListTemplateColumn[] = [
  { key: 'ProductID',   header: 'Product ID',     required: true,  comment: 'Bestaand product (MHF-NNNNN). Onbekende ID = rij wordt overgeslagen.' },
  { key: 'ProductNaam', header: 'Productnaam',    required: false, comment: 'Alleen ter referentie — wordt niet gebruikt voor matching. Mag leeg blijven.' },
  { key: 'Eenheid',     header: 'Eenheid',        required: true,  comment: 'kg, piece, zak of doos.' },
  { key: 'Prijs',       header: 'Prijs (€)',      required: true,  comment: 'Verkoopprijs in euro voor deze (product, eenheid) op deze lijst.' },
  { key: 'BtwPercent',  header: 'BTW % (optioneel)', required: false, comment: '0, 9 of 21. Leeg laten = BTW van het product gebruiken.' },
] as const

export const PRICE_LIST_HEADERS = PRICE_LIST_TEMPLATE_COLUMNS.map(c => c.header)
export const UNIT_TYPE_VALUES: UnitType[] = ['kg', 'piece', 'zak', 'doos']
export const VALID_TAX_RATES = [0, 9, 21]

function itemToRow(it: PriceListItemWithProduct): Partial<Record<PriceListColumnKey, string | number>> {
  return {
    ProductID:   it.product?.product_code ?? '',
    ProductNaam: it.product?.name ?? '',
    Eenheid:     it.unit_type,
    Prijs:       Number((it.price_cents / 100).toFixed(2)),
    BtwPercent:  it.tax_rate ?? '',
  }
}

export interface DownloadPriceListTemplateOptions {
  listName?: string
  existingItems?: PriceListItemWithProduct[]
}

export async function downloadPriceListTemplate(opts: DownloadPriceListTemplateOptions = {}): Promise<void> {
  const existing = opts.existingItems ?? []
  const withData = existing.length > 0

  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Prijslijst', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  const cols = PRICE_LIST_TEMPLATE_COLUMNS

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
    for (const it of existing) {
      const data = itemToRow(it)
      sheet.addRow(cols.map(c => data[c.key] ?? ''))
    }
  } else {
    // Sample row
    const sample: Partial<Record<PriceListColumnKey, string | number>> = {
      ProductID: 'MHF-00001',
      ProductNaam: 'Voorbeeld product',
      Eenheid: 'kg',
      Prijs: 8.5,
      BtwPercent: 9,
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

  // Data validation on Eenheid column — extend past last row for appended entries.
  const validationLastRow = Math.max(1000, existing.length + 200)
  const unitColIdx = cols.findIndex(c => c.key === 'Eenheid') + 1
  if (unitColIdx > 0) {
    for (let r = 2; r <= validationLastRow; r++) {
      sheet.getCell(r, unitColIdx).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"kg,piece,zak,doos"'],
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  const dateStr = new Date().toISOString().split('T')[0]
  const safeName = (opts.listName ?? 'price-list').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  link.download = withData
    ? `${safeName}-${dateStr}.xlsx`
    : 'price-list-template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
