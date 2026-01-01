/**
 * CSV Export Utilities
 *
 * Functions for exporting data to CSV format with proper handling of:
 * - Dutch/EU number formatting (comma decimal separator)
 * - Date formatting (DD-MM-YYYY)
 * - Currency (Euro cents to readable format)
 * - Special characters and escaping
 */

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

// Convert array of objects to CSV string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCSV<T extends Record<string, any>>(
  data: T[],
  columns: Array<{
    key: keyof T | string
    header: string
    format?: (value: unknown, row: T) => string
  }>
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

  return [headerRow, ...dataRows].join('\n')
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
  columns: Array<{
    key: keyof T | string
    header: string
    format?: (value: unknown, row: T) => string
  }>,
  filename: string
): void {
  const csv = toCSV(data, columns)
  downloadCSV(csv, filename)
}

// =====================================================
// Pre-configured export functions for common entities
// =====================================================

// Orders export columns
export const orderExportColumns = [
  { key: 'order_number', header: 'Ordernummer' },
  { key: 'order_date', header: 'Datum', format: (v: unknown) => formatExportDate(v as string) },
  { key: 'customer.company_name', header: 'Klant' },
  { key: 'status', header: 'Status', format: (v: unknown) => {
    const statusMap: Record<string, string> = {
      draft: 'Concept',
      pending_payment: 'In afwachting',
      completed: 'Voltooid',
      cancelled: 'Geannuleerd',
      refunded: 'Terugbetaald',
    }
    return statusMap[v as string] || (v as string)
  }},
  { key: 'payment_method', header: 'Betaalmethode', format: (v: unknown) => {
    if (v === 'cash') return 'Contant'
    if (v === 'bank') return 'Bank'
    return ''
  }},
  { key: 'subtotal', header: 'Subtotaal', format: (v: unknown) => formatExportCurrency(v as number) },
  { key: 'tax_amount', header: 'BTW', format: (v: unknown) => formatExportCurrency(v as number) },
  { key: 'total', header: 'Totaal', format: (v: unknown) => formatExportCurrency(v as number) },
  { key: 'delivery_notes', header: 'Bezorgnotities' },
  { key: 'created_at', header: 'Aangemaakt', format: (v: unknown) => formatExportDateTime(v as string) },
]

// Products export columns
export const productExportColumns = [
  { key: 'name', header: 'Naam' },
  { key: 'sku', header: 'SKU' },
  { key: 'barcode', header: 'Barcode' },
  { key: 'category.name', header: 'Categorie' },
  { key: 'unit_type', header: 'Eenheid', format: (v: unknown) => {
    if (v === 'kg') return 'kg'
    if (v === 'piece') return 'stuk'
    return 'pak'
  }},
  { key: 'base_price', header: 'Prijs', format: (v: unknown) => formatExportCurrency(v as number) },
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
