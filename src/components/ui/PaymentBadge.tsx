// Payment method badge component.
// Displays a colored badge indicating the payment method (cash or bank).

import { useTranslation } from 'react-i18next'
import { Banknote, Building2 } from 'lucide-react'
import type { PaymentMethod } from '../../types'

interface PaymentBadgeProps {
  method?: PaymentMethod
}

const PAYMENT_CONFIG = {
  cash: {
    labelKey: 'orders.payment.cash',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    icon: Banknote,
  },
  bank: {
    labelKey: 'orders.payment.bank',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    icon: Building2,
  },
}

export default function PaymentBadge({ method }: PaymentBadgeProps) {
  const { t } = useTranslation()
  if (!method || method === 'none') return null

  const cfg = PAYMENT_CONFIG[method]
  if (!cfg) return null

  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {t(cfg.labelKey)}
    </span>
  )
}
