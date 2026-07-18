// Customer classification (admin-only): horeca | supermarkt | other.
// Labels are INTENTIONALLY non-i18n literals — shown identically in every
// language (see CLAUDE.md customer-type feature). Centralized here because the
// label + badge colors are consumed at several sites (badge component, order &
// customer exports, analytics filter, sold-products filter/group, day-close).

export const CUSTOMER_TYPES = ['horeca', 'supermarkt', 'other'] as const

export type CustomerType = (typeof CUSTOMER_TYPES)[number]

// Displayed identically in NL and EN.
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  horeca: 'Horeca',
  supermarkt: 'Supermarkt',
  other: 'Overig',
}

// Badge color families reuse the existing StatusBadge/PaymentBadge palette.
// Horeca = blue, Supermarkt = green, Overig = grey.
export const CUSTOMER_TYPE_BADGE_CLASS: Record<CustomerType, string> = {
  horeca: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  supermarkt: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  other: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
}

function isCustomerType(v: unknown): v is CustomerType {
  return typeof v === 'string' && (CUSTOMER_TYPES as readonly string[]).includes(v)
}

// Human label for exports / plain text. Empty string for untagged/unknown.
export function customerTypeLabel(v?: string | null): string {
  return isCustomerType(v) ? CUSTOMER_TYPE_LABELS[v] : ''
}
