// Audit-log presentation helpers.
//
// The audit_logs snapshots (old_values/new_values) are full-row JSONB dumps.
// These pure functions turn them into human-readable titles, one-line change
// summaries and formatted field values — no raw UUIDs, no cents, no JSON walls.
// Everything here is I/O-free and unit-testable; the page passes in `t` (i18next)
// and an optional name resolver for foreign-key ids.

import type { AuditLog } from '../types'
import { formatPrice, formatDate, formatDateTime } from './format'

export type TFn = (key: string, opts?: Record<string, unknown>) => string
type Snapshot = Record<string, unknown>

// Resolve a translation key, falling back to a literal when the key is missing
// (i18next returns the key string unchanged when there's no translation).
function tt(t: TFn, key: string, fallback: string): string {
  const v = t(key)
  return v === key || v.startsWith('auditLog.') ? fallback : v
}

// -----------------------------------------------------------------------------
// Entity metadata: label key + badge color (UI colors mirror the status palette)
// -----------------------------------------------------------------------------
export const ENTITY_META: Record<string, { badge: string }> = {
  orders: { badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  order_items: { badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  customers: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  products: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  documents: { badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  customer_prices: { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  profiles: { badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  customer_accounts: { badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  categories: { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
}

const DEFAULT_BADGE = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'

export function entityBadgeClass(entity: string): string {
  return ENTITY_META[entity]?.badge ?? DEFAULT_BADGE
}

export function entityLabel(t: TFn, entity: string): string {
  return tt(t, `auditLog.entities.${entity}`, humanize(entity))
}

// The entity types that actually fire audit triggers (for the filter dropdown).
export const AUDIT_ENTITY_TYPES = [
  'orders', 'order_items', 'customers', 'products', 'documents',
  'customer_prices', 'profiles', 'customer_accounts', 'categories',
] as const

// -----------------------------------------------------------------------------
// Noise fields — hidden from diffs AND ignored when deciding if an update matters
// -----------------------------------------------------------------------------
export const NOISE_FIELDS = new Set<string>([
  'id', 'created_at', 'updated_at', 'created_by', 'updated_by',
  'search_vector', 'tsv',
  // geocode churn (route planning rewrites these)
  'latitude', 'longitude', 'geocoded_at', 'geocode_address_hash', 'geocode_status',
  'last_login_at',
  // legacy *_cents mirrors / duplicate money twins (canonical field shown instead)
  'total_cents', 'subtotal_cents', 'unit_price_cents', 'cost', 'price',
  // large opaque blobs (documents handled specially; never dump these)
  'snapshot', 'email_templates', 'metadata',
])

function isNoiseField(key: string): boolean {
  return NOISE_FIELDS.has(key)
}

// -----------------------------------------------------------------------------
// Value formatting
// -----------------------------------------------------------------------------
const MONEY_KEYS = new Set<string>([
  'total', 'subtotal', 'tax', 'tax_amount', 'discount', 'discount_amount',
  'delivery_fee', 'unit_price', 'custom_price', 'base_price', 'cost_cents',
  'refund_amount', 'grandtotal', 'amount',
])

const DATE_ONLY_KEYS = new Set<string>([
  'order_date', 'invoice_date', 'invoice_due_date', 'woo_invoice_date',
])

function isMoneyKey(key: string): boolean {
  return MONEY_KEYS.has(key) || key.endsWith('_cents')
}

function looksIso(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}([T ]|$)/.test(v)
}

// Owner-only fields (COGS) — the page passes isOwner so we can drop these.
export const COST_FIELDS = new Set<string>(['cost_cents', 'cost'])

/** Turn a raw snapshot value into a readable scalar string. */
export function formatAuditValue(key: string, value: unknown, t: TFn): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  if (typeof value === 'boolean') {
    return value ? tt(t, 'auditLog.diff.yes', 'Ja') : tt(t, 'auditLog.diff.no', 'Nee')
  }
  if (typeof value === 'number') {
    if (isMoneyKey(key)) return formatPrice(value)
    return String(value)
  }
  if (typeof value === 'string') {
    if (isMoneyKey(key)) {
      const n = Number(value)
      if (!Number.isNaN(n)) return formatPrice(n)
    }
    if (key.endsWith('_at') && looksIso(value)) {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) return formatDateTime(value)
    }
    if (DATE_ONLY_KEYS.has(key) && looksIso(value)) {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) return formatDate(value)
    }
    // Try to translate known enum values (statuses, roles, unit types).
    return tt(t, `auditLog.enum.${value}`, value)
  }
  if (Array.isArray(value)) {
    return tt(t, 'auditLog.diff.items', `${value.length} items`).replace('{{n}}', String(value.length))
  }
  if (typeof value === 'object') {
    return tt(t, 'auditLog.diff.complex', '…')
  }
  return String(value)
}

/** Human label for a snapshot field. */
export function fieldLabel(t: TFn, key: string): string {
  return tt(t, `auditLog.fields.${key}`, humanize(key))
}

function humanize(key: string): string {
  return key
    .replace(/_id$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// -----------------------------------------------------------------------------
// Foreign-key name resolution (ids batch-resolved by the page)
// -----------------------------------------------------------------------------
export interface NameResolver {
  product?: (id: string) => string | undefined
  customer?: (id: string) => string | undefined
  order?: (id: string) => string | undefined
}

function snapOf(log: AuditLog): Snapshot {
  return (log.new_values ?? log.old_values ?? {}) as Snapshot
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined
}

// -----------------------------------------------------------------------------
// Entity title — "what object" (never a bare UUID)
// -----------------------------------------------------------------------------
export function deriveEntityTitle(log: AuditLog, t: TFn, resolver?: NameResolver): string {
  const s = snapOf(log)
  const prefix = (k: string) => tt(t, `auditLog.titlePrefix.${k}`, humanize(k))

  switch (log.entity_type) {
    case 'orders': {
      const n = str(s.order_number)
      return n ? `${prefix('orders')} #${n}` : fallbackTitle(log, t)
    }
    case 'order_items': {
      return str(s.product_name) ?? fallbackTitle(log, t)
    }
    case 'customers': {
      const name = str(s.company_name) ?? str(s.contact_person) ?? str(s.email)
      return name ? `${prefix('customers')} '${name}'` : fallbackTitle(log, t)
    }
    case 'products': {
      const name = str(s.name)
      return name ? `${prefix('products')} '${name}'` : fallbackTitle(log, t)
    }
    case 'documents': {
      const num = str(s.document_number)
      const typeLabel = documentTypeLabel(t, str(s.document_type))
      if (num) return `${typeLabel} ${num}`
      return typeLabel
    }
    case 'customer_prices': {
      const pid = str(s.product_id)
      const pname = pid && resolver?.product?.(pid)
      if (pname) return `${prefix('customer_prices')}: ${pname}`
      return prefix('customer_prices')
    }
    case 'profiles': {
      const name = str(s.full_name) ?? str(s.email)
      return name ? `${prefix('profiles')} '${name}'` : fallbackTitle(log, t)
    }
    case 'customer_accounts': {
      const email = str(s.email)
      return email ? `${prefix('customer_accounts')} ${email}` : prefix('customer_accounts')
    }
    case 'categories': {
      const name = str(s.name)
      return name ? `${prefix('categories')} '${name}'` : fallbackTitle(log, t)
    }
    default:
      return fallbackTitle(log, t)
  }
}

function fallbackTitle(log: AuditLog, t: TFn): string {
  const short = (log.entity_id || '').slice(0, 8)
  return `${entityLabel(t, log.entity_type)} ${short}`
}

function documentTypeLabel(t: TFn, docType?: string): string {
  if (!docType) return tt(t, 'auditLog.entities.documents', 'Document')
  return tt(t, `auditLog.docType.${docType}`, humanize(docType))
}

// -----------------------------------------------------------------------------
// Changed fields (noise-filtered) — the basis for diffs and summaries
// -----------------------------------------------------------------------------
export interface FieldChange {
  key: string
  old: unknown
  new: unknown
}

export function getChangedFields(
  log: AuditLog,
  opts: { isOwner: boolean } = { isOwner: true },
): FieldChange[] {
  const oldVal = (log.old_values ?? {}) as Snapshot
  const newVal = (log.new_values ?? {}) as Snapshot
  const keys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)])
  const changes: FieldChange[] = []
  keys.forEach((key) => {
    if (isNoiseField(key)) return
    if (!opts.isOwner && COST_FIELDS.has(key)) return
    const o = oldVal[key]
    const n = newVal[key]
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      changes.push({ key, old: o, new: n })
    }
  })
  return changes
}

// -----------------------------------------------------------------------------
// One-line change summary — "what happened"
// -----------------------------------------------------------------------------
export function summarizeChange(
  log: AuditLog,
  t: TFn,
  opts: { isOwner: boolean } = { isOwner: true },
): string {
  // Documents: never diff the snapshot blob; describe the doc instead.
  if (log.entity_type === 'documents') {
    return documentSummary(log, t)
  }

  const s = snapOf(log)

  if (log.action === 'create') {
    return createHighlight(log, s, t)
  }

  if (log.action === 'delete') {
    return tt(t, 'auditLog.summary.deleted', 'verwijderd')
  }

  // update → build clauses from meaningful changed fields
  const changes = getChangedFields(log, opts)
  if (changes.length === 0) {
    return tt(t, 'auditLog.summary.minorChange', 'kleine wijziging')
  }
  const clauses = changes.slice(0, 3).map((c) => clauseFor(c, t))
  const extra = changes.length - clauses.length
  const joined = clauses.join(' · ')
  return extra > 0
    ? `${joined} · ${tt(t, 'auditLog.summary.andMore', '+{{n}} meer').replace('{{n}}', String(extra))}`
    : joined
}

function clauseFor(c: FieldChange, t: TFn): string {
  // High-signal special cases
  if (c.key === 'deleted_at') {
    return c.new
      ? tt(t, 'auditLog.summary.toTrash', 'naar prullenbak')
      : tt(t, 'auditLog.summary.restored', 'hersteld uit prullenbak')
  }
  if (c.key === 'is_active') {
    return c.new
      ? tt(t, 'auditLog.summary.activated', 'geactiveerd')
      : tt(t, 'auditLog.summary.deactivated', 'gedeactiveerd')
  }
  const label = fieldLabel(t, c.key)
  const oldStr = formatAuditValue(c.key, c.old, t)
  const newStr = formatAuditValue(c.key, c.new, t)
  return `${label} ${oldStr} → ${newStr}`
}

function createHighlight(log: AuditLog, s: Snapshot, t: TFn): string {
  switch (log.entity_type) {
    case 'orders': {
      const parts: string[] = []
      if (typeof s.total === 'number') parts.push(formatPrice(s.total))
      const status = str(s.status)
      if (status) parts.push(formatAuditValue('status', status, t))
      return parts.length ? tt(t, 'auditLog.summary.created', 'aangemaakt') + ' · ' + parts.join(' · ') : tt(t, 'auditLog.summary.created', 'aangemaakt')
    }
    case 'order_items': {
      const qty = typeof s.quantity === 'number' ? s.quantity : undefined
      const price = typeof s.unit_price === 'number' ? formatPrice(s.unit_price) : undefined
      const bits = [qty != null ? `${qty}×` : null, str(s.unit_type), price ? `@ ${price}` : null].filter(Boolean)
      return `${tt(t, 'auditLog.summary.added', 'toegevoegd')}${bits.length ? ' · ' + bits.join(' ') : ''}`
    }
    case 'customer_prices': {
      const price = typeof s.custom_price === 'number' ? formatPrice(s.custom_price) : undefined
      const unit = str(s.unit_type)
      return `${tt(t, 'auditLog.summary.priceSet', 'prijs ingesteld')}${price ? ' · ' + price : ''}${unit ? ` (${unit})` : ''}`
    }
    case 'products': {
      const price = typeof s.base_price === 'number' ? formatPrice(s.base_price) : undefined
      return `${tt(t, 'auditLog.summary.created', 'aangemaakt')}${price ? ' · ' + price : ''}`
    }
    default:
      return tt(t, 'auditLog.summary.created', 'aangemaakt')
  }
}

/** Document-row summary that never dumps the invoice JSON. */
export function documentSummary(log: AuditLog, t: TFn): string {
  const s = snapOf(log)
  const num = str(s.document_number) ?? ''
  if (log.action === 'create') {
    return tt(t, 'auditLog.doc.generated', 'gegenereerd')
  }
  if (log.action === 'delete') {
    return tt(t, 'auditLog.summary.deleted', 'verwijderd')
  }
  // update: almost always the fire-and-forget snapshot re-freeze
  const changes = getChangedFields(log)
  const onlySnapshot = changes.length === 0 // snapshot is a noise field, so filtered out
  void num
  return onlySnapshot
    ? tt(t, 'auditLog.doc.snapshotUpdated', 'opnieuw opgemaakt (automatisch)')
    : summarizeGeneric(changes, t)
}

function summarizeGeneric(changes: FieldChange[], t: TFn): string {
  if (changes.length === 0) return tt(t, 'auditLog.summary.minorChange', 'kleine wijziging')
  return changes.slice(0, 3).map((c) => clauseFor(c, t)).join(' · ')
}

// A short totals summary from a document snapshot (for the expanded detail).
export function documentSnapshotSummary(log: AuditLog, t: TFn): { number?: string; type?: string; total?: string } {
  const s = snapOf(log)
  const snap = s.snapshot as Record<string, unknown> | undefined
  const grand = snap && typeof snap.grandTotal === 'number' ? snap.grandTotal : undefined
  return {
    number: str(s.document_number),
    type: documentTypeLabel(t, str(s.document_type)),
    total: grand != null ? formatPrice(grand) : undefined,
  }
}

// -----------------------------------------------------------------------------
// Grouping: collapse an order edit's many rows into one event
// -----------------------------------------------------------------------------
export type AuditItem =
  | { kind: 'single'; log: AuditLog }
  | { kind: 'group'; key: string; orderId: string; logs: AuditLog[]; created_at: string; user_email: string }

// Returns the order id a log belongs to (for grouping), or null.
function orderIdOf(log: AuditLog): string | null {
  const s = snapOf(log)
  if (log.entity_type === 'orders') return str(s.id) ?? log.entity_id ?? null
  if (log.entity_type === 'order_items') return str(s.order_id) ?? null
  return null
}

/**
 * Group consecutive rows (list is created_at DESC) that share the same order +
 * user and fall within a short time window — i.e. one save. A lone row stays a
 * single. Only orders/order_items participate; everything else is a single.
 */
export function groupAuditLogs(logs: AuditLog[], windowMs = 15000): AuditItem[] {
  const items: AuditItem[] = []
  let i = 0
  while (i < logs.length) {
    const log = logs[i]
    const orderId = orderIdOf(log)
    if (!orderId) {
      items.push({ kind: 'single', log })
      i++
      continue
    }
    // accumulate consecutive same-order, same-user rows within the window
    const bucket: AuditLog[] = [log]
    let last = new Date(log.created_at).getTime()
    let j = i + 1
    while (j < logs.length) {
      const next = logs[j]
      if (orderIdOf(next) !== orderId || next.user_email !== log.user_email) break
      const ts = new Date(next.created_at).getTime()
      if (Math.abs(last - ts) > windowMs) break
      bucket.push(next)
      last = ts
      j++
    }
    if (bucket.length >= 2) {
      items.push({
        kind: 'group',
        key: `${orderId}-${log.created_at}`,
        orderId,
        logs: bucket,
        created_at: log.created_at,
        user_email: log.user_email,
      })
    } else {
      items.push({ kind: 'single', log })
    }
    i = j
  }
  return items
}

// Group header summary: the order title + how many lines changed + total delta.
export function groupSummary(group: Extract<AuditItem, { kind: 'group' }>, t: TFn): { title: string; detail: string } {
  const orderLog = group.logs.find((l) => l.entity_type === 'orders')
  const lineRows = group.logs.filter((l) => l.entity_type === 'order_items')
  const title = orderLog
    ? deriveEntityTitle(orderLog, t)
    : `${tt(t, 'auditLog.titlePrefix.orders', 'Order')}`
  const parts: string[] = []
  if (lineRows.length > 0) {
    parts.push(
      tt(t, 'auditLog.group.linesChanged', '{{n}} regels gewijzigd').replace('{{n}}', String(lineRows.length)),
    )
  }
  // total delta if the order's total changed
  if (orderLog) {
    const o = (orderLog.old_values ?? {}) as Snapshot
    const n = (orderLog.new_values ?? {}) as Snapshot
    if (typeof o.total === 'number' && typeof n.total === 'number' && o.total !== n.total) {
      parts.push(`${formatPrice(o.total)} → ${formatPrice(n.total)}`)
    }
  }
  return { title, detail: parts.join(' · ') }
}

// -----------------------------------------------------------------------------
// Actor helpers
// -----------------------------------------------------------------------------
export const SYSTEM_ACTOR = 'system'

export function isSystemActor(email: string): boolean {
  return !email || email.toLowerCase() === SYSTEM_ACTOR
}

// Two-letter initials for the actor avatar.
export function actorInitials(email: string): string {
  if (isSystemActor(email)) return ''
  const name = email.split('@')[0]
  const parts = name.split(/[.\-_+]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
