import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface SelectionBarProps {
  /** How many rows are currently selected. */
  selectedCount: number
  /** How many rows are currently rendered — the target of "select all". */
  visibleCount: number
  onToggleSelectAll: () => void
  onClear: () => void
  /** Bulk actions, right-aligned on desktop, wrapping to a second row on mobile. */
  children?: ReactNode
  /**
   * Render even when nothing is selected. Default true, and that is the whole
   * point of this component: the mobile card lists had no select-all affordance
   * at all, so "Export -> selected rows" was unreachable below `md`.
   */
  alwaysShow?: boolean
}

/**
 * Selection summary + select-all, rendered above a list.
 *
 * Kept in sync with the desktop table's header checkbox by construction — both
 * are driven by the same `onToggleSelectAll` / `selectedCount` from the page, so
 * they cannot disagree.
 */
export default function SelectionBar({
  selectedCount,
  visibleCount,
  onToggleSelectAll,
  onClear,
  children,
  alwaysShow = true,
}: SelectionBarProps) {
  const { t } = useTranslation()
  const boxRef = useRef<HTMLInputElement>(null)

  const allSelected = visibleCount > 0 && selectedCount === visibleCount
  const partial = selectedCount > 0 && selectedCount < visibleCount

  // `indeterminate` is a DOM property, not an HTML attribute — React cannot set
  // it via JSX, so it has to be written through the ref.
  useEffect(() => {
    if (boxRef.current) boxRef.current.indeterminate = partial
  }, [partial])

  if (!alwaysShow && selectedCount === 0) return null
  if (visibleCount === 0) return null

  const active = selectedCount > 0

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
        active
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* The visual box stays 16px to match the desktop table header, but the
          label gives it a 44px touch target. */}
      <label className="inline-flex items-center justify-center w-11 h-11 -my-2 -ml-2 cursor-pointer shrink-0">
        <input
          ref={boxRef}
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSelectAll}
          aria-label={t('common.selectAll')}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
        />
      </label>

      <span
        className={`text-sm ${
          active
            ? 'font-medium text-green-800 dark:text-green-300'
            : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        {active ? t('common.nSelected', { count: selectedCount }) : t('common.selectAll')}
      </span>

      {active && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-green-600 dark:text-green-400 hover:underline"
        >
          {t('common.clearSelection')}
        </button>
      )}

      {children && (
        <>
          <div className="flex-1" />
          {children}
        </>
      )}
    </div>
  )
}
