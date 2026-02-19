import { useState, useEffect, useCallback } from 'react'
import {
  getProductPerformance,
  getSlowMovers,
  getRevenueByCategoryFlat,
  type ProductPerformanceRow,
  type SlowMoverRow,
  type CategoryRevenueRow,
} from '../services/analytics'
import type { DateRange } from './useDateRange'

interface ProductAnalyticsState {
  loading: boolean
  error: string | null
  products: ProductPerformanceRow[]
  slowMovers: SlowMoverRow[]
  categories: CategoryRevenueRow[]
}

export function useProductAnalytics(dateRange: DateRange) {
  const [state, setState] = useState<ProductAnalyticsState>({
    loading: true,
    error: null,
    products: [],
    slowMovers: [],
    categories: [],
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { start, end } = dateRange

      const [products, slowMovers, categories] = await Promise.all([
        getProductPerformance(start, end),
        getSlowMovers(60),
        getRevenueByCategoryFlat(start, end),
      ])

      setState({
        loading: false,
        error: null,
        products,
        slowMovers,
        categories,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load product analytics',
      }))
    }
  }, [dateRange.start, dateRange.end])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return state
}
