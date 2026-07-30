/**
 * CSV Export Utilities
 *
 * Functions for exporting data to CSV format with proper handling of:
 * - Dutch/EU number formatting (comma decimal separator)
 * - Date formatting (DD-MM-YYYY)
 * - Currency (Euro cents to readable format)
 * - Special characters and escaping
 */

import { customerTypeLabel } from '../constants/customerType'
import { orderStatusLabelNl } from '../constants/orderStatus'

// Format date for export (DD-MM-YYYY)
export function formatExportDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Format datetime for export (DD-MM-YYYY HH:mm)
export function formatExportDateTime(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format cents to Euro string (e.g., 1234 -> "12,34")
export function formatExportCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

// Percentage with one decimal, Dutch separator (e.g., 23.456 -> "23,5%").
export function formatExportPercent(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || !Number.isFinite(Number(pct))) return ''
  return `${Number(pct).toFixed(1).replace('.', ',')}%`
}

/**
 * Column keys only the owner may export: cost of goods, profit, margin — and
 * customer-level revenue AGGREGATES.
 *
 * An exported file is durable and forwardable, so a slip here is worse than a
 * mis-rendered table cell. One central set means a new owner-only column cannot
 * be added to an export and then forgotten at a call site.
 *
 * `total_revenue` is the customer-products summary's per-product revenue, whose
 * footer total is the customer's lifetime revenue — the exact figure the
 * customer KPI cards withhold from a Shop Manager. It belongs here even though
 * it is not a cost.
 *
 * NOT here, deliberately: the Orders export's `subtotal` / `total`. A manager
 * processes orders and needs each order's amount; what is owner-only is the
 * aggregated view of what a CUSTOMER is worth, not the value of one order.
 */
export const OWNER_ONLY_EXPORT_KEYS = new Set([
  'cost_cents',
  'cost_effective',
  'cost_source',
  'total_cost',
  'profit',
  'total_profit',
  'margin_pct',
  'total_revenue',
])

/**
 * Strip every owner-only column. Call sites pass their column array through
 * this for non-owners:
 *
 *   columns={useMemo(() => (isOwner ? cols : withoutOwnerOnlyColumns(cols)), [isOwner])}
 *
 * Safe against stale localStorage prefs: ExportMenu derives its valid-key list
 * from the columns it is given, so a persisted 'profit' key is dropped, and the
 * empty-selection fallback also only ever selects from the passed columns.
 */
export function withoutOwnerOnlyColumns<C extends { key: unknown }>(cols: C[]): C[] {
  return cols.filter(c => !OWNER_ONLY_EXPORT_KEYS.has(String(c.key)))
}

// Unit labels shared by the product-shaped exports. UnitType is
// kg | piece | zak | doos — the old fallback collapsed zak AND doos to "pak".
export function formatExportUnit(v: unknown): string {
  if (v === 'kg') return 'kg'
  if (v === 'piece') return 'stuk'
  if (v === 'zak') return 'zak'
  if (v === 'doos') return 'doos'
  return typeof v === 'string' ? v : ''
}

// Margin % from a sell price and a cost, both in cents. Blank when either is
// missing or zero — a 0 cost means "unknown", not "100% margin" (same
// convention as resolveItemCostCents).
export function marginPct(priceCents?: number | null, costCents?: number | null): number | null {
  if (!priceCents || priceCents <= 0) return null
  if (!costCents || costCents <= 0) return null
  return ((priceCents - costCents) / priceCents) * 100
}

// Escape CSV value (handle commas, quotes, newlines)
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return ''

  const str = String(value)

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

// Shared column shape for the generic CSV/Excel/PDF exporters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericExportColumn<T = Record<string, any>> = {
  key: keyof T | string
  header: string
  format?: (value: unknown, row: T) => string
  /** When true, this column's raw numeric values are summed in the footer row. */
  summable?: boolean
}

