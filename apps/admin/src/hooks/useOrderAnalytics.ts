import { useState, useEffect, useCallback } from 'react'
import {
  getOrderPerformance,
  type OrderPerformanceRow,
} from '../services/analytics'
import { filtersKey, type AnalyticsFilters } from '../services/analyticsHelpers'
import type { DateRange } from './useDateRange'

interface OrderAnalyticsState {
  loading: boolean
  error: string | null
  orders: OrderPerformanceRow[]
}

export function useOrderAnalytics(dateRange: DateRange, statuses: string[] = [], filters: AnalyticsFilters = {}) {
  const statusKey = statuses.join(',')
  const filterKey = filtersKey(filters)
  const [state, setState] = useState<OrderAnalyticsState>({
    loading: true,
    error: null,
    orders: [],
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { start, end } = dateRange
      const orders = await getOrderPerformance(start, end, statuses, filters)

      setState({
        loading: false,
        error: null,
        orders,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load order analytics',
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end, statusKey, filterKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return state
}
