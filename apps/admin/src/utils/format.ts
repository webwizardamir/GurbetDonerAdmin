// Cached Intl formatters (constructing these per call is measurable on
// large tables/exports — module-scope reuse keeps the cost flat).
const eurFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateShortFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dayMonthFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: '2-digit',
})

const timeShortFormatter = new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  minute: '2-digit',
})

const countFormatter = new Intl.NumberFormat('nl-NL', {
  maximumFractionDigits: 0,
})

const percentCache = new Map<number, Intl.NumberFormat>()
const decimalCache = new Map<number, Intl.NumberFormat>()

function getPercentFormatter(decimals: number): Intl.NumberFormat {
  let f = percentCache.get(decimals)
  if (!f) {
    f = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    percentCache.set(decimals, f)
  }
  return f
}

function getDecimalFormatter(decimals: number): Intl.NumberFormat {
  let f = decimalCache.get(decimals)
  if (!f) {
    f = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    decimalCache.set(decimals, f)
  }
  return f
}

// Format price from cents to Euro currency string (always 2 decimals, nl-NL).
export function formatPrice(cents: number): string {
  return eurFormatter.format(cents / 100)
}

// Compact currency for chart axes: €1,2K / €2,3M / €500. Never use in tables.
export function formatCompactPrice(cents: number): string {
  const euros = cents / 100
  const abs = Math.abs(euros)
  if (abs >= 1_000_000) return `€${getDecimalFormatter(1).format(euros / 1_000_000)}M`
  if (abs >= 1_000) return `€${getDecimalFormatter(1).format(euros / 1_000)}K`
  return formatPrice(cents)
}

// Format date to Dutch format (DD-MM-YYYY)
export function formatDate(dateString: string): string {
  return dateFormatter.format(new Date(dateString))
}

// Format datetime to Dutch format (DD-MM-YYYY HH:mm)
export function formatDateTime(dateString: string): string {
  return dateTimeFormatter.format(new Date(dateString))
}

// Format date for display (e.g., "15 jan 2024")
export function formatDateShort(dateString: string): string {
  return dateShortFormatter.format(new Date(dateString))
}

const relativeFormatterCache = new Map<string, Intl.RelativeTimeFormat>()

function getRelativeFormatter(locale: string): Intl.RelativeTimeFormat {
  let f = relativeFormatterCache.get(locale)
  if (!f) {
    f = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    relativeFormatterCache.set(locale, f)
  }
  return f
}

// Relative time from now (e.g. "2 uur geleden" / "2 hours ago"). Locale-aware;
// pass 'nl' or 'en'. Falls back to a short date for anything older than a week.
export function formatRelativeTime(dateString: string, locale = 'nl'): string {
  const then = new Date(dateString).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = then - Date.now()
  const absSec = Math.abs(diffMs) / 1000
  const rtf = getRelativeFormatter(locale)
  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), 'second')
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60000), 'minute')
  if (absSec < 86400) return rtf.format(Math.round(diffMs / 3600000), 'hour')
  if (absSec < 604800) return rtf.format(Math.round(diffMs / 86400000), 'day')
  // Older than a week → absolute short date reads better than "3 weeks ago".
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(dateString))
}

// Year-less day/month for dense columns (e.g. "27-06"). Full date lives in a title/tooltip.
export function formatDayMonth(dateString: string): string {
  return dayMonthFormatter.format(new Date(dateString))
}

// Local time only (e.g. "14:32").
export function formatTimeShort(dateString: string): string {
  return timeShortFormatter.format(new Date(dateString))
}

// Integer count with thousand separator (e.g., "1.234").
export function formatCount(n: number): string {
  return countFormatter.format(Math.round(n))
}

// Percentage with `%` suffix and Dutch decimal comma (e.g., "12,5%").
export function formatPercent(value: number, decimals = 1): string {
  return `${getPercentFormatter(decimals).format(value)}%`
}

// Signed percentage for trend indicators (e.g., "+12,5%", "-3,2%").
export function formatPercentChange(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${getPercentFormatter(decimals).format(value)}%`
}

// Generic ratio formatter (e.g., "1,25"). Used for turnover ratios etc.
export function formatRatio(value: number, decimals = 2): string {
  return getDecimalFormatter(decimals).format(value)
}

// Tailwind text-color classes for a profit/margin figure: emerald when
// positive/zero, red when negative. Single source for the convention used
// across orders, customer detail and analytics.
export function profitClass(n: number): string {
  return n >= 0
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-red-700 dark:text-red-400'
}

/**
 * Format a quantity with smart decimal handling.
 * - Integers shown without decimals (5 not 5,00)
 * - Trailing zeros stripped (1,5 not 1,50)
 * - Max 2 decimal places (was 3 — tightened to keep tables consistent)
 */
export function formatQuantity(qty: number): string {
  const rounded = Math.round(qty * 100) / 100
  if (Number.isInteger(rounded)) {
    return countFormatter.format(rounded)
  }
  // Format with up to 2 decimals via Dutch locale (comma separator), strip trailing zeros.
  return getDecimalFormatter(2)
    .format(rounded)
    .replace(/,?0+$/, '')
}

// Quantity in kg with unit suffix.
export function formatQuantityKg(qty: number): string {
  return `${formatQuantity(qty)} kg`
}

/**
 * Format quantity with unit type for display.
 * @param qty - The quantity
 * @param unitType - 'kg', 'piece', 'zak', or 'doos'
 * @param t - Translation function (optional, for translated unit labels)
 */
export function formatQuantityWithUnit(
  qty: number,
  unitType: string,
  t?: (key: string) => string
): string {
  // Non-kg units are integers — round before formatting so "1 stuks" never shows a decimal.
  const isKg = unitType === 'kg'
  const display = isKg ? formatQuantity(qty) : countFormatter.format(Math.round(qty))
  const intQty = Math.round(qty)

  if (isKg) {
    return `${display} kg`
  }

  if (t) {
    if (unitType === 'piece') {
      return intQty === 1
        ? `${display} ${t('products.units.pieceSingular')}`
        : `${display} ${t('products.units.piecePlural')}`
    }
    if (unitType === 'zak') {
      return intQty === 1
        ? `${display} ${t('products.units.zakSingular')}`
        : `${display} ${t('products.units.zakPlural')}`
    }
    if (unitType === 'doos') {
      return intQty === 1
        ? `${display} ${t('products.units.doosSingular')}`
        : `${display} ${t('products.units.doosPlural')}`
    }
  }

  if (unitType === 'piece') {
    return intQty === 1 ? `${display} stuk` : `${display} stuks`
  }
  if (unitType === 'zak') {
    return intQty === 1 ? `${display} zak` : `${display} zakken`
  }
  if (unitType === 'doos') {
    return intQty === 1 ? `${display} doos` : `${display} dozen`
  }

  return `${display} ${unitType}`
}
