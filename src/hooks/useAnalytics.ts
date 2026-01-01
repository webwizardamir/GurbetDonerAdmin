import { useState, useEffect, useCallback } from 'react'
import {
  getRevenueByDay,
  getOrdersByStatus,
  getRevenueByPaymentMethod,
  getTopCustomers,
  getTopProducts,
  getKPIs,
  getDateRanges,
  type RevenueDataPoint,
  type OrderStatusCount,
  type PaymentMethodBreakdown,
  type TopCustomer,
  type TopProduct,
  type KPIData,
} from '../services/analytics'

export type DateRangeKey = 'today' | 'last7Days' | 'last30Days' | 'last90Days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'

interface DateRange {
  start: string
  end: string
  label: string
}

interface AnalyticsState {
  loading: boolean
  error: string | null
  dateRange: DateRange
  dateRangeKey: DateRangeKey
  revenueData: RevenueDataPoint[]
  ordersByStatus: OrderStatusCount[]
  paymentBreakdown: PaymentMethodBreakdown[]
  topCustomers: TopCustomer[]
  topProducts: TopProduct[]
  kpis: KPIData | null
}

export function useAnalytics() {
  const ranges = getDateRanges()

  const [state, setState] = useState<AnalyticsState>({
    loading: true,
    error: null,
    dateRange: ranges.last30Days,
    dateRangeKey: 'last30Days',
    revenueData: [],
    ordersByStatus: [],
    paymentBreakdown: [],
    topCustomers: [],
    topProducts: [],
    kpis: null,
  })

  // Set date range
  const setDateRange = useCallback((key: DateRangeKey, customRange?: { start: string; end: string }) => {
    const ranges = getDateRanges()
    let newRange: DateRange

    if (key === 'custom' && customRange) {
      newRange = { ...customRange, label: 'Custom' }
    } else {
      newRange = ranges[key as keyof typeof ranges] || ranges.last30Days
    }

    setState(prev => ({
      ...prev,
      dateRangeKey: key,
      dateRange: newRange,
    }))
  }, [])

  // Fetch all analytics data
  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { start, end } = state.dateRange

      // Fetch all data in parallel
      const [revenueData, ordersByStatus, paymentBreakdown, topCustomers, topProducts, kpis] = await Promise.all([
        getRevenueByDay(start, end),
        getOrdersByStatus(start, end),
        getRevenueByPaymentMethod(start, end),
        getTopCustomers(start, end, 10),
        getTopProducts(start, end, 10),
        getKPIs(start, end),
      ])

      setState(prev => ({
        ...prev,
        loading: false,
        revenueData,
        ordersByStatus,
        paymentBreakdown,
        topCustomers,
        topProducts,
        kpis,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load analytics',
      }))
    }
  }, [state.dateRange])

  // Refetch when date range changes
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
    dateRanges: ranges,
  }
}
