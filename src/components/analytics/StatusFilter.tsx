import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, ChevronDown, Check } from 'lucide-react'

// Statuses offered in the analytics filter. Mirrors the OrdersTab list.
// An empty selection means "default": every order except cancelled/refunded.
export const ANALYTICS_STATUS_OPTIONS = [
  'draft',
  'pending_payment',
  'on_hold',
  'completed',
  'delivered',
  'cancelled',
  'refunded',
] as const

interface StatusFilterProps {
  selected: string[]
  onChange: (statuses: string[]) => void
}

export default function StatusFilter({ selected, onChange }: StatusFilterProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const toggle = (status: string) => {
    if (selected.includes(status)) {
      onChange(selected.filter(s => s !== status))
    } else {
      onChange([...selected, status])
    }
  }

  const label =
    selected.length === 0
      ? t('analytics.statusFilter.all')
      : selected.length === 1
        ? t(`orders.status.${selected[0]}`)
        : t('analytics.statusFilter.count', { count: selected.length })

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap ${
          selected.length > 0
            ? 'border-green-500 dark:border-green-500'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-none">{label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => onChange([])}
              className={`w-full px-4 py-2 text-left text-sm transition-colors border-b border-slate-100 dark:border-slate-700 ${
                selected.length === 0
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('analytics.statusFilter.all')}
            </button>
            <div className="py-1 max-h-72 overflow-y-auto">
              {ANALYTICS_STATUS_OPTIONS.map(status => {
                const isChecked = selected.includes(status)
                return (
                  <button
                    key={status}
                    onClick={() => toggle(status)}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span
                      className={`flex items-center justify-center w-4 h-4 rounded border flex-shrink-0 ${
                        isChecked
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                    {t(`orders.status.${status}`)}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
