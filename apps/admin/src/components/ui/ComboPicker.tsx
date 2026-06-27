// Compact searchable single-select for filter bars. Shows a trigger button
// (selected label or placeholder); clicking opens a search + option popover.
// Selecting an option calls onChange(value); the "all" row clears to null.

import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, Loader2, type LucideIcon } from 'lucide-react'

export interface ComboOption {
  value: string
  label: string
  sublabel?: string
}

interface ComboPickerProps {
  value: string | null
  options: ComboOption[]
  onChange: (value: string | null) => void
  placeholder: string          // shown when nothing is selected (e.g. "Alle klanten")
  searchPlaceholder: string
  icon?: LucideIcon
  loading?: boolean
}

export default function ComboPicker({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  icon: Icon,
  loading = false,
}: ComboPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Reset the search term whenever the popover closes, so reopening starts clean.
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = value ? options.find(o => o.value === value) ?? null : null
  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.sublabel?.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 pl-3 pr-2 py-2.5 min-w-[150px] max-w-[220px] bg-white dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer ${
          selected
            ? 'border-green-300 dark:border-green-800 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
        }`}
      >
        {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-400" />}
        <span className="truncate flex-1 text-left">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-72 max-w-[80vw] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); setSearch('') }}
              className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <span className="text-slate-500 dark:text-slate-400">{placeholder}</span>
              {!value && <X className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            {loading ? (
              <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">—</p>
            ) : (
              filtered.slice(0, 50).map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    o.value === value ? 'bg-green-50 dark:bg-green-900/20' : ''
                  }`}
                >
                  <p className="font-medium text-slate-900 dark:text-white truncate">{o.label}</p>
                  {o.sublabel && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{o.sublabel}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
