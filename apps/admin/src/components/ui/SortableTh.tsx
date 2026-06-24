import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import type { SortDir } from '../../hooks/useTableSort'

interface SortableThProps<K extends string> {
  /** Stable key identifying this column for sort state. */
  sortKey: K
  /** Currently active sort key (from the hook). */
  current: K | null
  dir: SortDir
  onToggle: (key: K) => void
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  /** Extra Tailwind classes — width helpers, sticky, etc. */
  className?: string
}

/**
 * Header cell that toggles sort state on click. Visual indicator:
 * - Inactive: faint up/down chevron pair
 * - Active asc: solid up arrow
 * - Active desc: solid down arrow
 *
 * Designed to drop into any existing <thead><tr><th>...</th></tr></thead>
 * — inherits the same padding / styling as a plain <th>.
 */
export default function SortableTh<K extends string>({
  sortKey,
  current,
  dir,
  onToggle,
  children,
  align = 'left',
  className = '',
}: SortableThProps<K>) {
  const isActive = current === sortKey
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  const flexJustify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

  return (
    <th
      onClick={() => onToggle(sortKey)}
      className={`px-4 py-3 ${alignClass} text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
        isActive
          ? 'text-green-700 dark:text-green-400'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
      } ${className}`}
      aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className={`inline-flex items-center gap-1 ${flexJustify}`}>
        {children}
        {isActive
          ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </span>
    </th>
  )
}
