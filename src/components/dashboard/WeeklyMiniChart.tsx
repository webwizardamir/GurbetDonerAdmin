/**
 * WeeklyMiniChart - Compact card with mini bar chart showing weekly stats.
 * Owner sees daily revenue bars; Shop Manager sees daily order count bars.
 * Includes percentage change vs previous week.
 */
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { formatPrice } from '../../utils/format'

export interface WeeklyStats {
  revenue?: number
  revenuePrevWeek?: number
  revenueChange?: number
  orders: number
  ordersPrevWeek: number
  ordersChange: number
  dailyData: { day: string; value: number }[]
}

interface WeeklyMiniChartProps {
  weeklyStats: WeeklyStats | null
  isOwner: boolean
}

export default function WeeklyMiniChart({ weeklyStats, isOwner }: WeeklyMiniChartProps) {
  const { t } = useTranslation()

  const change = isOwner
    ? weeklyStats?.revenueChange ?? 0
    : weeklyStats?.ordersChange ?? 0
  const isPositive = change >= 0
  const mainValue = isOwner
    ? formatPrice(weeklyStats?.revenue ?? 0)
    : (weeklyStats?.orders ?? 0).toString()
  const label = isOwner
    ? t('dashboard.weekly.revenue')
    : t('dashboard.weekly.orders')

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('dashboard.weekly.title')}
        </h3>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {weeklyStats ? mainValue : '-'}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        {label} - {t('dashboard.weekly.vsLastWeek')}
      </p>

      {/* Chart */}
      <div className="h-[120px]">
        {weeklyStats?.dailyData && weeklyStats.dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats.dailyData} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--tooltip-bg, #1e293b)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f1f5f9',
                }}
                formatter={(value: number | undefined) => {
                  const v = value ?? 0
                  return isOwner ? [formatPrice(v), label] : [v, label]
                }}
              />
              <Bar
                dataKey="value"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t('dashboard.weekly.noData')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
