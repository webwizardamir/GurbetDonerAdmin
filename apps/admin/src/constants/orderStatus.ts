import i18n from '../i18n'
import type { OrderStatus } from '../types'

/**
 * Single source of truth for order-status colours.
 *
 * Extracted from StatusBadge so the read-only badge and the interactive status
 * picker (components/orders/OrderStatusPicker.tsx) cannot drift apart — they
 * show the same value and must show the same colour.
 */
export interface StatusStyle {
  /** i18n key for the status NOUN. Value pickers and badges both use nouns:
   *  "Geannuleerd", never the verb "Annuleren", which inside a menu reads as
   *  "dismiss this menu" rather than "cancel the order". */
  labelKey: string
  /** Read-only badge fill. */
  badgeClass: string
  /** Interactive trigger fill — badge colours plus a hover step, which is part
   *  of what signals "this one is clickable" vs a plain badge. */
  triggerClass: string
  /** Solid dot, for menu rows. */
  dotClass: string
}

export const STATUS_STYLES: Record<string, StatusStyle> = {
  draft: {
    labelKey: 'orders.status.draft',
    badgeClass: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    triggerClass: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
  },
  pending: {
    labelKey: 'orders.status.pending',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    triggerClass: 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  pending_payment: {
    labelKey: 'orders.status.pending_payment',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    triggerClass: 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  on_hold: {
    labelKey: 'orders.status.on_hold',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    triggerClass: 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  completed: {
    labelKey: 'orders.status.completed',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    triggerClass: 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400',
    dotClass: 'bg-green-500',
  },
  cancelled: {
    labelKey: 'orders.status.cancelled',
    badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    triggerClass: 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400',
    dotClass: 'bg-red-500',
  },
  refunded: {
    labelKey: 'orders.status.refunded',
    badgeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    triggerClass: 'bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400',
    dotClass: 'bg-purple-500',
  },
  // Original-schema values still present on old rows.
  processing: {
    labelKey: 'orders.status.processing',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    triggerClass: 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  delivered: {
    labelKey: 'orders.status.delivered',
    badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    triggerClass: 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400',
    dotClass: 'bg-green-500',
  },
}

export const FALLBACK_STATUS_STYLE: StatusStyle = {
  labelKey: '',
  badgeClass: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  triggerClass: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200',
  dotClass: 'bg-slate-400 dark:bg-slate-500',
}

export const statusStyle = (s: OrderStatus | string): StatusStyle =>
  STATUS_STYLES[s] ?? FALLBACK_STATUS_STYLE

/**
 * The Dutch status label, whatever the app language — for exports (CSV / Excel /
 * PDF), which are Dutch-only by convention, like the document templates.
 *
 * Resolved through STATUS_STYLES rather than a second hand-written map: the
 * previous copy in `utils/export.ts` listed only five statuses, so `pending` —
 * which is the LIVE DB default for every new order — fell through to its raw
 * enum value and printed "pending" in an otherwise Dutch export. `on_hold`,
 * `processing` and `delivered` (still on older rows) did the same. Deriving the
 * label here means a status added to STATUS_STYLES can never miss the export.
 */
export const orderStatusLabelNl = (s: OrderStatus | string): string => {
  const { labelKey } = statusStyle(s)
  return labelKey ? i18n.t(labelKey, { lng: 'nl' }) : String(s ?? '')
}

/**
 * `pending` and `pending_payment` render the SAME label ("Wacht op betaling").
 * `pending` was the live DB default until **migration 00111** merged the two and
 * moved the default, so no new row can carry it — but the alias STAYS:
 *
 *  - the `order_status` enum still holds the label (Postgres cannot drop one
 *    without recreating the type and re-typing every dependent column), so it
 *    remains writable by anything that hardcodes it;
 *  - `audit_logs` rows and frozen `documents.snapshot` blobs still contain the
 *    old string, and those are immutable history — the Audit Log would render a
 *    raw uncoloured "pending" without it.
 *
 * Without it the picker would also list the current status separately from the
 * offered `pending_payment` transition and show the same words twice.
 */
export const STATUS_ALIAS: Record<string, OrderStatus> = { pending: 'pending_payment' }

/** Collapse a stored status onto the one the UI actually shows. */
export const canonicalStatus = (s: string): string => STATUS_ALIAS[s] ?? s

/**
 * The inverse of STATUS_ALIAS: every stored value that a canonical status
 * covers. Filtering on `pending_payment` has to match `pending` too — before
 * migration 00111 backfilled them, 245 of Melek's 249 waiting orders were on the
 * legacy value, so an unexpanded filter dropped almost all of them. The data is
 * merged now; this is what keeps a stray or re-imported legacy row visible.
 */
export const STATUS_EQUIVALENTS: Record<string, string[]> = Object.entries(STATUS_ALIAS)
  .reduce<Record<string, string[]>>((acc, [stored, canonical]) => {
    acc[canonical] = [...(acc[canonical] ?? [canonical]), stored]
    return acc
  }, {})

/**
 * Expand UI-selected statuses to every stored value they cover. Must be applied
 * to BOTH fetchOrders and fetchOrderCount or the list and its pagination
 * disagree — the same rule as the customer-type inner embed.
 */
export function expandStatusFilter<T extends string>(statuses: T[]): T[] {
  if (statuses.length === 0) return statuses
  const out = new Set<string>()
  for (const s of statuses) for (const v of STATUS_EQUIVALENTS[s] ?? [s]) out.add(v)
  return Array.from(out) as T[]
}
