import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Filters are declared as DATA, not JSX.
 *
 * This is what lets one definition array feed both the desktop inline row and
 * the mobile filter sheet without a second component tree — and therefore
 * without ever mounting two copies of a stateful control at once.
 */

export interface FilterOption {
  value: string
  label: string
  /** Muted count suffix, e.g. the Orders status filter's "Voltooid (128)". */
  count?: number
  /** Optional second line, long-list picker only (e.g. a customer's city). */
  sublabel?: string
}

interface FilterBase {
  /** Stable key. Also the URL / localStorage key where applicable. */
  id: string
  /** Already-translated label. Shown in the sheet, used as the desktop aria-label. */
  label: string
  icon?: LucideIcon
  /** Hide entirely (e.g. a unit filter when only one unit exists). */
  hidden?: boolean
}

export type FilterDef =
  | (FilterBase & {
      kind: 'select'
      value: string
      options: FilterOption[]
      onChange: (v: string) => void
      allLabel: string
      /**
       * This select has no "all"/empty state — it ALWAYS holds one of `options`
       * (a date range, for instance: there is no such thing as "no period").
       *
       * Without it the renderers emit an extra `<option value="">{allLabel}</option>`
       * on top of the real options, which is what produced two "Vandaag" entries
       * in the Sold Products period filter. Such a filter also never counts as
       * "active", since it is a choice rather than a narrowing.
       */
      noAll?: boolean
      /** Force the searchable picker regardless of length. Otherwise it upgrades
       *  automatically above SEARCH_THRESHOLD. */
      searchable?: boolean
      searchPlaceholder?: string
    })
  | (FilterBase & {
      kind: 'multiselect'
      value: string[]
      options: FilterOption[]
      onChange: (v: string[]) => void
      allLabel: string
      searchPlaceholder?: string
      selectAllLabel?: string
    })
  | (FilterBase & {
      kind: 'segmented'
      value: string
      options: FilterOption[]
      onChange: (v: string) => void
    })
  | (FilterBase & {
      kind: 'toggle'
      value: boolean
      onChange: (v: boolean) => void
      description?: string
    })
  | (FilterBase & {
      kind: 'custom'
      /** `compact` = desktop inline row, `stacked` = sheet body. Exactly one of
       *  the two is ever mounted. */
      render: (mode: 'compact' | 'stacked') => ReactNode
      isActive: boolean
      chipValue?: string
      onClear: () => void
    })

/** Option count above which a select becomes a searchable picker. */
export const SEARCH_THRESHOLD = 12

/** Does this filter differ from its "no filter" state? Single definition —
 *  drives the toolbar badge, the chip row and Reset. Never re-derive per page. */
export function isFilterActive(def: FilterDef): boolean {
  switch (def.kind) {
    case 'select':      return !def.noAll && def.value !== ''
    case 'multiselect': return def.value.length > 0
    case 'toggle':      return def.value === true
    case 'custom':      return def.isActive
    // A segmented control always has a value (grouping, view mode); it is a
    // presentation choice rather than a filter, so it never counts as "active".
    case 'segmented':   return false
  }
}

export function countActiveFilters(defs: FilterDef[]): number {
  return defs.filter(d => !d.hidden && isFilterActive(d)).length
}

/** Human value for the active-filter chip row. */
export function filterChipValue(def: FilterDef): string {
  switch (def.kind) {
    case 'select': {
      const opt = def.options.find(o => o.value === def.value)
      return opt?.label ?? def.value
    }
    case 'multiselect':
      return def.value.length === 1
        ? (def.options.find(o => o.value === def.value[0])?.label ?? def.value[0])
        : String(def.value.length)
    case 'toggle':    return def.label
    case 'custom':    return def.chipValue ?? def.label
    case 'segmented': return def.value
  }
}

/** Reset one filter to its inactive state. */
export function clearFilter(def: FilterDef): void {
  switch (def.kind) {
    case 'select':      if (!def.noAll) def.onChange(''); break
    case 'multiselect': def.onChange([]); break
    case 'toggle':      def.onChange(false); break
    case 'custom':      def.onClear(); break
    case 'segmented':   break
  }
}

export function resetFilters(defs: FilterDef[]): void {
  for (const d of defs) if (!d.hidden && isFilterActive(d)) clearFilter(d)
}
