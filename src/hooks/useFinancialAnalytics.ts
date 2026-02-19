import { useState, useEffect, useCallback } from 'react'
import {
  getFinancialSummary,
  getMonthlyComparison,
  getRevenueByCategoryFlat,
  type FinancialSummary,
  type MonthlyRow,
  type CategoryRevenueRow,
} from '../services/analytics'
import type { DateRange } from './useDateRange'

interface FinancialAnalyticsState {
  loading: boolean
  error: string | null
  summary: FinancialSummary | null
  monthly: MonthlyRow[]
  categories: CategoryRevenueRow[]
  selectedYear: number
}

export function useFinancialAnalytics(dateRange: DateRange) {
  const currentYear = new Date().getFullYear()
  const [state, setState] = useState<FinancialAnalyticsState>({
    loading: true,
    error: null,
    summary: null,
    monthly: [],
    categories: [],
    selectedYear: currentYear,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { start, end } = dateRange

      const [summary, monthly, categories] = await Promise.all([
        getFinancialSummary(start, end),
        getMonthlyComparison(state.selectedYear),
        getRevenueByCategoryFlat(start, end),
      ])

      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        summary,
        monthly,
        categories,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load financial analytics',
      }))
    }
  }, [dateRange.start, dateRange.end, state.selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const setYear = useCallback((year: number) => {
    setState(prev => ({ ...prev, selectedYear: year }))
  }, [])

  return {
    ...state,
    setYear,
  }
}
