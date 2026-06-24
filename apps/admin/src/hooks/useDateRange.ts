import { useState, useCallback } from 'react'
import { getDateRanges } from '../services/analytics'

export type DateRangeKey = 'today' | 'last7Days' | 'last30Days' | 'last90Days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'

export interface DateRange {
  start: string
  end: string
  label: string
}

export function useDateRange(defaultKey: DateRangeKey = 'last30Days') {
  const ranges = getDateRanges()

  const [dateRange, setDateRangeState] = useState<DateRange>(ranges[defaultKey as keyof typeof ranges] || ranges.last30Days)
  const [dateRangeKey, setDateRangeKeyState] = useState<DateRangeKey>(defaultKey)

  const setDateRange = useCallback((key: DateRangeKey, customRange?: { start: string; end: string }) => {
    const ranges = getDateRanges()
    let newRange: DateRange

    if (key === 'custom' && customRange) {
      newRange = { ...customRange, label: 'Custom' }
    } else {
      newRange = ranges[key as keyof typeof ranges] || ranges.last30Days
    }

    setDateRangeKeyState(key)
    setDateRangeState(newRange)
  }, [])

  return {
    dateRange,
    dateRangeKey,
    setDateRange,
    dateRanges: ranges,
  }
}
