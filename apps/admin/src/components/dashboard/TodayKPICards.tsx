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

const ACCENT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  violet: 'bg-violet-500',
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
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      accent: 'blue',
      pulse: false,
      onClick: () => navigate('/orders'),
    },
    {
      label: t('dashboard.kpi.awaitingPayment'),
      value: stats.pendingCount.toString(),
      icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-900/30',
      accent: 'amber',
      pulse: stats.pendingCount > 0,
      onClick: () => navigate('/orders?status=pending_payment'),
    },
    {
      label: t('dashboard.kpi.stockAlerts'),
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      iconColor: stats.lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500',
      iconBg: stats.lowStockCount > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-700',
      accent: 'red',
      pulse: false,
      onClick: () => navigate('/products'),
    },
    isOwner
      ? {
          label: t('dashboard.kpi.yesterdayRevenue'),
          value: formatPrice(stats.yesterdayRevenue || 0),
          icon: TrendingUp,
          iconColor: 'text-green-600 dark:text-green-400',
          iconBg: 'bg-green-50 dark:bg-green-900/30',
          accent: 'green',
          pulse: false,
          onClick: () => navigate('/analytics'),
        }
      : {
          label: t('dashboard.kpi.deliveriesToday'),
          value: (stats.deliveriesToday || 0).toString(),
          icon: Truck,
          iconColor: 'text-violet-600 dark:text-violet-400',
          iconBg: 'bg-violet-50 dark:bg-violet-900/30',
          accent: 'violet',
          pulse: false,
          onClick: () => navigate('/orders'),
        },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={card.onClick}
          className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-left overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* Top accent line */}
          <div className={`h-0.5 ${ACCENT_COLORS[card.accent]}`} />

          <div className="p-3 sm:p-4 pt-3">
            {/* Pulse ring for pending */}
            {card.pulse && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            )}

            <div className={`${card.iconBg} rounded-xl w-11 h-11 flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>

            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight truncate">
              {todayStats ? card.value : '-'}
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {card.label}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
