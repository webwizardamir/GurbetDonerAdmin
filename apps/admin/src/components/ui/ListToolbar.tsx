import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal, MoreVertical, Loader2, type LucideIcon } from 'lucide-react'
import DropdownMenu from './DropdownMenu'
import FilterSheet from './FilterSheet'
import SearchSelect from './SearchSelect'
import SegmentedControl from './SegmentedControl'
import MultiSelectFilter from './MultiSelectFilter'
import ActiveFilterChips from './ActiveFilterChips'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { btnIcon, btnPrimary, btnSecondary, filterBadge, filterButton, inputIcon, inputWithIcon, menuItem } from '../../styles/controls'
import { SEARCH_THRESHOLD, countActiveFilters, type FilterDef } from './filterTypes'

export interface ToolbarAction {
  id: string
  label: string
  icon: LucideIcon
  onClick?: () => void
  /** 'primary'   - green button, ALWAYS visible on mobile (at most one).
   *  'secondary' - outlined button on desktop, collapses into the ⋮ on mobile.
   *  'iconOnly'  - icon button on desktop, collapses into the ⋮ on mobile. */
  priority: 'primary' | 'secondary' | 'iconOnly'
  disabled?: boolean
  busy?: boolean
  tone?: 'default' | 'danger'
  /** Toggled state (Orders' Prullenbak, Customers' Gearchiveerd). */
  active?: boolean
  /** For actions that own their own overlay (ExportMenu). Rendered instead of a
   *  plain button; `mode` lets it present as a toolbar button or a menu row. */
  render?: (mode: 'toolbar' | 'menuitem') => ReactNode
}

interface ListToolbarProps {
  search?: {
    value: string
    onChange: (v: string) => void
    placeholder: string
  }
  filters?: FilterDef[]
  /**
   * One filter kept inline on mobile because it defines the page (Sold Products'
   * date range). Must be an id present in `filters`; it is rendered inline AND
   * skipped in the sheet body, so it is never mounted twice.
   */
  pinnedFilterId?: string
  actions?: ToolbarAction[]
  resultCount?: number
  resultsLoading?: boolean
  renderResultLabel?: (n: number) => string
  /** Called on any filter change, e.g. to reset paging. */
  onFiltersChanged?: () => void
  /** Active-filter chips. Pass null to suppress. */
  chips?: ReactNode | null
}

/**
 * The list-page toolbar.
 *
 * Desktop is deliberately close to the previous hand-rolled markup — the
 * complaint was about mobile. Mobile collapses to ONE row: search, the pinned
 * filter, a Filters button with an active count, an overflow ⋮, and the single
 * primary action.
 *
 * ⚠️ The mobile/desktop split is made ONCE, in JS, via useIsMobile(). Filter
 * controls therefore exist in exactly one place at a time. Rendering both and
 * hiding one with CSS is what caused the phantom-menu bug that DropdownMenu's
 * `dormant` guard exists for; keep that guard, and keep this rule.
 */
