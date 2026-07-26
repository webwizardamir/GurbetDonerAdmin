/**
 * Shared Tailwind class strings for form controls and toolbar buttons.
 *
 * These are the ~12 strings that were duplicated verbatim across the list pages.
 * Every constant is copied from an existing call site with exactly two
 * intentional changes:
 *
 *   1. `text-sm` -> `text-base md:text-sm` on inputs and selects. iOS Safari
 *      force-zooms the viewport when a focused control is under 16px and never
 *      zooms back out; index.css carries a belt-and-braces @media rule for the
 *      inputs this file does not reach.
 *   2. toolbar button heights normalise to `h-11` (44px touch target). They were
 *      `py-2.5` on a text-sm line-box, i.e. ~42px — a 2px change.
 *
 * This is NOT a licence to restyle. Anything else belongs in its own change.
 */

/** Text input. Pair with `relative` + `inputIcon` when it has a leading icon. */
export const input =
  'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ' +
  'rounded-xl text-base md:text-sm text-slate-900 dark:text-white placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-green-500'

export const inputWithIcon = input.replace('px-4', 'pl-10 pr-4')
export const inputIcon =
  'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none'

/** Native <select>. Desktop short lists only — on mobile these become chips or a
 *  searchable picker inside the filter sheet. */
export const select =
  'pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ' +
  'rounded-xl text-base md:text-sm text-slate-900 dark:text-white ' +
  'focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer'
export const selectWithIcon = select.replace('pl-4', 'pl-9')

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 shrink-0 h-11 px-3 sm:px-4 rounded-xl ' +
  'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium ' +
  'whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ' +
  'dark:focus-visible:ring-offset-slate-900'

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 shrink-0 h-11 px-3 sm:px-4 rounded-xl border ' +
  'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ' +
  'text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition-colors ' +
  'hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500'

/** 44px square icon button. */
export const btnIcon =
  'inline-flex items-center justify-center shrink-0 w-11 h-11 rounded-xl border ' +
  'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ' +
  'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500'

/** Checkbox, matched to the existing look across the app. */
export const checkbox =
  'w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0'

/** The Filters trigger. `active` = at least one filter set. */
export const filterButton = (active: boolean) =>
  'relative inline-flex items-center justify-center gap-2 shrink-0 h-11 px-3.5 rounded-xl border ' +
  'text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ' +
  (active
    ? 'bg-green-50 dark:bg-green-600/10 border-green-500 dark:border-green-500 text-green-700 dark:text-green-400'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700')

export const filterBadge =
  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full ' +
  'bg-green-600 text-white text-[11px] font-semibold leading-none tabular-nums'

/** Selectable chip inside the filter sheet. */
export const chip = (selected: boolean) =>
  'inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ' +
  (selected
    ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700')

/** Row inside the overflow (⋮) menu. */
export const menuItem =
  'flex w-full items-center gap-3 px-4 py-3 min-h-[44px] text-left text-sm ' +
  'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'
