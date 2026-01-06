// Format price from cents to Euro currency string
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

// Format date to Dutch format (DD-MM-YYYY)
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Format datetime to Dutch format (DD-MM-YYYY HH:mm)
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format date for display (e.g., "15 jan 2024")
export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format quantity with smart decimal handling
 * - Integers shown without decimals (5 not 5.000)
 * - Decimals trimmed to remove trailing zeros (1.5 not 1.500)
 * - Max 3 decimal places
 */
export function formatQuantity(qty: number): string {
  // Round to 3 decimal places to avoid floating point issues
  const rounded = Math.round(qty * 1000) / 1000

  // If it's a whole number, return without decimals
  if (Number.isInteger(rounded)) {
    return rounded.toString()
  }

  // Otherwise, format with up to 3 decimals, removing trailing zeros
  return rounded.toFixed(3).replace(/\.?0+$/, '')
}

/**
 * Format quantity with unit type for display
 * @param qty - The quantity
 * @param unitType - 'kg', 'piece', 'zak', or 'doos'
 * @param t - Translation function (optional, for translated unit labels)
 */
export function formatQuantityWithUnit(
  qty: number,
  unitType: string,
  t?: (key: string) => string
): string {
  const formattedQty = formatQuantity(qty)

  if (unitType === 'kg') {
    return `${formattedQty} kg`
  }

  // For pieces, zak, and doos, use singular/plural forms
  if (t) {
    if (unitType === 'piece') {
      return qty === 1
        ? `${formattedQty} ${t('products.units.pieceSingular')}`
        : `${formattedQty} ${t('products.units.piecePlural')}`
    }
    if (unitType === 'zak') {
      return qty === 1
        ? `${formattedQty} ${t('products.units.zakSingular')}`
        : `${formattedQty} ${t('products.units.zakPlural')}`
    }
    if (unitType === 'doos') {
      return qty === 1
        ? `${formattedQty} ${t('products.units.doosSingular')}`
        : `${formattedQty} ${t('products.units.doosPlural')}`
    }
  }

  // Fallback without translation (Dutch)
  if (unitType === 'piece') {
    return qty === 1 ? `${formattedQty} stuk` : `${formattedQty} stuks`
  }
  if (unitType === 'zak') {
    return qty === 1 ? `${formattedQty} zak` : `${formattedQty} zakken`
  }
  if (unitType === 'doos') {
    return qty === 1 ? `${formattedQty} doos` : `${formattedQty} dozen`
  }

  return `${formattedQty} ${unitType}`
}
