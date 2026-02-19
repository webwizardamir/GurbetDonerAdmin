import { useTranslation } from 'react-i18next'
import {
  Loader2,
  Percent,
  Receipt,
  Tag,
  Banknote,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { useFinancialAnalytics } from '../../../hooks/useFinancialAnalytics'
import type { DateRange } from '../../../hooks/useDateRange'
import StatCard from '../../StatCard'
import { formatChartCurrency, useChartColors } from '../ChartColors'

interface FinancialTabProps {
  dateRange: DateRange
}

export default function FinancialTab({ dateRange }: FinancialTabProps) {
  const { t } = useTranslation()
  const { loading, error, summary, monthly, categories, selectedYear, setYear } = useFinancialAnalytics(dateRange)
  const { colors } = useChartColors()

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (!summary) return null

  // Period comparison rows
  const comparisonRows = [
    {
      label: t('analytics.revenue'),
      current: summary.grossRevenue,
      previous: summary.prev.grossRevenue,
    },
    {
      label: t('analytics.profit'),
      current: summary.grossProfit,
      previous: summary.prev.grossProfit,
    },
    {
      label: t('analytics.orders'),
      current: summary.orderCount,
      previous: summary.prev.orderCount,
      isCount: true,
    },
  ]

  const cashPercentage = (summary.cashRevenue + summary.bankRevenue) > 0
    ? ((summary.cashRevenue / (summary.cashRevenue + summary.bankRevenue)) * 100).toFixed(1)
    : '0'

  // Chart tooltip
  const MonthlyTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; fill: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-slate-900 dark:text-white text-sm mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} className="text-sm" style={{ color: p.fill }}>
            {p.name}: {formatChartCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('analytics.financial.grossMarginPercent')}
          value={`${summary.grossMargin.toFixed(1)}%`}
          icon={Percent}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label={t('analytics.financial.vatCollected')}
          value={formatChartCurrency(summary.vatCollected)}
          icon={Receipt}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label={t('analytics.financial.totalDiscounts')}
          value={formatChartCurrency(summary.totalDiscounts)}
          icon={Tag}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          label={t('analytics.financial.cashVsBank')}
          value={t('analytics.financial.cashPercentage', { value: cashPercentage })}
          icon={Banknote}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
      </div>

      {/* Top row: Waterfall + Period Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Waterfall */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('analytics.financial.profitWaterfall')}</h3>
          <div className="space-y-3">
            <WaterfallRow label={t('analytics.financial.grossRevenue')} value={summary.grossRevenue} />
            <WaterfallRow label={`- ${t('analytics.financial.discounts')}`} value={-summary.totalDiscounts} isSubtraction />
            <WaterfallRow label={`= ${t('analytics.financial.netRevenue')}`} value={summary.netRevenue} isBold />
            <WaterfallRow label={`- ${t('analytics.financial.cogsLabel')}`} value={-summary.totalCogs} isSubtraction />
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <WaterfallRow label={`= ${t('analytics.financial.grossProfit')}`} value={summary.grossProfit} isBold isProfit />
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 pl-2">
                {t('analytics.financial.grossMargin')}: {summary.grossMargin.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Period Comparison */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('analytics.financial.periodComparison')}</h3>
          </div>
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.financial.metric')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.financial.current')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.financial.previous')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.financial.change')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {comparisonRows.map(row => {
                const change = row.previous > 0
                  ? ((row.current - row.previous) / row.previous) * 100
                  : row.current > 0 ? 100 : 0
                const isPositive = change >= 0

                return (
                  <tr key={row.label}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{row.label}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">
                      {row.isCount ? row.current.toLocaleString('nl-NL') : formatChartCurrency(row.current)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-500 dark:text-slate-400">
                      {row.isCount ? row.previous.toLocaleString('nl-NL') : formatChartCurrency(row.previous)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`inline-flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(change).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('analytics.financial.monthlyRevenue')}</h3>
          <select
            value={selectedYear}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="monthLabel" tick={{ fill: colors.textSecondary, fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => formatChartCurrency(v)} tick={{ fill: colors.textSecondary, fontSize: 12 }} />
              <Tooltip content={<MonthlyTooltip />} />
              <Legend
                formatter={(value: string) => (
                  <span className="text-sm text-slate-600 dark:text-slate-400">{value}</span>
                )}
              />
              <Bar name={t('analytics.revenue')} dataKey="revenue" fill={colors.primary} radius={[4, 4, 0, 0]} />
              <Bar name={t('analytics.profit')} dataKey="profit" fill={colors.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Category */}
      {categories.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('analytics.financial.revenueByCategory')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tickFormatter={(v: number) => formatChartCurrency(v)} tick={{ fill: colors.textSecondary, fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  tick={{ fill: colors.textSecondary, fontSize: 12 }}
                  tickFormatter={(v: string) => v || t('analytics.products.noCategory')}
                  width={75}
                />
                <Tooltip
                  formatter={(value) => formatChartCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.grid}`,
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="totalRevenue" name={t('analytics.revenue')} radius={[0, 4, 4, 0]}>
                  {categories.map((_, idx) => (
                    <Cell key={idx} fill={idx === 0 ? colors.primary : colors.primaryLight} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Category table */}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.category')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.revenue')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.products.cogs')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.profit')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.margin')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {categories.map(cat => (
                  <tr key={cat.categoryName || '__none'}>
                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-white">{cat.categoryName || t('analytics.products.noCategory')}</td>
                    <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">{formatChartCurrency(cat.totalRevenue)}</td>
                    <td className="px-3 py-2 text-sm text-right text-slate-600 dark:text-slate-400">{formatChartCurrency(cat.totalCogs)}</td>
                    <td className="px-3 py-2 text-sm text-right text-emerald-600 dark:text-emerald-400">{formatChartCurrency(cat.totalProfit)}</td>
                    <td className="px-3 py-2 text-sm text-right text-slate-600 dark:text-slate-400">{cat.profitMargin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function WaterfallRow({ label, value, isSubtraction, isBold, isProfit }: {
  label: string
  value: number
  isSubtraction?: boolean
  isBold?: boolean
  isProfit?: boolean
}) {
  return (
    <div className={`flex items-center justify-between px-2 ${isBold ? 'font-semibold' : ''}`}>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <span className={`text-sm ${
        isProfit ? 'text-green-600 dark:text-green-400 font-bold text-base' :
        isSubtraction ? 'text-red-500 dark:text-red-400' :
        'text-slate-900 dark:text-white'
      }`}>
        {value < 0 ? `-${formatChartCurrency(Math.abs(value))}` : formatChartCurrency(value)}
      </span>
    </div>
  )
}
