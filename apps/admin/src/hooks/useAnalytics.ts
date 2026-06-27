import { useState, useEffect, useCallback } from 'react'
import {
  getRevenueByDay,
  getOrdersByStatus,
  getRevenueByPaymentMethod,
  getTopCustomers,
  getTopProducts,
  getKPIs,
  type RevenueDataPoint,
  type OrderStatusCount,
  type PaymentMethodBreakdown,
  type TopCustomer,
  type TopProduct,
  type KPIData,
} from '../services/analytics'
import { filtersKey, type AnalyticsFilters } from '../services/analyticsHelpers'
import type { DateRange } from './useDateRange'

// Re-export for backwards compatibility
export type { DateRange }
export type { DateRangeKey } from './useDateRange'

interface OverviewData {
  loading: boolean
  error: string | null
  revenueData: RevenueDataPoint[]
  ordersByStatus: OrderStatusCount[]
  paymentBreakdown: PaymentMethodBreakdown[]
  topCustomers: TopCustomer[]
  topProducts: TopProduct[]
  kpis: KPIData | null
}

export function useOverviewAnalytics(dateRange: DateRange, statuses: string[] = [], filters: AnalyticsFilters = {}) {
  const statusKey = statuses.join(',')
  const filterKey = filtersKey(filters)
  const [state, setState] = useState<OverviewData>({
    loading: true,
    error: null,
    revenueData: [],
    ordersByStatus: [],
    paymentBreakdown: [],
    topCustomers: [],
    topProducts: [],
    kpis: null,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { start, end } = dateRange

      const [revenueData, ordersByStatus, paymentBreakdown, topCustomers, topProducts, kpis] = await Promise.all([
        getRevenueByDay(start, end, statuses, filters),
        getOrdersByStatus(start, end, statuses),
        getRevenueByPaymentMethod(start, end, statuses),
        getTopCustomers(start, end, 10, statuses),
        getTopProducts(start, end, 10, statuses, filters),
        getKPIs(start, end, statuses, filters),
      ])

      setState({
        loading: false,
        error: null,
        revenueData,
        ordersByStatus,
        paymentBreakdown,
        topCustomers,
        topProducts,
        kpis,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load analytics',
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end, statusKey, filterKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    ...state,
    refresh,
  }
}
