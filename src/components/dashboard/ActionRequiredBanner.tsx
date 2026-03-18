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

  const items: { label: string; onClick: () => void; urgent: boolean }[] = []

  if (overduePayments > 0) {
    items.push({
      label: t('dashboard.action.overduePayments', { count: overduePayments }),
      onClick: () => navigate('/orders'),
      urgent: true,
    })
  }
  if (zeroStockCount > 0) {
    items.push({
      label: t('dashboard.action.zeroStock', { count: zeroStockCount }),
      onClick: () => navigate('/products'),
      urgent: true,
    })
  }
  if (ordersOnHold > 0) {
    items.push({
      label: t('dashboard.action.ordersOnHold', { count: ordersOnHold }),
      onClick: () => navigate('/orders'),
      urgent: false,
    })
  }

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t('dashboard.action.title')}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick}
            className="flex items-center justify-between w-full text-left p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
          >
            <span className={`text-sm ${item.urgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {item.label}
            </span>
            <ChevronRight className="w-4 h-4 text-amber-500 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  )
}
