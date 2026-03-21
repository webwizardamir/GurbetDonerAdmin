import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import type { DateRangeKey } from '../../hooks/useAnalytics'

interface DateRangePickerProps {
  currentKey: DateRangeKey
  currentLabel: string
  dateRanges: Record<string, { start: string; end: string; label: string }>
  onSelect: (key: DateRangeKey, customRange?: { start: string; end: string }) => void
}

export default function DateRangePicker({
  currentKey,
  currentLabel,
  dateRanges: _dateRanges,
  onSelect,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handleSelect = (key: string) => {
    if (key === 'custom') {
      setShowCustom(true)
    } else {
      onSelect(key as DateRangeKey)
      setIsOpen(false)
      setShowCustom(false)
    }
  }

  const handleCustomSubmit = () => {
    if (customStart && customEnd) {
      onSelect('custom', { start: customStart, end: customEnd })
      setIsOpen(false)
      setShowCustom(false)
    }
  }

  const rangeOptions = [
    { key: 'today', label: 'Today' },
    { key: 'last7Days', label: 'Last 7 days' },
    { key: 'last30Days', label: 'Last 30 days' },
    { key: 'last90Days', label: 'Last 90 days' },
    { key: 'thisMonth', label: 'This month' },
    { key: 'lastMonth', label: 'Last month' },
    { key: 'thisYear', label: 'This year' },
    { key: 'custom', label: 'Custom range...' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
      >
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="truncate max-w-[100px] sm:max-w-none">{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false)
              setShowCustom(false)
            }}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden">
            {!showCustom ? (
              <div className="py-1">
                {rangeOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={() => handleSelect(option.key)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      currentKey === option.key
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustom(false)}
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customStart || !customEnd}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
