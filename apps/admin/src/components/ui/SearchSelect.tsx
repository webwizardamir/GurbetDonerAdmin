import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, ChevronDown, Loader2, Check, type LucideIcon } from 'lucide-react'
import DropdownMenu from './DropdownMenu'
import Sheet from './Sheet'
import { useIsMobile } from '../../hooks/useMediaQuery'
import type { FilterOption } from './filterTypes'

interface SearchSelectProps {
  /** null = nothing selected ("all"). */
  value: string | null
  options: FilterOption[]
  onChange: (v: string | null) => void
  /** The "all" row label and the trigger's empty text. */
  placeholder: string
  searchPlaceholder: string
  icon?: LucideIcon
  loading?: boolean
  /**
   * 'trigger' - button + popover (desktop) or button + sheet (mobile). Default.
   * 'inline'  - search field and list rendered flat, no trigger and no overlay.
   *             Used inside FilterSheet's body.
   */
  variant?: 'trigger' | 'inline'
  /** Progressive-reveal page size. */
  chunkSize?: number
  triggerClass?: string
  /** Nest inside an already-open Sheet. */
  z?: 50 | 60
}

/**
 * Searchable single-select for long lists.
 *
 * Fixes the three defects of the old ComboPicker at once:
 *   1. Clipping — the desktop popover is hosted in DropdownMenu's portal
 *      (fixed positioning off getBoundingClientRect), so no ancestor
 *      overflow-hidden / overflow-x-auto can cut it off.
 *   2. Silent truncation — ComboPicker rendered `filtered.slice(0, 50)` with no
 *      indication, so option 51 simply did not exist as far as the user knew.
 *      Now progressive reveal plus a permanent "showing X of Y" footer.
 *   3. Unsearchable on mobile — a raw <select> opens the OS picker wheel. The
 *      search field is the sticky FIRST row of the panel, and on mobile the
 *      panel is a full Sheet.
 *
 * The host is chosen in JS via useIsMobile(), never by CSS `hidden`, so exactly
 * one instance exists at a time.
 */
export default function SearchSelect({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  icon: Icon,
  loading = false,
  variant = 'trigger',
  chunkSize = 100,
  triggerClass = 'min-w-[150px] max-w-[220px]',
  z = 50,
}: SearchSelectProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(chunkSize)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = value ? options.find(o => o.value === value) ?? null : null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q))
  }, [options, search])

  // Reset the reveal window whenever the term changes, else a narrow search
  // would inherit a large window from the previous one.
  useEffect(() => { setVisible(chunkSize) }, [search, chunkSize])
  useEffect(() => { if (!open) setSearch('') }, [open])

  // Autofocus the search on DESKTOP only. On mobile it raises the keyboard and
  // swallows the sheet before the user can see the list.
  useEffect(() => {
    if ((open || variant === 'inline') && !isMobile) searchRef.current?.focus()
  }, [open, isMobile, variant])

  const pick = (v: string | null) => {
    onChange(v)
    setOpen(false)
  }

  const panel = (
    <div className="flex flex-col min-h-0 max-h-full">
      <div className="sticky top-0 z-10 shrink-0 p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            /* text-base below md: under 16px iOS force-zooms on focus. */
            className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-base md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('common.close')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div role="listbox" className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <button
          type="button"
          role="option"
          aria-selected={value === null}
          onClick={() => pick(null)}
          className={`flex w-full items-center justify-between gap-2 px-3 py-3 min-h-[44px] text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
            value === null ? 'bg-green-50 dark:bg-green-900/20' : ''
          } text-slate-500 dark:text-slate-400`}
        >
          {placeholder}
          {value === null && <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />}
        </button>

        {filtered.slice(0, visible).map(o => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            onClick={() => pick(o.value)}
            className={`flex w-full items-start gap-2 px-3 py-3 min-h-[44px] text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
              o.value === value ? 'bg-green-50 dark:bg-green-900/20' : ''
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{o.label}</span>
              {o.sublabel && <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{o.sublabel}</span>}
            </span>
            {o.count != null && <span className="ml-auto shrink-0 text-xs text-slate-400 tabular-nums">{o.count}</span>}
            {o.value === value && <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />}
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="px-3 py-6 text-sm text-center text-slate-500 dark:text-slate-400">{t('common.noResults')}</p>
        )}

        {filtered.length > visible && (
          <button
            type="button"
            onClick={() => setVisible(v => v + chunkSize)}
            className="w-full px-3 py-3 min-h-[44px] text-sm font-medium text-center text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            {t('common.showMoreOptions', { count: filtered.length - visible })}
          </button>
        )}
      </div>

      {/* The affordance ComboPicker never had: the list is never silently cut. */}
      {options.length > chunkSize && (
        <div className="shrink-0 px-3 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-center text-slate-500 dark:text-slate-400 tabular-nums">
          {t('common.showingOf', { shown: Math.min(visible, filtered.length), total: filtered.length })}
        </div>
      )}
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[45vh] flex flex-col">
        {panel}
      </div>
    )
  }

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(o => !o)}
      aria-haspopup="listbox"
      aria-expanded={open}
      className={`flex items-center gap-2 pl-3 pr-2 h-11 ${triggerClass} bg-white dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer ${
        selected
          ? 'border-green-300 dark:border-green-800 text-slate-900 dark:text-white'
          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
      }`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-400" />}
      <span className="flex-1 truncate text-left">{selected?.label ?? placeholder}</span>
      {loading
        ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-400" />
        : <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
    </button>
  )

  return (
    <>
      {trigger}
      {isMobile ? (
        <Sheet isOpen={open} onClose={() => setOpen(false)} title={placeholder} heightClass="h-[85dvh]" z={z}>
          <div className="-mx-5 -my-4 h-full flex flex-col">{panel}</div>
        </Sheet>
      ) : (
        <DropdownMenu isOpen={open} onClose={() => setOpen(false)} anchorRef={triggerRef} width={288}>
          <div className="max-h-[min(60vh,384px)] flex flex-col">{panel}</div>
        </DropdownMenu>
      )}
    </>
  )
}
