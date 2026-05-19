/**
 * Product Excel template — single source of truth for the column spec.
 *
 * Used by:
 *   - `downloadProductTemplate()` to produce the blank template
 *   - `ProductImport.tsx` to validate uploaded files
 *   - `productExportColumns` in `export.ts` so an exported sheet is re-importable
 */

import type { UnitType } from '../types'

export type TemplateColumnKey =
  | 'ID'
  | 'Naam'
  | 'Categorie'
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
  { key: 'Categorie',         header: 'Categorie',           required: true,  comment: 'Naam moet exact overeenkomen met een bestaande categorie.' },
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

/**
 * Build and download a blank product template (.xlsx).
 * Includes one sample row, frozen header, branded styling, cell comments,
 * and data validation lists on the enum columns.
 */
export async function downloadProductTemplate(includeOwnerColumns: boolean = true): Promise<void> {
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

  // Sample row — illustrative, admins are expected to delete it before importing.
  const sample: Partial<Record<TemplateColumnKey, string | number>> = {
    ID: '',
    Naam: 'Voorbeeld product',
    Categorie: 'Vlees',
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

  // Column widths
  cols.forEach((c, i) => {
    sheet.getColumn(i + 1).width = Math.max(c.header.length + 4, 14)
  })

  // Data validation on enum columns (apply to rows 2..1000)
  const unitColIdx = cols.findIndex(c => c.key === 'StandaardEenheid') + 1
  const trackColIdx = cols.findIndex(c => c.key === 'VoorraadBijhouden') + 1
  if (unitColIdx > 0) {
    for (let r = 2; r <= 1000; r++) {
      sheet.getCell(r, unitColIdx).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"kg,piece,zak,doos"'],
      }
    }
  }
  if (trackColIdx > 0) {
    for (let r = 2; r <= 1000; r++) {
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
  link.download = 'product-template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
