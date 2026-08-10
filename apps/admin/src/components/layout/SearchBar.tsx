// Global search in the app header.
//
// 🚨 Desktop and mobile are branched ONCE in JS (useIsMobile), never with CSS
// `hidden`/`md:`. The mobile branch portals a dialog and owns overlay state, and
// the old CSS split is what made this component broken on a phone: the
// click-outside handler was bound to the DESKTOP wrapper only, so on a phone a
// tap on a result was "outside", the list unmounted on pointerdown, and the
// button's click never fired. The row looked tappable and did nothing.
//
// Both branches drive the same useGlobalSearch hook and render the same result
// list, so they cannot drift again.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, X, Loader2, ShoppingCart, Users, Package,
  ArrowRight, CornerDownLeft, AlertCircle,
} from 'lucide-react'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useBodyScrollLock, useEscapeKey, useFocusTrap } from '../../hooks/useOverlay'
import { useGlobalSearch, type SearchRow } from '../../hooks/useGlobalSearch'
import { MIN_SEARCH_LENGTH, type SearchResult, type SearchResultType } from '../../services/search'

const TYPE_ICONS: Record<SearchResultType, typeof Users> = {
  customer: Users,
  order: ShoppingCart,
  product: Package,
}

// Static classes: Tailwind cannot see an interpolated class name.
const TYPE_CHIP: Record<SearchResultType, string> = {
  customer: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  order: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  product: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '')

/** Bold the matched part of a title so the reason for the hit is visible. */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent text-green-700 dark:text-green-400 font-semibold">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Shared controller                                                   */
/* ------------------------------------------------------------------ */

/**
 * Landing on the page you are already on is a no-op for a list page: it parses
 * the URL once on mount (hooks/useUrlListState). Bumping `gs` makes Layout
 * remount the route, which is the only thing that re-reads the new params.
 * Added ONLY for a same-page hit, so ordinary links stay clean.
 */
function withRemountKey(url: string, location: { pathname: string; search: string }): string {
  const [path, queryString = ''] = url.split('?')
  if (path !== location.pathname) return url
  const params = new URLSearchParams(queryString)
  params.set('gs', String(Number(new URLSearchParams(location.search).get('gs') ?? 0) + 1))
  return `${path}?${params.toString()}`
}

function useSearchController(onDone: () => void) {
  const navigate = useNavigate()
  const location = useLocation()
  const search = useGlobalSearch()
  const [activeIndex, setActiveIndex] = useState(0)

  const showingRecent = search.trimmed.length < MIN_SEARCH_LENGTH && search.recent.length > 0

  // Recent picks are navigable with the same keys as live results.
  const rows = useMemo<SearchRow[]>(() => {
    if (search.trimmed.length >= MIN_SEARCH_LENGTH) return search.rows
    return search.recent.map(entry => ({
      kind: 'result' as const,
      key: `recent-${entry.type}-${entry.id}`,
      result: { ...entry, score: 0 } as SearchResult,
    }))
  }, [search.trimmed, search.rows, search.recent])

  // A new result set must not keep the highlight on row 7 of a shorter list.
  useEffect(() => { setActiveIndex(0) }, [rows])

  const { pushRecent, reset } = search
  const select = useCallback((row: SearchRow) => {
    if (row.kind === 'result') pushRecent(row.result)
    navigate(withRemountKey(row.kind === 'result' ? row.result.url : row.url, location))
    onDone()
    reset()
  }, [navigate, location, onDone, pushRecent, reset])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (rows.length === 0) return
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(i => (i + delta + rows.length) % rows.length)
      return
    }
    if (e.key === 'Enter') {
      const row = rows[activeIndex]
      if (row) { e.preventDefault(); select(row) }
      return
    }
    if (e.key === 'Escape') {
      // First Escape clears a typed term, a second one closes. Closing straight
      // away on a full input is the thing people complain about in palettes.
      if (search.query) { e.preventDefault(); e.stopPropagation(); reset() }
    }
  }, [rows, activeIndex, select, search.query, reset])

  return { search, rows, activeIndex, setActiveIndex, select, onKeyDown, showingRecent }
}

