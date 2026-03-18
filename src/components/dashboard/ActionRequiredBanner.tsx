/**
 * ActionRequiredBanner - Alert strip for items needing immediate attention.
 * Only renders when there are action items. Shows overdue payments,
 * zero-stock products, and orders on hold as clickable items.
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronRight } from 'lucide-react'

export interface ActionRequired {
  overduePayments: number
  zeroStockCount: number
  ordersOnHold: number
}

interface ActionRequiredBannerProps {
  actionRequired: ActionRequired | null
}

export default function ActionRequiredBanner({ actionRequired }: ActionRequiredBannerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!actionRequired) return null

  const { overduePayments, zeroStockCount, ordersOnHold } = actionRequired
  const hasActions = overduePayments > 0 || zeroStockCount > 0 || ordersOnHold > 0
  if (!hasActions) return null

  const items: { label: string; count: number; onClick: () => void; urgent: boolean }[] = []

  if (overduePayments > 0) {
    items.push({
      label: t('dashboard.action.overduePayments', { count: overduePayments }),
      count: overduePayments,
      onClick: () => navigate('/orders'),
      urgent: true,
    })
  }
  if (zeroStockCount > 0) {
    items.push({
      label: t('dashboard.action.zeroStock', { count: zeroStockCount }),
      count: zeroStockCount,
      onClick: () => navigate('/products'),
      urgent: true,
    })
  }
  if (ordersOnHold > 0) {
    items.push({
      label: t('dashboard.action.ordersOnHold', { count: ordersOnHold }),
      count: ordersOnHold,
      onClick: () => navigate('/orders'),
      urgent: false,
    })
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50">
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex items-center justify-center w-6 h-6">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
            {t('dashboard.action.title')}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="flex items-center justify-between w-full text-left p-3 rounded-xl hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-all duration-150 group"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${
                    item.urgent ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                >
                  {item.count}
                </span>
                <span
                  className={`text-sm font-medium ${
                    item.urgent
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400 dark:text-amber-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
