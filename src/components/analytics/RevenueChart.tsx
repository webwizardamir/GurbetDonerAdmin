import { useMemo, useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, formatChartCurrency, formatCompactNumber } from './ChartColors'
import type { RevenueDataPoint } from '../../services/analytics'

interface RevenueChartProps {
  data: RevenueDataPoint[]
  loading?: boolean
}

export default function RevenueChart({ data, loading }: RevenueChartProps) {
  const [isDark, setIsDark] = useState(false)

  // Watch for dark mode changes
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()

    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light

  // Format chart data
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' }),
      revenueEuros: d.revenue / 100,
    }))
  }, [data])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    const revenue = payload[0]?.value || 0
    const orders = payload[0]?.payload?.orderCount || 0

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Revenue: <span className="font-semibold text-green-600 dark:text-green-400">{formatChartCurrency(revenue * 100)}</span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Orders: <span className="font-semibold">{orders}</span>
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading chart...</div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No revenue data available</p>
      </div>
    )
  }

  return (
    <div className="h-80" style={{ minWidth: 0, minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.primary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={colors.grid}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.textSecondary, fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.textSecondary, fontSize: 12 }}
            tickFormatter={(value) => formatCompactNumber(value)}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenueEuros"
            stroke={colors.primary}
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
