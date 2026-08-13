/**
 * Calendar-date primitives pinned to Europe/Amsterdam.
 *
 * Why this exists: the codebase reached for `new Date().toISOString().split('T')[0]`
 * to get "today". `toISOString()` is UTC, and Amsterdam is UTC+1/+2, so between
 * midnight and 01:00 (winter) or 02:00 (summer) local time that returns
 * YESTERDAY's date. Sold Products drives day-close and route planning, which are
 * used at exactly those hours, so "Vandaag" silently showed the previous day.
 *
 * `Intl.DateTimeFormat('en-CA', { timeZone })` is the only zero-dependency way to
 * get a genuinely Amsterdam-pinned calendar date; 'en-CA' formats as YYYY-MM-DD.
 * Using the browser's local timezone instead would be right in practice but wrong
 * on a machine set to UTC.
 *
 * All functions take and return `YYYY-MM-DD` strings. Arithmetic is done at local
 * noon so a DST transition (a ±1h shift) can never roll a date over.
 */

const AMSTERDAM = 'Europe/Amsterdam'

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AMSTERDAM,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's calendar date in Amsterdam, as YYYY-MM-DD. */
export function ymdInAms(d: Date = new Date()): string {
  return ymdFormatter.format(d)
}

/** Parse YYYY-MM-DD to a Date at local noon — DST-safe for day arithmetic. */
function at(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`)
}

function out(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addDays(ymd: string, n: number): string {
  const d = at(ymd)
  d.setDate(d.getDate() + n)
  return out(d)
}

/**
 * Shift by whole months. Postgres-style clamping: 31 March minus one month is
 * 28/29 February, never 2 or 3 March (which is what `setMonth` alone gives).
 */
export function addMonths(ymd: string, n: number): string {
  const d = at(ymd)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return out(d)
}

/** Monday of the ISO week containing `ymd`. Weeks start Monday (NL convention). */
export function mondayOf(ymd: string): string {
  const dow = at(ymd).getDay() // 0 = Sunday
  return addDays(ymd, -(dow === 0 ? 6 : dow - 1))
}

export function firstOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`
}

export function lastOfMonth(ymd: string): string {
  const d = at(ymd)
  // Day 0 of the next month is the last day of this one.
  return out(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
