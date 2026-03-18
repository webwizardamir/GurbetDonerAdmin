/**
 * Dashboard - Main dashboard page composing all dashboard components.
 * Layout: Greeting, KPI cards, action banner, then 2-column grid
 * with orders list on left and chart + stock alerts on right.
 */
import { Loader2, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDashboardV2 } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'
import DashboardGreeting from '../components/dashboard/DashboardGreeting'
import TodayKPICards from '../components/dashboard/TodayKPICards'
import type { TodayStats } from '../components/dashboard/TodayKPICards'
import ActionRequiredBanner from '../components/dashboard/ActionRequiredBanner'
import type { ActionRequired } from '../components/dashboard/ActionRequiredBanner'
import TodayOrdersList from '../components/dashboard/TodayOrdersList'
import StockAlerts from '../components/dashboard/StockAlerts'
import WeeklyMiniChart from '../components/dashboard/WeeklyMiniChart'
import type { WeeklyStats } from '../components/dashboard/WeeklyMiniChart'

export default function Dashboard() {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const {
    todayStats: rawTodayStats,
    weeklyStats: rawWeeklyStats,
    actionRequired: rawAction,
    todaysOrders,
    lowStockProducts,
    loading,
    error,
    refresh,
  } = useDashboardV2(isOwner)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
        >
          {t('common.tryAgain')}
        </button>
      </div>
    )
  }

  // Map service types to component props
  const todayStats: TodayStats | null = rawTodayStats
    ? {
        ordersToday: 'orders_today' in rawTodayStats ? rawTodayStats.orders_today : 0,
        pendingCount: 'pending_count' in rawTodayStats ? rawTodayStats.pending_count : 0,
        lowStockCount: lowStockProducts.length,
        yesterdayRevenue: isOwner && 'yesterday_revenue' in rawTodayStats ? rawTodayStats.yesterday_revenue : undefined,
        deliveriesToday: !isOwner && 'deliveries_today' in rawTodayStats ? rawTodayStats.deliveries_today : undefined,
      }
    : null

  const actionRequired: ActionRequired | null = rawAction
    ? {
        overduePayments: rawAction.overdue_payments,
        zeroStockCount: rawAction.zero_stock_count,
        ordersOnHold: rawAction.orders_on_hold,
      }
    : null

  const weeklyStats: WeeklyStats | null = rawWeeklyStats
    ? {
        revenue: rawWeeklyStats.this_week_revenue,
        revenuePrevWeek: rawWeeklyStats.last_week_revenue,
        revenueChange: rawWeeklyStats.revenue_change_pct,
        orders: rawWeeklyStats.this_week_orders,
        ordersPrevWeek: rawWeeklyStats.last_week_orders,
        ordersChange: rawWeeklyStats.orders_change_pct,
        dailyData: [], // Will be populated when daily breakdown RPC is available
      }
    : null

  const todayOrders = todaysOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    status: o.status,
    total: o.total,
  }))

  const stockAlertProducts = lowStockProducts.map((p) => ({
    id: p.id,
    name: p.name,
    currentStock: p.stockQuantity,
    unitType: p.unitType || 'kg',
  }))

  return (
    <div className="space-y-4">
      <DashboardGreeting onRefresh={refresh} />
      <TodayKPICards todayStats={todayStats} isOwner={isOwner} />
      <ActionRequiredBanner actionRequired={actionRequired} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column - Orders */}
        <TodayOrdersList orders={todayOrders} isOwner={isOwner} />

        {/* Right column - Chart & Stock */}
        <div className="space-y-4">
          <WeeklyMiniChart weeklyStats={weeklyStats} isOwner={isOwner} />
          <StockAlerts lowStockProducts={stockAlertProducts} isOwner={isOwner} />
        </div>
      </div>
    </div>
  )
}
