import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StatCardProps {
  label: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

export default function StatCard({ label, value, description, trend, icon: Icon, iconColor, iconBg }: StatCardProps) {
  const { t } = useTranslation()
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {value}
          </p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{Number(trend.value).toFixed(1)}%
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.vsLastMonth')}</span>
            </div>
          )}
        </div>
        <div className={`${iconBg} rounded-xl p-3`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}