// Build a "Totaal" footer row aligned to `columns`: sums every column flagged
// `summable` (raw numeric value, then run through the column's own `format` so
// the total matches the column formatting), labels the first non-summable
// column "Totaal", leaves the rest blank. Returns null when nothing is
// summable or there are no rows.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeTotalsRow<T extends Record<string, any>>(
  data: T[],
  columns: GenericExportColumn<T>[],
): string[] | null {
  if (data.length === 0 || !columns.some(c => c.summable)) return null
  let labelPlaced = false
  return columns.map(col => {
    if (col.summable) {
      const sum = data.reduce((acc, row) => {
        const raw = typeof col.key === 'string' && col.key.includes('.')
          ? getNestedValue(row, col.key as string)
          : row[col.key as keyof T]
        const n = Number(raw)
        return acc + (Number.isFinite(n) ? n : 0)
      }, 0)
      return col.format ? col.format(sum, undefined as unknown as T) : String(sum)
    }
    if (!labelPlaced) {
      labelPlaced = true
      return 'Totaal'
    }
    return ''
  })
}

// Convert array of objects to CSV string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCSV<T extends Record<string, any>>(
  data: T[],
  columns: GenericExportColumn<T>[]
): string {
  if (data.length === 0) return ''

  // Header row
  const headerRow = columns.map(col => escapeCSVValue(col.header)).join(',')

  // Data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = typeof col.key === 'string' && col.key.includes('.')
        ? getNestedValue(row, col.key as string)
        : row[col.key as keyof T]

      const formatted = col.format ? col.format(value, row) : value
      return escapeCSVValue(formatted)
    }).join(',')
  })

  // Optional totals row
  const totals = computeTotalsRow(data, columns)
  const footer = totals ? [totals.map(escapeCSVValue).join(',')] : []

  return [headerRow, ...dataRows, ...footer].join('\n')
}

// Get nested value from object (e.g., "customer.company_name")
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
  }, obj as unknown)
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

// Export helper - combines toCSV and downloadCSV
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: GenericExportColumn<T>[],
  filename: string
): void {
  const csv = toCSV(data, columns)
  downloadCSV(csv, filename)
}

