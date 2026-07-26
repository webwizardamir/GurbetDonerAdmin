import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clearFilter, countActiveFilters, filterChipValue, isFilterActive, resetFilters, type FilterDef } from './filterTypes'

interface ActiveFilterChipsProps {
  filters: FilterDef[]
  /** Called after any chip is removed / all are cleared, e.g. to reset the page. */
  onChanged?: () => void
}

/**
 * Generalises the chip row that only Analytics had, so every list page shows
 * which filters are on. Renders on BOTH breakpoints — on mobile it is the answer
 * to "what am I filtered by?" without reopening the sheet.
 */
export default function ActiveFilterChips({ filters, onChanged }: ActiveFilterChipsProps) {
  const { t } = useTranslation()
  const active = filters.filter(f => !f.hidden && isFilterActive(f))
  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.filters.active')}</span>
      {active.map(f => (
        <button
          key={f.id}
          type="button"
          onClick={() => { clearFilter(f); onChanged?.() }}
          aria-label={t('common.filters.removeFilter', { name: f.label })}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium max-w-[220px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <span className="truncate">{f.label}: {filterChipValue(f)}</span>
          <X className="w-3 h-3 shrink-0" />
        </button>
      ))}
      {countActiveFilters(filters) > 1 && (
        <button
          type="button"
          onClick={() => { resetFilters(filters); onChanged?.() }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          {t('common.filters.clearAll')}
        </button>
      )}
    </div>
  )
}
