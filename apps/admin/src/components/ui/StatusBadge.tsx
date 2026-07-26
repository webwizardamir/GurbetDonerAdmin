import { useTranslation } from 'react-i18next'
import type { OrderStatus } from '../../types'
import { statusStyle } from '../../constants/orderStatus'

interface StatusBadgeProps {
  status: OrderStatus | string
}

/**
 * Read-only status pill. Colours come from constants/orderStatus so this and the
 * interactive OrderStatusPicker can never disagree about what green means.
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation()
  const style = statusStyle(status)

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${style.badgeClass}`}>
      {style.labelKey ? t(style.labelKey) : (status || 'Unknown')}
    </span>
  )
}
