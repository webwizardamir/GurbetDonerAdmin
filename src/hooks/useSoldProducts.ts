import { useState, useEffect, useCallback } from 'react'
import {
  getSoldProducts,
  getDateRangePresets,
  type SoldProductItem,
  type SoldProductsResult,
} from '../services/soldProducts'

export type DateRangeKey = 'yesterday' | 'today' | 'last7Days' | 'thisWeek' | 'lastWeek' | 'custom'

interface DateRange {
  start: string
  end: string
  label: string
}

interface SoldProductsState {
  loading: boolean
  error: string | null
  items: SoldProductItem[]
  summary: SoldProductsResult['summary'] | null
  dateRange: DateRange
  dateRangeKey: DateRangeKey
}

export function useSoldProducts() {
  const presets = getDateRangePresets()

  const [state, setState] = useState<SoldProductsState>({
    loading: true,
    error: null,
    items: [],
    summary: null,
    dateRange: presets.yesterday,
    dateRangeKey: 'yesterday',
  })

  // Set date range
  const setDateRange = useCallback((
    key: DateRangeKey,
    customRange?: { start: string; end: string }
  ) => {
    const presets = getDateRangePresets()
    let newRange: DateRange

    if (key === 'custom' && customRange) {
      newRange = { ...customRange, label: 'Custom' }
    } else {
      newRange = presets[key as keyof typeof presets] || presets.yesterday
    }

    setState(prev => ({
      ...prev,
      dateRangeKey: key,
      dateRange: newRange,
    }))
  }, [])

  // Fetch data
  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await getSoldProducts(
        state.dateRange.start,
        state.dateRange.end
      )

      setState(prev => ({
        ...prev,
        loading: false,
        items: result.items,
        summary: result.summary,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load sold products',
      }))
    }
  }, [state.dateRange.start, state.dateRange.end])

  // Fetch when date range changes
  useEffect(() => {
    fetchData()
  }, [state.dateRange.start, state.dateRange.end])

  // Refresh function
  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    ...state,
    setDateRange,
    refresh,
    dateRanges: presets,
  }
}
