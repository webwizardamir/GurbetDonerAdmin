import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Sheet from './Sheet'
import SearchSelect from './SearchSelect'
import SegmentedControl from './SegmentedControl'
import { chip } from '../../styles/controls'
import {
  SEARCH_THRESHOLD,
  clearFilter,
  countActiveFilters,
  isFilterActive,
  resetFilters,
  type FilterDef,
} from './filterTypes'

interface FilterSheetProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterDef[]
  /** Excluded from the body because it is pinned in the toolbar. */
  excludeId?: string
  /** Live row count for the footer button. */
  resultCount?: number
  resultsLoading?: boolean
  renderResultLabel?: (n: number) => string
  /** Called after any change, e.g. to reset paging. */
  onChanged?: () => void
}

/**
 * LIVE-APPLY, not draft-and-commit.
 *
 * Draft state committed on Apply and an Apply button showing the resulting row
 * count are mutually exclusive on the pages that count server-side (Orders,
 * Customers, Products, Invoices, Outbox): an unapplied draft has no count, and
 * producing one would mean a speculative count query on every tap.
 *
 * So each control here calls the page's REAL handler — the same one the desktop
 * inline control calls — the list re-queries behind the sheet, and the footer
 * button reads the page's live count. The button still says "Toon 42
 * resultaten"; only the mechanism differs, and the number is true rather than
 * estimated.
 *
 * It also preserves the URL-state contract by construction: there is exactly one
 * handler per filter, called from an event handler, so there is no second source
 * of truth to sync. FilterSheet must never import useUrlListState.
 */
export default function FilterSheet({
  isOpen,
  onClose,
  filters,
  excludeId,
  resultCount,
  resultsLoading,
  renderResultLabel,
  onChanged,
}: FilterSheetProps) {
  const { t } = useTranslation()
  const visible = filters.filter(f => !f.hidden && f.id !== excludeId)
  const activeCount = countActiveFilters(visible)

  const change = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); onChanged?.() }

  const body = (def: FilterDef) => {
    switch (def.kind) {
      case 'select': {
        // Short lists become a chip grid, not a <select>: a native select on
        // mobile opens the OS picker wheel, which is the "huge unsearchable
        // list" complaint in the first place.
        const searchable = def.searchable || def.options.length > SEARCH_THRESHOLD
        if (searchable) {
          return (
            <SearchSelect
              variant="inline"
              value={def.value || null}
              options={def.options}
              onChange={change(v => def.onChange(v ?? ''))}
              placeholder={def.allLabel}
              searchPlaceholder={def.searchPlaceholder ?? t('common.search')}
              z={60}
            />
          )
        }
        return (
          <div role="radiogroup" className="flex flex-wrap gap-2">
            <button type="button" role="radio" aria-checked={def.value === ''}
              onClick={() => change(def.onChange)('')} className={chip(def.value === '')}>
              {def.allLabel}
            </button>
            {def.options.map(o => (
              <button key={o.value} type="button" role="radio" aria-checked={def.value === o.value}
                onClick={() => change(def.onChange)(o.value)} className={chip(def.value === o.value)}>
                {o.label}
                {o.count != null && <span className="text-xs opacity-70 tabular-nums">{o.count}</span>}
              </button>
            ))}
          </div>
        )
      }

      case 'multiselect': {
        const toggle = (v: string) => {
          const next = def.value.includes(v) ? def.value.filter(x => x !== v) : [...def.value, v]
          def.onChange(next)
          onChanged?.()
        }
        return (
          <div role="group" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={def.value.length === 0}
              onClick={() => change(def.onChange)([])} className={chip(def.value.length === 0)}>
              {def.allLabel}
            </button>
            {def.options.map(o => {
              const on = def.value.includes(o.value)
              return (
                <button key={o.value} type="button" aria-pressed={on} onClick={() => toggle(o.value)} className={chip(on)}>
                  {o.label}
                  {o.count != null && <span className="text-xs opacity-70 tabular-nums">{o.count}</span>}
                </button>
              )
            })}
          </div>
        )
      }

      case 'segmented':
        return <SegmentedControl value={def.value} options={def.options} onChange={change(def.onChange)} width="full" aria-label={def.label} />

      case 'toggle':
        return (
          <button
            type="button"
            role="switch"
            aria-checked={def.value}
            onClick={() => change(def.onChange)(!def.value)}
            className="flex items-center justify-between gap-3 w-full min-h-[44px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="text-left">
              <span className="block text-sm text-slate-900 dark:text-white">{def.label}</span>
              {def.description && <span className="block text-xs text-slate-500 dark:text-slate-400">{def.description}</span>}
            </span>
            <span className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${def.value ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${def.value ? 'translate-x-5' : ''}`} />
            </span>
          </button>
        )

      case 'custom':
        return def.render('stacked')
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('common.filters.title')}
      footer={
        <>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => { resetFilters(visible); onChanged?.() }}
              className="inline-flex items-center justify-center gap-1.5 shrink-0 h-12 px-4 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {t('common.reset')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
          >
            {resultsLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              /* aria-live on the SPAN, not the button: on the button the whole
                 accessible name would be re-announced on focus. */
              : <span role="status" aria-live="polite">
                  {resultCount != null && renderResultLabel ? renderResultLabel(resultCount) : t('common.done')}
                </span>}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {visible.map(def => {
          const Icon = def.icon
          return (
            <div key={def.id}>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
                {def.label}
                {isFilterActive(def) && (
                  <button
                    type="button"
                    onClick={() => { clearFilter(def); onChanged?.() }}
                    className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-1 -my-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {t('common.clear')}
                  </button>
                )}
              </div>
              {body(def)}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
