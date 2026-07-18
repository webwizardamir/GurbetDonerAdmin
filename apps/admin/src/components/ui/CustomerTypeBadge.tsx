// Customer type badge (admin-only): Horeca / Supermarkt / Overig.
// Mirrors PaymentBadge but with NO useTranslation — labels are literal (see
// constants/customerType.ts). Renders nothing for untagged/unknown values, so
// list cells can show their own em-dash fallback.

import {
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_BADGE_CLASS,
  type CustomerType,
} from '../../constants/customerType'

interface CustomerTypeBadgeProps {
  type?: string | null
}

export default function CustomerTypeBadge({ type }: CustomerTypeBadgeProps) {
  if (!type || !(type in CUSTOMER_TYPE_LABELS)) return null

  const t = type as CustomerType
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${CUSTOMER_TYPE_BADGE_CLASS[t]}`}
    >
      {CUSTOMER_TYPE_LABELS[t]}
    </span>
  )
}
