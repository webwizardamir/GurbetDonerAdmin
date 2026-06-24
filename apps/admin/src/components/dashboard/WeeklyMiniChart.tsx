/**
 * WeeklyMiniChart - Compact card with mini bar chart showing weekly stats.
 * Owner sees daily revenue bars; Shop Manager sees daily order count bars.
 * Includes percentage change vs previous week.
 */
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { formatPrice, formatPercentChange } from '../../utils/format'

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

const PLACEHOLDER_DATA = [
  { day: 'Ma', value: 0 },
  { day: 'Di', value: 0 },
  { day: 'Wo', value: 0 },
  { day: 'Do', value: 0 },
  { day: 'Vr', value: 0 },
  { day: 'Za', value: 0 },
  { day: 'Zo', value: 0 },
]

export default function WeeklyMiniChart({ weeklyStats, isOwner }: WeeklyMiniChartProps) {
  const { t } = useTranslation()

  const change = isOwner
    ? weeklyStats?.revenueChange ?? 0
    : weeklyStats?.ordersChange ?? 0
  const isPositive = change >= 0
  const mainValue = isOwner
    ? formatPrice(weeklyStats?.revenue ?? 0)
    : (weeklyStats?.orders ?? 0).toString()
  const prevValue = isOwner
    ? formatPrice(weeklyStats?.revenuePrevWeek ?? 0)
    : (weeklyStats?.ordersPrevWeek ?? 0).toString()
  const label = isOwner
    ? t('dashboard.weekly.revenue')
    : t('dashboard.weekly.orders')

  const hasData = weeklyStats?.dailyData && weeklyStats.dailyData.length > 0
  const chartData = hasData ? weeklyStats.dailyData : PLACEHOLDER_DATA

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('dashboard.weekly.title')}
          </h3>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              isPositive
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {formatPercentChange(change)}
          </span>
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {weeklyStats ? mainValue : '-'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {label} - {t('dashboard.weekly.vsLastWeek')}
        </p>
        {/* Previous week comparison */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          {t('dashboard.weekly.prevWeek')}: {weeklyStats ? prevValue : '-'}
        </p>
      </div>

      {/* Chart with subtle grid background */}
      <div className="h-[120px] sm:h-[130px] min-h-[100px] px-3 sm:px-4 pb-4 bg-slate-50/50 dark:bg-slate-900/30">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
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
                borderRadius: '10px',
                fontSize: '12px',
                color: '#f1f5f9',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              formatter={(value: number | undefined) => {
                const v = value ?? 0
                return isOwner ? [formatPrice(v), label] : [v, label]
              }}
              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={hasData && entry.value > 0 ? 'url(#barGradient)' : '#e2e8f0'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
