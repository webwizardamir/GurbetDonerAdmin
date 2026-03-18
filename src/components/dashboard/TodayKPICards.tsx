/**
 * TodayKPICards - Compact KPI stat cards for the dashboard.
 * Shows 4 cards in a 2x2 (mobile) or 4-column (desktop) grid.
 * Owner sees: Orders Today, Awaiting Payment, Stock Alerts, Yesterday's Revenue.
 * Shop Manager sees: Orders Today, Awaiting Payment, Stock Alerts, To Deliver Today.
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Clock, AlertTriangle, TrendingUp, Truck } from 'lucide-react'
import { formatPrice } from '../../utils/format'

export interface TodayStats {
  ordersToday: number
  pendingCount: number
  lowStockCount: number
  revenueToday?: number
  profitToday?: number
  yesterdayRevenue?: number
  itemsToPick?: number
  deliveriesToday?: number
}

interface TodayKPICardsProps {
  todayStats: TodayStats | null
  isOwner: boolean
}

export default function TodayKPICards({ todayStats, isOwner }: TodayKPICardsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const stats = todayStats || {
    ordersToday: 0,
    pendingCount: 0,
    lowStockCount: 0,
    yesterdayRevenue: 0,
    deliveriesToday: 0,
  }

  const cards = [
    {
      label: t('dashboard.kpi.ordersToday'),
      value: stats.ordersToday.toString(),
      icon: ShoppingCart,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      onClick: () => navigate('/orders'),
    },
    {
      label: t('dashboard.kpi.awaitingPayment'),
      value: stats.pendingCount.toString(),
      icon: Clock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      dot: stats.pendingCount > 0 ? 'bg-amber-500' : undefined,
      onClick: () => navigate('/orders'),
    },
    {
      label: t('dashboard.kpi.stockAlerts'),
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      iconColor: stats.lowStockCount > 0 ? 'text-red-600' : 'text-slate-500',
      iconBg: stats.lowStockCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-700',
      onClick: () => navigate('/products'),
    },
    isOwner
      ? {
          label: t('dashboard.kpi.yesterdayRevenue'),
          value: formatPrice(stats.yesterdayRevenue || 0),
          icon: TrendingUp,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-50 dark:bg-green-900/20',
          onClick: () => navigate('/analytics'),
        }
      : {
          label: t('dashboard.kpi.deliveriesToday'),
          value: (stats.deliveriesToday || 0).toString(),
          icon: Truck,
          iconColor: 'text-violet-600',
          iconBg: 'bg-violet-50 dark:bg-violet-900/20',
          onClick: () => navigate('/orders'),
        },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={card.onClick}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 text-left hover:border-green-300 dark:hover:border-green-700 transition-colors relative"
        >
          {'dot' in card && card.dot && (
            <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${card.dot} animate-pulse`} />
          )}
          <div className={`${card.iconBg} rounded-xl w-9 h-9 flex items-center justify-center mb-2`}>
            <card.icon className={`w-4 h-4 ${card.iconColor}`} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {todayStats ? card.value : '-'}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {card.label}
          </p>
        </button>
      ))}
    </div>
  )
}
