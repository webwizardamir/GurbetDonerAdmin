/**
 * DashboardGreeting - Time-of-day greeting with user name and quick actions.
 * Shows "Goedemorgen/Goedemiddag/Goedenavond, [Name]" based on current hour.
 * Includes Dutch-formatted date, summary line, and quick action buttons.
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface DashboardGreetingProps {
  onRefresh?: () => void
  ordersToday?: number
  pendingCount?: number
}

function getGreetingKey(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'dashboard.greeting.morning'
  if (hour < 18) return 'dashboard.greeting.afternoon'
  return 'dashboard.greeting.evening'
}

export default function DashboardGreeting({ onRefresh, ordersToday = 0, pendingCount = 0 }: DashboardGreetingProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || ''
  const todayFormatted = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600/5 via-green-600/3 to-transparent dark:from-green-500/10 dark:via-green-500/5 dark:to-transparent p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="wave">
              {'👋'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t(getGreetingKey(), { name: displayName })}
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
            {todayFormatted}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {t('dashboard.summary', { orders: ordersToday, pending: pendingCount })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/orders?new=1')}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md shadow-green-600/20 hover:shadow-lg hover:shadow-green-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>{t('dashboard.newOrder')}</span>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400 transition-colors"
              aria-label={t('dashboard.refresh')}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