export default function ListToolbar({
  search,
  filters = [],
  pinnedFilterId,
  actions = [],
  resultCount,
  resultsLoading,
  renderResultLabel,
  onFiltersChanged,
  chips,
}: ListToolbarProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)

  const visibleFilters = filters.filter(f => !f.hidden)
  const pinned = pinnedFilterId ? visibleFilters.find(f => f.id === pinnedFilterId) : undefined
  const sheetFilters = visibleFilters.filter(f => f.id !== pinnedFilterId)
  const activeCount = countActiveFilters(sheetFilters)

  const primary = actions.find(a => a.priority === 'primary')
  const overflow = actions.filter(a => a !== primary)

  const chipRow = chips === null
    ? null
    : chips ?? <ActiveFilterChips filters={visibleFilters} onChanged={onFiltersChanged} />

  // --- one filter, rendered inline (desktop row, or the mobile pinned slot) ---
  const inline = (def: FilterDef) => {
    switch (def.kind) {
      case 'select': {
        const searchable = def.searchable || def.options.length > SEARCH_THRESHOLD
        if (searchable) {
          return (
            <SearchSelect
              key={def.id}
              value={def.value || null}
              options={def.options}
              onChange={v => { def.onChange(v ?? ''); onFiltersChanged?.() }}
              placeholder={def.allLabel}
              searchPlaceholder={def.searchPlaceholder ?? t('common.search')}
              icon={def.icon}
            />
          )
        }
        const Icon = def.icon
        return (
          <div key={def.id} className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
            <select
              aria-label={def.label}
              value={def.value}
              onChange={e => { def.onChange(e.target.value); onFiltersChanged?.() }}
              className={`${Icon ? 'pl-9' : 'pl-4'} pr-10 h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base md:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer`}
            >
              <option value="">{def.allLabel}</option>
              {def.options.map(o => (
                <option key={o.value} value={o.value}>{o.label}{o.count != null ? ` (${o.count})` : ''}</option>
              ))}
            </select>
          </div>
        )
      }
      case 'multiselect':
        return (
          <MultiSelectFilter
            key={def.id}
            aria-label={def.label}
            icon={def.icon}
            selected={def.value}
            onChange={v => { def.onChange(v); onFiltersChanged?.() }}
            options={def.options}
            allLabel={def.allLabel}
            searchPlaceholder={def.searchPlaceholder ?? t('common.search')}
            selectAllLabel={def.selectAllLabel ?? t('common.selectAll')}
            noResultsLabel={t('common.noResults')}
            renderCount={n => t('common.nSelected', { count: n })}
          />
        )
      case 'segmented':
        return (
          <SegmentedControl
            key={def.id}
            value={def.value}
            options={def.options}
            onChange={v => { def.onChange(v); onFiltersChanged?.() }}
            leadingLabel={def.label}
            leadingIcon={def.icon}
            aria-label={def.label}
          />
        )
      case 'toggle': {
        const Icon = def.icon
        return (
          <button
            key={def.id}
            type="button"
            aria-pressed={def.value}
            onClick={() => { def.onChange(!def.value); onFiltersChanged?.() }}
            className={`${btnSecondary} ${def.value ? 'bg-green-50 dark:bg-green-600/10 border-green-500 text-green-700 dark:text-green-400' : ''}`}
          >
            {Icon && <Icon className="w-5 h-5" />}
            <span className="hidden lg:inline">{def.label}</span>
          </button>
        )
      }
      case 'custom':
        return <span key={def.id}>{def.render('compact')}</span>
    }
  }

  const actionButton = (a: ToolbarAction) => {
    if (a.render) return <span key={a.id}>{a.render('toolbar')}</span>
    const Icon = a.icon
    const cls = a.priority === 'iconOnly' ? btnIcon : btnSecondary
    return (
      <button
        key={a.id}
        type="button"
        onClick={a.onClick}
        disabled={a.disabled || a.busy}
        title={a.priority === 'iconOnly' ? a.label : undefined}
        aria-label={a.priority === 'iconOnly' ? a.label : undefined}
        aria-pressed={a.active}
        className={`${cls} ${a.active ? 'bg-green-50 dark:bg-green-600/10 border-green-500 text-green-700 dark:text-green-400' : ''} ${
          a.tone === 'danger' ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' : ''
        }`}
      >
        {a.busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
        {a.priority !== 'iconOnly' && <span className="hidden lg:inline">{a.label}</span>}
      </button>
    )
  }

  const searchBox = search && (
    <div className={`relative ${isMobile ? 'flex-1 min-w-0' : 'w-full sm:w-64 lg:w-80'}`}>
      <Search className={inputIcon} />
      <input
        type="text"
        value={search.value}
        onChange={e => search.onChange(e.target.value)}
        placeholder={search.placeholder}
        className={inputWithIcon}
      />
    </div>
  )

  // ---------------------------------------------------------------- desktop --
  if (!isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {searchBox}
          {visibleFilters.map(inline)}
          <div className="flex-1" />
          {actions.filter(a => a.priority === 'iconOnly').map(actionButton)}
          {actions.filter(a => a.priority === 'secondary').map(actionButton)}
          {primary && (
            primary.render
              ? <span key={primary.id}>{primary.render('toolbar')}</span>
              : (
                <button type="button" onClick={primary.onClick} disabled={primary.disabled || primary.busy} className={btnPrimary}>
                  {primary.busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <primary.icon className="w-5 h-5" />}
                  <span className="hidden sm:inline">{primary.label}</span>
                </button>
              )
          )}
        </div>
        {chipRow}
      </div>
    )
  }

  // ----------------------------------------------------------------- mobile --
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {searchBox}
        {pinned && <span className="shrink-0">{inline(pinned)}</span>}

        {sheetFilters.length > 0 && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label={t('common.filters.buttonAria', { count: activeCount })}
            className={filterButton(activeCount > 0)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {!search && t('common.filters.button')}
            {activeCount > 0 && <span className={filterBadge}>{activeCount}</span>}
          </button>
        )}

        {overflow.length > 0 && (
          <>
            <button
              ref={menuRef}
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t('common.moreActions')}
              className={btnIcon}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <DropdownMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} anchorRef={menuRef} width={224}>
              {overflow.map(a => {
                if (a.render) {
                  return <div key={a.id} onClick={() => setMenuOpen(false)}>{a.render('menuitem')}</div>
                }
                const Icon = a.icon
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="menuitem"
                    disabled={a.disabled || a.busy}
                    onClick={() => { setMenuOpen(false); a.onClick?.() }}
                    className={`${menuItem} ${a.tone === 'danger' ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : ''} ${
                      a.active ? 'bg-green-50 dark:bg-green-600/10 text-green-700 dark:text-green-400' : ''
                    }`}
                  >
                    {a.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4 shrink-0" />}
                    {a.label}
                  </button>
                )
              })}
            </DropdownMenu>
          </>
        )}

        {primary && (
          primary.render
            ? <span className="shrink-0">{primary.render('toolbar')}</span>
            : (
              <button
                type="button"
                onClick={primary.onClick}
                disabled={primary.disabled || primary.busy}
                aria-label={primary.label}
                className={btnPrimary}
              >
                {primary.busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <primary.icon className="w-5 h-5" />}
                {!search && <span>{primary.label}</span>}
              </button>
            )
        )}
      </div>

      {chipRow}

      <FilterSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={sheetFilters}
        resultCount={resultCount}
        resultsLoading={resultsLoading}
        renderResultLabel={renderResultLabel}
        onChanged={onFiltersChanged}
      />
    </div>
  )
}
