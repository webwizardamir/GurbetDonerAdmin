import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

export interface MultiSelectOption {
  value: string
  label: string
}

interface Props {
  /** Lucide icon component shown at the left of the trigger. */
  icon?: ComponentType<{ className?: string }>
  options: MultiSelectOption[]
  /** Currently selected values. Empty = "all". */
  selected: string[]
  onChange: (next: string[]) => void
  /** Label shown on the trigger when nothing is selected. */
  allLabel: string
  searchPlaceholder: string
  selectAllLabel: string
  /** Build the trigger label when >1 item is selected, e.g. (3) => "3 steden". */
  renderCount: (count: number) => string
  /** Optional emptied-search message. */
  noResultsLabel?: string
  className?: string
  'aria-label'?: string
}

/**
 * Searchable multi-select dropdown with checkboxes + select-all. Used for the
 * Sold Products city filter (and reusable for any "pick several from a list"
 * filter). Closes on outside-click / Escape. The select-all checkbox operates
 * on the *currently filtered* options so it stays predictable while searching.
 */
export default function MultiSelectFilter({
  icon: Icon,
  options,
  selected,
  onChange,
  allLabel,
  searchPlaceholder,
  selectAllLabel,
  renderCount,
  noResultsLabel,
  className = '',
  'aria-label': ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  // Select-all state derived from the *filtered* set.
  const filteredSelectedCount = useMemo(
    () => filtered.reduce((n, o) => n + (selectedSet.has(o.value) ? 1 : 0), 0),
    [filtered, selectedSet],
  )
  const allFilteredSelected = filtered.length > 0 && filteredSelectedCount === filtered.length
  const someFilteredSelected = filteredSelectedCount > 0 && !allFilteredSelected

  // Close on outside click / Escape; focus the search box when opened.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    // Defer focus so the panel is mounted.
    const id = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(id)
    }
  }, [open])

  const toggleValue = (value: string) => {
    onChange(
      selectedSet.has(value)
        ? selected.filter(v => v !== value)
        : [...selected, value],
    )
  }

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect every currently-filtered option.
      const filteredValues = new Set(filtered.map(o => o.value))
      onChange(selected.filter(v => !filteredValues.has(v)))
    } else {
      // Add every filtered option not already selected.
      const merged = new Set(selected)
      for (const o of filtered) merged.add(o.value)
      onChange(Array.from(merged))
    }
  }

  const count = selected.length
  const triggerLabel =
    count === 0
      ? allLabel
      : count === 1
        ? options.find(o => o.value === selected[0])?.label ?? renderCount(count)
        : renderCount(count)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`relative inline-flex items-center gap-2 max-w-[220px] ${Icon ? 'pl-9' : 'pl-3'} pr-9 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer transition-colors ${
          count > 0
            ? 'border-green-500 dark:border-green-500 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
        } ${className}`}
      >
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
        <span className="truncate min-w-0">{triggerLabel}</span>
        {count > 1 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[11px] font-semibold leading-none shrink-0">
            {count}
          </span>
        )}
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute z-40 mt-2 w-64 max-w-[80vw] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
          role="group"
          aria-label={allLabel}
        >
          {/* Search */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Select all */}
          {filtered.length > 0 && (
            <button
              type="button"
              role="checkbox"
              aria-checked={someFilteredSelected ? 'mixed' : allFilteredSelected}
              onClick={toggleSelectAll}
              className="flex w-full items-center gap-2.5 px-3 py-2 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <CheckboxBox checked={allFilteredSelected} indeterminate={someFilteredSelected} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {selectAllLabel}
              </span>
            </button>
          )}

          {/* Options */}
          <div className="max-h-[40vh] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-center text-slate-500 dark:text-slate-400">
                {noResultsLabel ?? '—'}
              </p>
            ) : (
              filtered.map(o => {
                const isSel = selectedSet.has(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="checkbox"
                    aria-checked={isSel}
                    onClick={() => toggleValue(o.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <CheckboxBox checked={isSel} />
                    <span
                      className={`text-sm truncate ${isSel ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      {o.label}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Custom checkbox visual (no native input — the row button owns the click). */
function CheckboxBox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  const active = checked || indeterminate
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center w-4 h-4 shrink-0 rounded border transition-colors ${
        active
          ? 'bg-green-600 border-green-600 text-white'
          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
      }`}
    >
      {indeterminate ? (
        <span className="w-2 h-0.5 bg-white rounded" />
      ) : checked ? (
        <Check className="w-3 h-3" strokeWidth={3} />
      ) : null}
    </span>
  )
}
