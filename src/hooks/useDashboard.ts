import { useState, useEffect, useCallback } from 'react'
import {
  getDashboardStats,
  getTodaysOrders,
  getRevenueByPaymentMethod,
  getLowStockProducts,
  type DashboardStats,
  type TodayOrder,
  type PaymentMethodBreakdown,
  type LowStockProduct,
} from '../services/analytics'

export interface DashboardData {
  stats: DashboardStats
  todaysOrders: TodayOrder[]
  paymentBreakdown: PaymentMethodBreakdown[]
  lowStockProducts: LowStockProduct[]
}

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
