import { EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

interface HiddenOrderBadgeProps {
  hidden?: boolean
  className?: string
}

/**
 * "Verborgen" marker on an order that is hidden from shop managers
 * (migration 00095).
 *
 * Only the owner ever sees this — and in practice only the owner CAN, since RLS
 * removes hidden orders from a shop manager's result set entirely. The isOwner
 * check is belt-and-braces, matching how profit is gated elsewhere.
 *
 * Renders nothing when the order is not hidden, so call sites can drop it in
 * unconditionally.
 */
export default function HiddenOrderBadge({ hidden, className = '' }: HiddenOrderBadgeProps) {
  const { t } = useTranslation()
  const { isOwner } = useAuth()

  if (!hidden || !isOwner) return null

  return (
    <span
      title={t('orders.hidden.badgeTooltip')}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ${className}`}
    >
      <EyeOff className="w-3 h-3" />
      {t('orders.hidden.badge')}
    </span>
  )
}
