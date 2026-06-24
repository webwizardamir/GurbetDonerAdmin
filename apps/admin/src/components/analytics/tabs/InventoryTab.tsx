import { useTranslation } from 'react-i18next'
import {
  Loader2,
  Warehouse,
  Info,
} from 'lucide-react'
import { useInventoryAnalytics } from '../../../hooks/useInventoryAnalytics'
import type { DateRange } from '../../../hooks/useDateRange'
import StatCard from '../../StatCard'
import { formatChartCurrency } from '../ChartColors'
import { formatQuantity, formatRatio } from '../../../utils/format'

interface InventoryTabProps {
  dateRange: DateRange
}

export default function InventoryTab({ dateRange }: InventoryTabProps) {
  const { t } = useTranslation()
  const { loading, error, turnover } = useInventoryAnalytics(dateRange)

  // Total stock value from turnover data
  const totalStockValue = turnover.reduce((sum, r) => sum + r.stockValue, 0)

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

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-300">{t('analytics.inventory.currentStateInfo')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('analytics.inventory.totalStockValue')}
          value={formatChartCurrency(totalStockValue)}
          icon={Warehouse}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
      </div>

      {/* Expiry Risk & Batch Aging — batch tracking not yet configured */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-300">{t('analytics.inventory.batchTrackingNotConfigured')}</p>
      </div>

      {/* Inventory Turnover Table */}
      {turnover.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('analytics.inventory.inventoryTurnover')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('analytics.inventory.turnoverNote')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.inventory.product')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.inventory.stockQty')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.inventory.stockValueCol')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.inventory.cogsInPeriod')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.inventory.turnoverRatio')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('analytics.inventory.daysToSell')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {turnover.map(row => (
                  <tr key={row.productName} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{row.productName}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">{formatQuantity(row.stockQty)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">{formatChartCurrency(row.stockValue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">{formatChartCurrency(row.cogsInPeriod)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">{formatRatio(row.turnoverRatio)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {row.daysToSell !== null ? (
                        <span className={`${
                          row.daysToSell < 30 ? 'text-green-600 dark:text-green-400' :
                          row.daysToSell <= 90 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {row.daysToSell}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
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

