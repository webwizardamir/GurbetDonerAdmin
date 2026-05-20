import { useCallback, useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'

/** Comparator that handles strings (locale-aware), numbers, nulls, and booleans. */
function compareValues(a: unknown, b: unknown): number {
  // Nulls/undefined sort last
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)

  // Dates: ISO-string locale compare works (YYYY-MM-DDTHH:MM:SS sorts correctly as string)
  const sa = String(a)
  const sb = String(b)
  return sa.localeCompare(sb, 'nl-NL', { numeric: true, sensitivity: 'base' })
}

/**
 * Shared sort state for any data table. The accessors object passed to
 * `sortBy` maps each sortable key to a getter — the hook handles the
 * `asc`/`desc`/click-cycle logic itself.
 *
 * Usage:
 *   const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<'name' | 'date'>('date', 'desc')
 *   const sorted = useMemo(() => sortBy(rows, {
 *     name: r => r.name,
 *     date: r => r.created_at,
 *   }), [rows, sortKey, sortDir])
 */
export function useTableSort<K extends string>(
  defaultKey: K | null,
  defaultDir: SortDir = 'asc',
) {
  const [sortKey, setSortKey] = useState<K | null>(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  /** Click handler: same key flips direction; new key resets to asc (or desc for date-like keys at call sites). */
  const toggleSort = useCallback((key: K) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const sortBy = useCallback(<T>(
    rows: T[],
    accessors: Partial<Record<K, (row: T) => unknown>>,
  ): T[] => {
    if (!sortKey) return rows
    const get = accessors[sortKey]
    if (!get) return rows
    const sign = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => sign * compareValues(get(a), get(b)))
  }, [sortKey, sortDir])

  return useMemo(() => ({ sortKey, sortDir, toggleSort, sortBy }), [sortKey, sortDir, toggleSort, sortBy])
}
