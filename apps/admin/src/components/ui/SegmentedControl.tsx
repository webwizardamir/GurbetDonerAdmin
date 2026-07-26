import type { LucideIcon } from 'lucide-react'
import type { FilterOption } from './filterTypes'

interface SegmentedControlProps {
  value: string
  options: FilterOption[]
  onChange: (v: string) => void
  /** Leading label pill (e.g. Sold Products' "Groeperen"). */
  leadingLabel?: string
  leadingIcon?: LucideIcon
  /** 'auto' shrinks to content and scrolls when it overflows (default);
   *  'full' shares the width equally, used inside the filter sheet. */
  width?: 'auto' | 'full'
  /** 'radio' sets a value (grouping); 'tabs' switches view (Outbox, Overdue). */
  as?: 'radio' | 'tabs'
  'aria-label'?: string
}

/**
 * De-duplicates the identical hand-rolled idiom in Outbox and SoldProducts.
 * Pixel-identical to what they had, except it can now scroll instead of
 * overflowing a narrow phone.
 */
export default function SegmentedControl({
  value,
  options,
  onChange,
  leadingLabel,
  leadingIcon: LeadingIcon,
  width = 'auto',
  as = 'radio',
  'aria-label': ariaLabel,
}: SegmentedControlProps) {
  const full = width === 'full'
  return (
    <div
      role={as === 'tabs' ? 'tablist' : 'radiogroup'}
      aria-label={ariaLabel}
      className={`inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden max-w-full overflow-x-auto scrollbar-hidden [scroll-snap-type:x_proximity] ${
        full ? 'flex w-full' : ''
      }`}
    >
      {leadingLabel && (
        <span className="shrink-0 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
          {LeadingIcon && <LeadingIcon className="w-3.5 h-3.5" />}
          {leadingLabel}
        </span>
      )}
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role={as === 'tabs' ? 'tab' : 'radio'}
            aria-selected={as === 'tabs' ? selected : undefined}
            aria-checked={as === 'radio' ? selected : undefined}
            onClick={() => onChange(o.value)}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 h-11 text-sm font-medium whitespace-nowrap transition-colors [scroll-snap-align:start]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500
              ${full ? 'flex-1' : ''}
              ${selected ? 'bg-green-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}
              ${i > 0 || leadingLabel ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}
          >
            {o.label}
            {o.count != null && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
