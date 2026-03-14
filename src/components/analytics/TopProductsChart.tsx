import { useMemo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { CHART_COLORS, formatChartCurrency } from './ChartColors'
import type { TopProduct } from '../../services/analytics'
import { formatQuantity } from '../../utils/format'

interface TopProductsChartProps {
  data: TopProduct[]
  loading?: boolean
}

export default function TopProductsChart({ data, loading }: TopProductsChartProps) {
  const { t } = useTranslation()
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

  // Format unit type with translation support
  const formatUnit = (unitType: string, quantity: number) => {
    switch (unitType?.toLowerCase()) {
      case 'kg':
        return 'kg'
      case 'piece':
        return quantity === 1 ? t('products.units.pieceSingular') : t('products.units.piecePlural')
      case 'zak':
        return quantity === 1 ? t('products.units.zakSingular') : t('products.units.zakPlural')
      case 'doos':
        return quantity === 1 ? t('products.units.doosSingular') : t('products.units.doosPlural')
      default:
        return quantity === 1 ? t('products.units.pieceSingular') : t('products.units.piecePlural')
    }
  }

  // Format chart data
  const chartData = useMemo(() => {
    return data.slice(0, 5).map(d => ({
      ...d,
      name: d.productName.length > 25 ? d.productName.substring(0, 23) + '...' : d.productName,
      fullName: d.productName,
      revenueEuros: d.totalRevenue / 100,
    }))
  }, [data])

  // Custom tooltip
  interface TooltipPayloadEntry {
    payload: {
      fullName: string
      totalRevenue: number
      totalQuantity: number
      unitType: string
    }
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
        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{item.fullName}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Revenue: <span className="font-semibold text-green-600 dark:text-green-400">{formatChartCurrency(item.totalRevenue)}</span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sold: <span className="font-semibold">{formatQuantity(item.totalQuantity)} {formatUnit(item.unitType, item.totalQuantity)}</span>
        </p>
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
        <p className="text-slate-500 dark:text-slate-400">No product data available</p>
      </div>
    )
  }

  return (
    <div className="h-64" style={{ minWidth: 0, minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.textSecondary, fontSize: 12 }}
            tickFormatter={(value) => `€${value.toLocaleString('nl-NL')}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.text, fontSize: 12 }}
            width={140}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.grid, opacity: 0.3 }} />
          <Bar
            dataKey="revenueEuros"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? colors.accent : colors.secondary}
                fillOpacity={1 - index * 0.15}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
