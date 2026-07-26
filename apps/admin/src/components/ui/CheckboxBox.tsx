import { Check } from 'lucide-react'

/**
 * Checkbox VISUAL only — no native input, because the surrounding row button
 * owns the click. Shared by MultiSelectFilter and SearchSelect's multi mode so
 * a checkbox looks the same wherever a list is multi-selectable.
 */
export default function CheckboxBox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
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
