import { useState, useEffect, useCallback } from 'react'
import {
  getDashboardStats,
  getTodaysOrders,
  getRevenueByPaymentMethod,
  getLowStockProducts,
  getTodayStats,
  getWeeklyStats,
  getActionRequired,
  getTodayOrdersByStatus,
  type DashboardStats,
  type TodayOrder,
  type PaymentMethodBreakdown,
  type LowStockProduct,
  type TodayStats,
  type WeeklyStats,
  type ActionRequired,
  type TodayOrdersByStatus,
} from '../services/analytics'

// --- Legacy interface (preserved for existing consumers) ---

export interface DashboardData {
  stats: DashboardStats
  todaysOrders: TodayOrder[]
  paymentBreakdown: PaymentMethodBreakdown[]
  lowStockProducts: LowStockProduct[]
}

// --- Legacy hook (preserved, not broken) ---

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const today = new Date().toISOString().split('T')[0]

      // Fetch all data in parallel
      const [stats, todaysOrders, paymentBreakdown, lowStockProducts] = await Promise.all([
        getDashboardStats(),
        getTodaysOrders(),
        getRevenueByPaymentMethod(today, today),
        getLowStockProducts(30),
      ])

      setData({
        stats,
        todaysOrders,
        paymentBreakdown,
        lowStockProducts,
      })
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return {
    data,
    loading,
    error,
    refresh: fetchDashboard,
  }
}

// --- New today-focused dashboard hook ---

export interface DashboardV2Data {
  todayStats: TodayStats | null
  weeklyStats: WeeklyStats | null
  actionRequired: ActionRequired | null
  todaysOrders: TodayOrder[]
  todayOrdersByStatus: TodayOrdersByStatus
  lowStockProducts: LowStockProduct[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useDashboardV2(isOwner: boolean): DashboardV2Data {
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [actionRequired, setActionRequired] = useState<ActionRequired | null>(null)
  const [todaysOrders, setTodaysOrders] = useState<TodayOrder[]>([])
  const [todayOrdersByStatus, setTodayOrdersByStatus] = useState<TodayOrdersByStatus>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        todayStatsData,
        weeklyStatsData,
        actionRequiredData,
        todayOrdersByStatusData,
        todaysOrdersData,
        lowStockData,
      ] = await Promise.all([
        getTodayStats(isOwner),
        getWeeklyStats(isOwner),
        getActionRequired(),
        getTodayOrdersByStatus(),
        getTodaysOrders(),
        getLowStockProducts(30),
      ])

      setTodayStats(todayStatsData)
      setWeeklyStats(weeklyStatsData)
      setActionRequired(actionRequiredData)
      setTodayOrdersByStatus(todayOrdersByStatusData)
      setTodaysOrders(todaysOrdersData)
      setLowStockProducts(lowStockData)
    } catch (err) {
      console.error('Failed to fetch dashboard v2 data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [isOwner])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    todayStats,
    weeklyStats,
    actionRequired,
    todaysOrders,
    todayOrdersByStatus,
    lowStockProducts,
    loading,
    error,
    refresh: fetchAll,
  }
}
