import { useMemo, useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { STATUS_COLORS } from './ChartColors'
import type { OrderStatusCount } from '../../services/analytics'

interface OrdersChartProps {
  data: OrderStatusCount[]
  loading?: boolean
}

// Status label mapping
const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  delivered: 'Delivered',
  pending_payment: 'Pending',
  processing: 'Processing',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  draft: 'Draft',
  pending: 'Pending',
}

export default function OrdersChart({ data, loading }: OrdersChartProps) {
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

  const statusColors = isDark ? STATUS_COLORS.dark : STATUS_COLORS.light

  // Format chart data
  const chartData = useMemo(() => {
    return data.map(d => ({
      name: STATUS_LABELS[d.status] || d.status,
      value: d.count,
      status: d.status,
      revenue: d.revenue,
    }))
  }, [data])

  // Get color for status
  const getColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.draft
  }

  // Custom tooltip
  interface TooltipPayloadEntry {
    payload: { name: string; value: number }
  }

  interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadEntry[]
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null

    const item = payload[0]?.payload
    if (!item) return null

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{item.name}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Orders: <span className="font-semibold">{item.value}</span>
        </p>
      </div>
    )
  }

  // Custom legend
  interface LegendEntry {
    value: string
    color: string
  }

  interface CustomLegendProps {
    payload?: LegendEntry[]
  }

  const CustomLegend = ({ payload }: CustomLegendProps) => {
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {payload?.map((entry, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {entry.value} ({chartData.find(d => d.name === entry.value)?.value || 0})
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading chart...</div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No order data available</p>
      </div>
    )
  }

  const totalOrders = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="h-64 relative" style={{ minWidth: 0, minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="40%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.status)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label - positioned absolutely over the donut hole */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '60px' }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalOrders}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">orders</div>
        </div>
      </div>
    </div>
  )
}
