/**
 * DashboardGreeting - Time-of-day greeting with user name and quick actions.
 * Shows "Goedemorgen/Goedemiddag/Goedenavond, [Name]" based on current hour.
 * Includes Dutch-formatted date and quick action buttons.
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface DashboardGreetingProps {
  onRefresh?: () => void
}

function getGreetingKey(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'dashboard.greeting.morning'
  if (hour < 18) return 'dashboard.greeting.afternoon'
  return 'dashboard.greeting.evening'
}

export default function DashboardGreeting({ onRefresh }: DashboardGreetingProps) {
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {t(getGreetingKey(), { name: displayName })}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          {todayFormatted}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/orders/new')}
          className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('dashboard.newOrder')}</span>
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label={t('dashboard.refresh')}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
