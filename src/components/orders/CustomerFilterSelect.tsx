// Exact-match customer filter for the Orders page toolbar.
// Unlike the free-text search (substring, so "Sohbet" also matches
// "Sohbet BBQ cafe"), this picks one specific customer by id, letting you
// isolate and export a single customer's orders.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Check, ChevronDown, Search, X } from 'lucide-react'
import { fetchCustomers } from '../../services/customers'
import type { Customer } from '../../types'

interface CustomerFilterSelectProps {
  value: string | undefined
  onChange: (customerId: string | undefined) => void
}

export default function CustomerFilterSelect({ value, onChange }: CustomerFilterSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Load the full customer list once (up to the service default cap).
  useEffect(() => {
    fetchCustomers().then(setCustomers).catch(console.error)
  }, [])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = useMemo(() => customers.find(c => c.id === value), [customers, value])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    const tokens = q.split(/\s+/).filter(Boolean)
    return customers.filter(c => {
      const name = c.company_name.toLowerCase()
      const contact = c.contact_person?.toLowerCase() ?? ''
      return tokens.every(tok => name.includes(tok) || contact.includes(tok))
    })
  }, [customers, search])

  const pick = (id: string | undefined) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full sm:w-56 flex items-center gap-2 pl-4 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
      >
        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
        <span className={`flex-1 truncate ${selected ? '' : 'text-slate-500 dark:text-slate-400'}`}>
          {selected ? selected.company_name : t('orders.allCustomers')}
        </span>
        {selected ? (
          <X
            className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
            onClick={e => { e.stopPropagation(); pick(undefined) }}
          />
        ) : (
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-full sm:w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('orders.searchCustomer')}
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => pick(undefined)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60"
              >
                <span className="w-4 shrink-0">{!value && <Check className="w-4 h-4 text-green-600" />}</span>
                {t('orders.allCustomers')}
              </button>
            </li>
            {filtered.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pick(c.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                >
                  <span className="w-4 shrink-0">{value === c.id && <Check className="w-4 h-4 text-green-600" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{c.company_name}</span>
                    {c.contact_person && (
                      <span className="block truncate text-xs text-slate-400 dark:text-slate-500">{c.contact_person}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
                {t('common.noResults')}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