/* ------------------------------------------------------------------ */
/* Result list (shared by both branches)                               */
/* ------------------------------------------------------------------ */

interface ResultListProps {
  controller: ReturnType<typeof useSearchController>
  /** Extra bottom padding on mobile so the last row clears the keyboard. */
  mobile?: boolean
}

function ResultList({ controller, mobile }: ResultListProps) {
  const { t } = useTranslation()
  const { search, rows, activeIndex, setActiveIndex, select, showingRecent } = controller
  const listRef = useRef<HTMLDivElement>(null)

  const indexOf = useMemo(() => new Map(rows.map((row, i) => [row.key, i])), [rows])

  // Keep the keyboard cursor visible without scrolling the whole page.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const renderRow = (row: SearchRow) => {
    const index = indexOf.get(row.key) ?? -1
    const active = index === activeIndex
    const base = `w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
      active ? 'bg-slate-100 dark:bg-slate-700/60' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
    }`

    if (row.kind === 'more') {
      return (
        <button
          key={row.key} type="button" data-row-index={index}
          id={`gsr-opt-${index}`} role="option" aria-selected={active}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => select(row)}
          className={`${base} text-sm text-green-700 dark:text-green-400 font-medium`}
        >
          <span className="w-9 flex justify-center"><ArrowRight className="w-4 h-4" /></span>
          <span className="flex-1 truncate">
            {t(`header.search.seeAll.${row.type}`, { query: search.trimmed })}
          </span>
        </button>
      )
    }

    const result = row.result
    const Icon = TYPE_ICONS[result.type]
    return (
      <button
        key={row.key} type="button" data-row-index={index}
        id={`gsr-opt-${index}`} role="option" aria-selected={active}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => select(row)}
        className={base}
      >
        <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${TYPE_CHIP[result.type]}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="min-w-0 text-sm font-medium text-slate-900 dark:text-white truncate">
              <Highlight text={result.title} query={search.trimmed} />
            </span>
            {result.tag === 'archived' && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {t('header.search.archived')}
              </span>
            )}
          </span>
          {result.subtitle && (
            <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</span>
          )}
        </span>
        {result.meta && (
          <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            {result.meta}
          </span>
        )}
      </button>
    )
  }

  const sectionLabel = (label: string, action?: React.ReactNode) => (
    <div className="flex items-center justify-between px-3 pt-3 pb-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      {action}
    </div>
  )

  // States, in priority order.
  let body: React.ReactNode = null

  if (search.failed) {
    body = (
      <div className="px-4 py-8 text-center">
        <AlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('header.search.error')}</p>
      </div>
    )
  } else if (search.tooShort) {
    body = (
      <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('header.search.minChars', { count: MIN_SEARCH_LENGTH })}
      </p>
    )
  } else if (rows.length > 0) {
    body = showingRecent ? (
      <>
        {sectionLabel(
          t('header.search.recent'),
          <button
            type="button" onClick={search.clearRecent}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {t('header.search.clearRecent')}
          </button>,
        )}
        <div className="px-1 pb-2">{rows.map(renderRow)}</div>
      </>
    ) : (
      <>
        {search.groups.map(group => (
          <div key={group.type}>
            {sectionLabel(t(`header.search.groups.${group.type}`))}
            <div className="px-1 pb-1">
              {group.items.map(item => renderRow({ kind: 'result', key: `${item.type}-${item.id}`, result: item }))}
              {group.hasMore && renderRow({ kind: 'more', key: `more-${group.type}`, type: group.type, url: group.seeAllUrl })}
            </div>
          </div>
        ))}
        <div className="pb-2" />
      </>
    )
  } else if (search.loading) {
    body = (
      <div className="px-4 py-8 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t('header.search.searching')}
      </div>
    )
  } else if (search.trimmed.length >= MIN_SEARCH_LENGTH) {
    body = (
      <div className="px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('header.search.noResults', { query: search.trimmed })}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('header.search.noResultsHint')}</p>
      </div>
    )
  } else {
    body = (
      <div className="px-4 py-8 text-center">
        <Search className="w-5 h-5 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('header.search.empty')}</p>
      </div>
    )
  }

  return (
    // preventDefault on mousedown keeps focus in the input while a row is
    // pressed. Without it the input blurs first: on a phone the keyboard
    // collapses, the list moves up under the finger, and the tap lands on a
    // different row (or on nothing at all).
    <div
      ref={listRef}
      id="global-search-results"
      role="listbox"
      aria-label={t('header.search.results')}
      onMouseDown={e => e.preventDefault()}
      className={mobile ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain pb-24' : 'max-h-[70vh] overflow-y-auto overscroll-contain'}
    >
      {body}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Desktop: inline input + dropdown                                    */
/* ------------------------------------------------------------------ */

function DesktopSearch() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeDropdown = useCallback(() => setOpen(false), [])
  const controller = useSearchController(closeDropdown)
  const { search } = controller

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Cmd/Ctrl+K focuses the search from anywhere, the convention every app with
  // a global search shares.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        aria-activedescendant={open && controller.rows[controller.activeIndex] ? `gsr-opt-${controller.activeIndex}` : undefined}
        aria-label={t('header.search.placeholder')}
        value={search.query}
        onChange={e => { search.setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape' && !search.query) { setOpen(false); inputRef.current?.blur(); return }
          controller.onKeyDown(e)
        }}
        placeholder={t('header.search.placeholder')}
        autoComplete="off" spellCheck={false}
        className="w-64 lg:w-80 pl-10 pr-16 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
      />

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {search.loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        {search.query ? (
          <button
            type="button"
            onClick={() => { search.reset(); inputRef.current?.focus() }}
            aria-label={t('header.search.clear')}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <kbd className="hidden lg:inline-flex items-center h-5 px-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-[10px] font-medium text-slate-400">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        )}
      </div>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-[26rem] lg:w-[30rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
        >
          <ResultList controller={controller} />
          <div className="flex items-center gap-4 px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-slate-200 dark:border-slate-600">↑↓</kbd>{t('header.search.hints.navigate')}</span>
            <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" />{t('header.search.hints.select')}</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-slate-200 dark:border-slate-600">esc</kbd>{t('header.search.hints.close')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mobile: icon button + full-screen dialog                            */
/* ------------------------------------------------------------------ */

function MobileSearch() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeDialog = useCallback(() => setOpen(false), [])
  const controller = useSearchController(closeDialog)
  const { search } = controller

  const { reset } = search
  const close = useCallback(() => { setOpen(false); reset() }, [reset])

  useBodyScrollLock(open)
  useEscapeKey(open, close)
  // autoFocus off: the trap's own "focus the first focusable" would land on the
  // close button. The input is focused explicitly below.
  useFocusTrap(panelRef, open, { autoFocus: false })

  useEffect(() => {
    if (!open) return
    // A frame late, so the panel is painted before the keyboard is raised.
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('header.search.open')}
        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>

      {open && createPortal(
        // Full-screen and opaque, the standard mobile search surface: there is
        // no dimmed backdrop to style because nothing behind it is visible.
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('header.search.placeholder')}
          className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 pt-[env(safe-area-inset-top)]"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                inputMode="search"
                enterKeyHint="search"
                aria-label={t('header.search.placeholder')}
                value={search.query}
                onChange={e => search.setQuery(e.target.value)}
                onKeyDown={controller.onKeyDown}
                placeholder={t('header.search.placeholderShort')}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {search.loading
                ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                : search.query && (
                  <button
                    type="button"
                    onClick={() => { search.reset(); inputRef.current?.focus() }}
                    aria-label={t('header.search.clear')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
            </div>
            <button
              type="button"
              onClick={close}
              className="shrink-0 px-2 py-2 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              {t('common.cancel')}
            </button>
          </div>

          <ResultList controller={controller} mobile />
        </div>,
        document.body,
      )}
    </>
  )
}

export default function SearchBar() {
  return useIsMobile() ? <MobileSearch /> : <DesktopSearch />
}
