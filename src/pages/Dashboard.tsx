/**
 * Dashboard - Main dashboard page composing all dashboard components.
 * Layout: Greeting, KPI cards, action banner, then 2-column grid
 * with orders list on left and chart + stock alerts on right.
 */
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDashboardV2 } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'
import DashboardGreeting from '../components/dashboard/DashboardGreeting'
import TodayKPICards from '../components/dashboard/TodayKPICards'
import type { TodayStats } from '../components/dashboard/TodayKPICards'
import ActionRequiredBanner from '../components/dashboard/ActionRequiredBanner'
import type { ActionRequired } from '../components/dashboard/ActionRequiredBanner'
import OverdueWidget from '../components/dashboard/OverdueWidget'
import TodayOrdersList from '../components/dashboard/TodayOrdersList'
import StockAlerts from '../components/dashboard/StockAlerts'
import WeeklyMiniChart from '../components/dashboard/WeeklyMiniChart'
import type { WeeklyStats } from '../components/dashboard/WeeklyMiniChart'

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-pulse ${className}`}>
      <div className="p-5 space-y-3">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-3 w-40 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greeting skeleton */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
        <div className="h-4 w-48 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-pulse">
            <div className="h-0.5 bg-slate-200 dark:bg-slate-700" />
            <div className="p-4 space-y-3">
              <div className="w-11 h-11 bg-slate-100 dark:bg-slate-700 rounded-xl" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Two column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard className="min-h-[300px]" />
        <div className="space-y-6">
          <SkeletonCard className="min-h-[250px]" />
          <SkeletonCard className="min-h-[200px]" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const navigate = useNavigate()
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
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            {t('dashboard.error.title')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            {t('dashboard.error.subtitle')}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mb-5 font-mono bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
            {error}
          </p>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold shadow-md shadow-green-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.tryAgain')}
          </button>
        </div>
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
    <div className="space-y-6">
      <DashboardGreeting
        onRefresh={refresh}
        onNewOrder={() => navigate('/orders/new')}
        ordersToday={todayStats?.ordersToday ?? 0}
        pendingCount={todayStats?.pendingCount ?? 0}
      />
      <TodayKPICards todayStats={todayStats} isOwner={isOwner} />
      <ActionRequiredBanner actionRequired={actionRequired} />
      <OverdueWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Orders */}
        <TodayOrdersList orders={todayOrders} isOwner={isOwner} />

        {/* Right column - Chart & Stock */}
        <div className="space-y-6">
          <WeeklyMiniChart weeklyStats={weeklyStats} isOwner={isOwner} />
          <StockAlerts lowStockProducts={stockAlertProducts} isOwner={isOwner} />
        </div>
      </div>
    </div>
  )
}
