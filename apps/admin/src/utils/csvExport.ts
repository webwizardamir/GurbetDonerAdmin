// CSV Export utility for Dutch Excel compatibility
// Uses semicolon delimiter (Dutch Excel default) and UTF-8 BOM for correct € encoding

interface CsvColumn<T> {
  header: string
  accessor: (row: T, index: number) => string | number
}

export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
): void {
  const BOM = '\uFEFF'
  const delimiter = ';'

  // Header row
  const headerRow = columns.map(c => escapeCsvValue(c.header)).join(delimiter)

  // Data rows
  const dataRows = data.map((row, idx) =>
    columns.map(c => escapeCsvValue(String(c.accessor(row, idx)))).join(delimiter)
  )

  const csvContent = BOM + [headerRow, ...dataRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function escapeCsvValue(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// Format cents as Dutch currency string for CSV (e.g., "1234,56")
export function formatCentsToCsvCurrency(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

// Format percentage for CSV (e.g., "35,4%")
export function formatCsvPercentage(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`
}
