import { useState, useEffect, useCallback } from 'react'
import {
  getExpiryRisk,
  getInventoryTurnover,
  getBatchAging,
  type ExpiryRiskRow,
  type TurnoverRow,
  type BatchAgingBucket,
} from '../services/analytics'
import type { DateRange } from './useDateRange'

interface InventoryAnalyticsState {
  loading: boolean
  error: string | null
  expiryRisk: ExpiryRiskRow[]
  turnover: TurnoverRow[]
  batchAging: BatchAgingBucket[]
}

export function useInventoryAnalytics(dateRange: DateRange) {
  const [state, setState] = useState<InventoryAnalyticsState>({
    loading: true,
    error: null,
    expiryRisk: [],
    turnover: [],
    batchAging: [],
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const [expiryRisk, turnover, batchAging] = await Promise.all([
        getExpiryRisk(),
        getInventoryTurnover(dateRange.start, dateRange.end),
        getBatchAging(),
      ])

      setState({
        loading: false,
        error: null,
        expiryRisk,
        turnover,
        batchAging,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load inventory analytics',
      }))
    }
  }, [dateRange.start, dateRange.end])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return state
}
