import { useCallback, useMemo, useState } from 'react'

/**
 * Row selection that SURVIVES a search or page change.
 *
 * The list pages used to clear the selection in an effect keyed on
 * search/filters/page, so the "search, tick, search again, tick again" flow was
 * impossible — the second search wiped the first batch.
 *
 * It also stores the ROW, not just the id. `selectedData` was previously derived
 * as `visibleRows.filter(r => ids.has(r.id))`, which silently dropped anything
 * not on the current page: you could tick ten rows across three searches and
 * export only the last page's worth. Keeping the row object means the export's
 * "selected rows" scope gets everything actually ticked.
 *
 * Selection is deliberately NOT persisted across a full page reload — it is a
 * transient working set, and a stale one would be more surprising than useful.
 */
export function useRowSelection<T extends { id: string }>() {
  const [selected, setSelected] = useState<Map<string, T>>(new Map())

  const toggle = useCallback((row: T) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(row.id)) next.delete(row.id)
      else next.set(row.id, row)
      return next
    })
  }, [])

  /**
   * Select-all over the rows currently on screen. If every visible row is
   * already selected it deselects just those, leaving picks made under other
   * searches untouched.
   */
  const toggleAllVisible = useCallback((rows: T[]) => {
    setSelected(prev => {
      const next = new Map(prev)
      const allOn = rows.length > 0 && rows.every(r => next.has(r.id))
      if (allOn) rows.forEach(r => next.delete(r.id))
      else rows.forEach(r => next.set(r.id, r))
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Map()), [])

  const selectedIds = useMemo(() => new Set(selected.keys()), [selected])
  const selectedItems = useMemo(() => Array.from(selected.values()), [selected])

  return {
    selectedIds,
    selectedItems,
    selectedCount: selected.size,
    isSelected: (id: string) => selected.has(id),
    toggle,
    toggleAllVisible,
    clear,
    /** Replace wholesale — for a bulk action that consumed the selection. */
    setSelected,
  }
}
