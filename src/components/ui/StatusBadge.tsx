import { useTranslation } from 'react-i18next'
import type { OrderStatus } from '../../types'

interface StatusBadgeProps {
  status: OrderStatus | string
}

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  // New schema statuses
  draft: {
    labelKey: 'orders.status.draft',
    className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  },
  pending_payment: {
    labelKey: 'orders.status.pending_payment',
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  on_hold: {
    labelKey: 'orders.status.on_hold',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  cancelled: {
    labelKey: 'orders.status.cancelled',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  },
  refunded: {
    labelKey: 'orders.status.refunded',
    className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  },
  completed: {
    labelKey: 'orders.status.completed',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  },
  // Original schema statuses
  pending: {
    labelKey: 'orders.status.pending',
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  processing: {
    labelKey: 'orders.status.processing',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  delivered: {
    labelKey: 'orders.status.delivered',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  },
}

const fallbackConfig = {
  labelKey: '',
  className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation()
  const config = statusConfig[status] || fallbackConfig

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.labelKey ? t(config.labelKey) : (status || 'Unknown')}
    </span>
  )
}
