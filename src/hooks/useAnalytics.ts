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

export function useOverviewAnalytics(dateRange: DateRange) {
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
        getRevenueByDay(start, end),
        getOrdersByStatus(start, end),
        getRevenueByPaymentMethod(start, end),
        getTopCustomers(start, end, 10),
        getTopProducts(start, end, 10),
        getKPIs(start, end),
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
  }, [dateRange.start, dateRange.end])

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
