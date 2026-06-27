import { useState, useEffect, useCallback } from 'react'
import {
  getCustomerPerformance,
  type CustomerPerformanceRow,
} from '../services/analytics'
import { filtersKey, type AnalyticsFilters } from '../services/analyticsHelpers'
import type { DateRange } from './useDateRange'

interface CustomerAnalyticsState {
  loading: boolean
  error: string | null
  customers: CustomerPerformanceRow[]
}

export function useCustomerAnalytics(dateRange: DateRange, statuses: string[] = [], filters: AnalyticsFilters = {}) {
  const statusKey = statuses.join(',')
  const filterKey = filtersKey(filters)
  const [state, setState] = useState<CustomerAnalyticsState>({
    loading: true,
    error: null,
    customers: [],
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const customers = await getCustomerPerformance(dateRange.start, dateRange.end, statuses, filters)

      setState({
        loading: false,
        error: null,
        customers,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load customer analytics',
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end, statusKey, filterKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return state
}