// Export to styled Excel (.xlsx) - same column interface as exportToCSV
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportToExcelGeneric<T extends Record<string, any>>(
  data: T[],
  columns: GenericExportColumn<T>[],
  filename: string
): Promise<void> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Data')

  // Header row
  const headerRow = sheet.addRow(columns.map(c => c.header))
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' },
    }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
    cell.alignment = { vertical: 'middle' }
  })

  // Track column widths
  const colWidths = columns.map(c => c.header.length)

  // Data rows
  data.forEach((row, idx) => {
    const values = columns.map(col => {
      const value = typeof col.key === 'string' && (col.key as string).includes('.')
        ? getNestedValue(row, col.key as string)
        : row[col.key as keyof T]
      return col.format ? col.format(value, row) : (value ?? '')
    })

    const dataRow = sheet.addRow(values)
    const isEven = idx % 2 === 0

    dataRow.eachCell((cell, colNumber) => {
      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
      }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }

      const val = String(values[colNumber - 1])
      if (val.includes(',') && /\d/.test(val) && !val.includes('@')) {
        cell.alignment = { horizontal: 'right' }
      }

      if (val.length > colWidths[colNumber - 1]) {
        colWidths[colNumber - 1] = val.length
      }
    })
  })

  // Totals row (bold, top border) — only for exports with summable columns
  const totals = computeTotalsRow(data, columns)
  if (totals) {
    const totalRow = sheet.addRow(totals)
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true }
      cell.border = {
        top: { style: 'double' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
      const val = String(totals[colNumber - 1])
      if (val.includes(',') && /\d/.test(val) && !val.includes('@')) {
        cell.alignment = { horizontal: 'right' }
      }
      if (val.length > colWidths[colNumber - 1]) {
        colWidths[colNumber - 1] = val.length
      }
    })
  }

  // Auto-fit columns
  colWidths.forEach((width, i) => {
    sheet.getColumn(i + 1).width = Math.min(width + 4, 50)
  })

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const cleanName = filename.replace(/\.csv$/, '')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${cleanName}.xlsx`
  link.click()
  URL.revokeObjectURL(link.href)
}

// =====================================================
// Pre-configured export functions for common entities
// =====================================================

// Orders export columns
export const orderExportColumns = [
  { key: 'order_number', header: 'Ordernummer' },
  { key: 'invoice_number', header: 'Factuurnummer' },
  { key: 'order_date', header: 'Datum', format: (v: unknown) => formatExportDate(v as string) },
  { key: 'customer.company_name', header: 'Klant' },
  { key: 'customer.customer_type', header: 'Klanttype', format: (v: unknown) => customerTypeLabel(v as string) },
  { key: 'status', header: 'Status', format: (v: unknown) => orderStatusLabelNl(v as string) },
  { key: 'payment_method', header: 'Betaalmethode', format: (v: unknown) => {
    if (v === 'cash') return 'Contant'
    if (v === 'bank') return 'Bank'
    return ''
  }},
  { key: 'subtotal', header: 'Subtotaal', format: (v: unknown) => formatExportCurrency(v as number), summable: true },
  { key: 'tax_amount', header: 'BTW', format: (v: unknown) => formatExportCurrency(v as number), summable: true },
  { key: 'total', header: 'Totaal', format: (v: unknown) => formatExportCurrency(v as number), summable: true },
  // OWNER ONLY (OWNER_ONLY_EXPORT_KEYS). Attached to the rows by Orders.tsx via
  // computeOrderProfit — derived values must be real fields on the row or
  // computeTotalsRow, which reads row[key], sums 0.
  { key: 'total_cost', header: 'Inkoopwaarde', format: (v: unknown) => formatExportCurrency(v as number), summable: true },
  { key: 'profit', header: 'Winst', format: (v: unknown) => formatExportCurrency(v as number), summable: true },
  // Deliberately NOT summable: computeTotalsRow can only add, and a sum of
  // margins is meaningless. It renders blank in the "Totaal" row — expected.
  { key: 'margin_pct', header: 'Marge %', format: (v: unknown) => formatExportPercent(v as number) },
  { key: 'delivery_notes', header: 'Bezorgnotities' },
  { key: 'created_at', header: 'Aangemaakt', format: (v: unknown) => formatExportDateTime(v as string) },
]

// Products export columns
export const productExportColumns = [
  { key: 'name', header: 'Naam' },
  { key: 'sku', header: 'SKU' },
  { key: 'barcode', header: 'Barcode' },
  { key: 'unit_type', header: 'Eenheid', format: formatExportUnit },
  { key: 'base_price', header: 'Prijs', format: (v: unknown) => formatExportCurrency(v as number) },
  // OWNER ONLY (OWNER_ONLY_EXPORT_KEYS). cost_cents is already in the fetchProducts
  // payload; it was simply never exposed as a column.
  { key: 'cost_cents', header: 'Kostprijs', format: (v: unknown) => formatExportCurrency(v as number) },
  { key: 'margin_pct', header: 'Marge %', format: (_v: unknown, row: Record<string, unknown>) =>
    formatExportPercent(marginPct(row?.base_price as number, row?.cost_cents as number)) },
  { key: 'tax_rate', header: 'BTW %', format: (v: unknown) => v ? `${v}%` : '' },
  { key: 'stock_quantity', header: 'Voorraad' },
  { key: 'track_stock', header: 'Voorraad bijhouden', format: (v: unknown) => v ? 'Ja' : 'Nee' },
  { key: 'created_at', header: 'Aangemaakt', format: (v: unknown) => formatExportDateTime(v as string) },
]

// Customers export columns
export const customerExportColumns = [
  { key: 'company_name', header: 'Bedrijfsnaam' },
  { key: 'contact_person', header: 'Contactpersoon' },
  { key: 'email', header: 'E-mail' },
  { key: 'phone', header: 'Telefoon' },
  { key: 'vat_number', header: 'BTW-nummer' },
  { key: 'customer_type', header: 'Klanttype', format: (v: unknown) => customerTypeLabel(v as string) },
  { key: 'billing_street', header: 'Factuuradres straat' },
  { key: 'billing_postal_code', header: 'Factuuradres postcode' },
  { key: 'billing_city', header: 'Factuuradres plaats' },
  { key: 'billing_country', header: 'Factuuradres land' },
  { key: 'shipping_street', header: 'Bezorgadres straat' },
  { key: 'shipping_postal_code', header: 'Bezorgadres postcode' },
  { key: 'shipping_city', header: 'Bezorgadres plaats' },
  { key: 'shipping_country', header: 'Bezorgadres land' },
  { key: 'internal_notes', header: 'Notities' },
  { key: 'created_at', header: 'Aangemaakt', format: (v: unknown) => formatExportDateTime(v as string) },
  // OWNER ONLY (OWNER_ONLY_EXPORT_KEYS). Attached by Customers.tsx from the
  // server-gated get_customer_performance RPC, which returns NULL cost/profit
  // for non-owners — so unlike the other three exports this one is gated in the
  // RPC as well as the UI.
  //
  // "(totaal)" is in the header on purpose: these are ALL-TIME figures for the
  // customer, NOT scoped to the list's city/type/search filters, and the RPC
  // excludes draft orders — so they will not equal a hand-sum of the Orders list.
  { key: 'total_cost', header: 'Inkoopwaarde (totaal)', format: (v: unknown) => formatExportCurrency(v as number), summable: true },
  { key: 'total_profit', header: 'Winst (totaal)', format: (v: unknown) => formatExportCurrency(v as number), summable: true },
  { key: 'margin_pct', header: 'Marge %', format: (v: unknown) => formatExportPercent(v as number) },
]

// Price-list detail: one row per (product, unit_type).
// Cost columns are OWNER ONLY (OWNER_ONLY_EXPORT_KEYS) — the page itself is reachable
// by a shop manager, who sees prices but no cost.
export const priceListItemExportColumns = [
  { key: 'product_code',  header: 'Product ID' },
  { key: 'product_name',  header: 'Naam' },
  { key: 'unit_type',     header: 'Eenheid', format: formatExportUnit },
  { key: 'list_price',    header: 'Lijstprijs', format: (v: unknown) => formatExportCurrency(v as number) },
  { key: 'default_price', header: 'Standaardprijs', format: (v: unknown) => formatExportCurrency(v as number) },
  { key: 'price_source',  header: 'Prijs bron' },
  { key: 'tax_rate',      header: 'BTW %', format: (v: unknown) => v != null ? `${v}%` : '' },
  { key: 'cost_effective', header: 'Kostprijs', format: (v: unknown) => formatExportCurrency(v as number) },
  { key: 'cost_source',    header: 'Kostprijs bron' },
  { key: 'margin_pct',     header: 'Marge %', format: (v: unknown) => formatExportPercent(v as number) },
]

// Customer products summary (one row per (product, unit_type))
// Profit column is filtered out for non-owners at the call site.
export const customerItemsSummaryExportColumns = [
  { key: 'product_code',   header: 'Product ID' },
  { key: 'product_name',   header: 'Naam' },
  { key: 'unit_type',      header: 'Eenheid' },
  { key: 'total_quantity', header: 'Aantal', summable: true },
  { key: 'order_count',    header: 'Bestellingen', summable: true },
  { key: 'last_ordered',   header: 'Laatst besteld', format: (v: unknown) => formatExportDate(v as string) },
  { key: 'avg_unit_price', header: 'Gem. prijs',     format: (v: unknown) => formatExportCurrency(v as number) },
  { key: 'total_revenue',  header: 'Omzet',          format: (v: unknown) => formatExportCurrency(v as number), summable: true },
  { key: 'total_profit',   header: 'Winst',          format: (v: unknown) => formatExportCurrency(v as number), summable: true },
]

// Documents export columns
export const documentExportColumns = [
  { key: 'document_number', header: 'Documentnummer' },
  { key: 'document_type', header: 'Type', format: (v: unknown) => {
    const typeMap: Record<string, string> = {
      invoice: 'Factuur',
      proforma: 'Proforma',
      credit_note: 'Creditnota',
      packing_slip: 'Pakbon',
      order_confirmation: 'Orderbevestiging',
      payment_reminder: 'Betalingsherinnering',
    }
    return typeMap[v as string] || (v as string)
  }},
  { key: 'customer_name', header: 'Klant' },
  { key: 'order_number', header: 'Bestelnummer' },
  { key: 'generated_at', header: 'Datum', format: (v: unknown) => formatExportDateTime(v as string) },
]

// Audit log export columns
export const auditLogExportColumns = [
  { key: 'created_at', header: 'Datum/tijd', format: (v: unknown) => formatExportDateTime(v as string) },
  { key: 'user_email', header: 'Gebruiker' },
  { key: 'action', header: 'Actie', format: (v: unknown) => {
    const actionMap: Record<string, string> = {
      create: 'Aangemaakt',
      update: 'Gewijzigd',
      delete: 'Verwijderd',
    }
    return actionMap[v as string] || (v as string)
  }},
  { key: 'entity_type', header: 'Type' },
  { key: 'entity_id', header: 'ID' },
]
