import { supabase } from './supabase'
import type {
  CustomerActivityRow,
  CustomerInactivityDigest,
  CustomerTypeKey,
  InactiveAlertConfig,
} from '../types'

// ===========================================================================
// Klantactiviteit — customers who stopped ordering (migration 00115)
// ---------------------------------------------------------------------------
// Every other automated mail in this system chases money that is owed. This one
// chases the opposite risk: a customer who quietly went quiet. It goes to the
// OWNER, not to a customer, so it carries no language switch and no branding
// rules beyond the shared shell.
// ===========================================================================

/** Mirrors the shape the edge function assumes when the key is absent.
 *  Opt-in: `enabled` false until the owner turns it on in Settings. */
export const DEFAULT_INACTIVE_ALERT_CONFIG: InactiveAlertConfig = {
  enabled: false,
  hour: 8,
  working_days_only: true,
  recipients: [],
  // 0 = report every morning until they order. The owner asked for this
  // explicitly; raising it to 7 turns the digest into a weekly nudge instead.
  repeat_days: 0,
  attach_pdf: true,
  // 🚨 Default OFF. On live data 133 of 251 active customers had no order at
  // all (WC import + the go-live reset), against 31 who genuinely stopped.
  // Including them makes the import leftovers 80% of every morning's mail.
  include_never_ordered: false,
  // Monthly across the board. A weekly Horeca rule flagged 29 customers on day
  // one, which is a list nobody reads; a month is the cadence the owner thinks
  // in ("hasn't ordered this month") and each type can still be tuned.
  default_days: 30,
  by_type: { horeca: 30, supermarkt: 30, other: 30 },
}

/** Fill in any key an older stored config predates, so the UI never reads
 *  `undefined` into a controlled input. */
export function normalizeInactiveAlert(raw?: Partial<InactiveAlertConfig> | null): InactiveAlertConfig {
  return {
    ...DEFAULT_INACTIVE_ALERT_CONFIG,
    ...(raw ?? {}),
    by_type: { ...DEFAULT_INACTIVE_ALERT_CONFIG.by_type, ...(raw?.by_type ?? {}) },
    recipients: raw?.recipients ?? [],
  }
}

export interface ResolvedRule {
  thresholdDays: number | null            // null = this customer is not monitored
  source: 'customer' | 'type' | 'default' | 'off'
}

/**
 * 🚨 PURE PORT of the two parallel CASE expressions in `get_customer_activity`
 * (migration 00115). Same branch order, same meaning. Used for the settings
 * preview and the per-row rule badge; change one and change both, or the screen
 * will promise a rule the cron does not honour.
 */
export function resolveInactivityRule(
  customer: { customer_type?: CustomerTypeKey | null; inactivity_days?: number | null; inactivity_enabled?: boolean | null },
  cfg: InactiveAlertConfig,
): ResolvedRule {
  if (customer.inactivity_enabled === false) return { thresholdDays: null, source: 'off' }
  if (customer.inactivity_days != null) return { thresholdDays: customer.inactivity_days, source: 'customer' }
  const typeDays = customer.customer_type ? cfg.by_type[customer.customer_type] ?? null : null
  if (typeDays != null) return { thresholdDays: typeDays, source: 'type' }
  if (customer.customer_type == null || customer.inactivity_enabled === true) {
    return cfg.default_days != null
      ? { thresholdDays: cfg.default_days, source: 'default' }
      : { thresholdDays: null, source: 'off' }
  }
  return { thresholdDays: null, source: 'off' }
}

// ---- reads ----------------------------------------------------------------

/** `onlyDue` true returns exactly what the digest mails; false returns every
 *  active customer, which is what makes "who is covered by which rule"
 *  answerable on screen. One RPC, so the two can never disagree. */
export async function fetchCustomerActivity(onlyDue = false): Promise<CustomerActivityRow[]> {
  const { data, error } = await supabase.rpc('get_customer_activity', { p_only_due: onlyDue })
  if (error) throw error
  return (data ?? []) as CustomerActivityRow[]
}

export async function fetchInactivityDigests(limit = 30): Promise<CustomerInactivityDigest[]> {
  const { data, error } = await supabase
    .from('customer_inactivity_digests')
    .select('*')
    .order('run_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as CustomerInactivityDigest[]
}

// ---- writes ---------------------------------------------------------------

/**
 * The per-customer override, as the three choices the admin actually has:
 *   'inherit'  → follow the customer-type rule   (both columns NULL)
 *   'custom'   → own number of days              (days set, enabled TRUE)
 *   'off'      → never report this customer      (enabled FALSE)
 * `enabled: true` alongside a day count also forces a customer ON when their
 * whole type is unmonitored, which is the "take him off the general Horeca rule
 * and give him his own" case.
 */
export async function saveCustomerInactivityRule(
  customerId: string,
  rule: { mode: 'inherit' | 'custom' | 'off'; days?: number | null },
): Promise<void> {
  const patch =
    rule.mode === 'inherit' ? { inactivity_days: null, inactivity_enabled: null }
    : rule.mode === 'off'   ? { inactivity_days: null, inactivity_enabled: false }
    : { inactivity_days: rule.days ?? null, inactivity_enabled: true }

  const { error } = await supabase.from('customers').update(patch).eq('id', customerId)
  if (error) throw error
}

// ---- shaping --------------------------------------------------------------

export interface ActivityGroup {
  key: CustomerTypeKey | 'never' | 'untagged'
  label: string
  thresholdLabel: string
  rows: CustomerActivityRow[]
}

/**
 * Group the due rows the way the mail and the PDF present them: never-ordered
 * customers stand apart (a name with no history is a different job than a
 * regular who went quiet), the rest by customer type, longest quiet first.
 * 🚨 Kept in sync with groupForDigest() in the edge function.
 */
export function groupActivityRows(rows: CustomerActivityRow[]): ActivityGroup[] {
  const labels: Record<string, string> = {
    horeca: 'Horeca', supermarkt: 'Supermarkt', other: 'Overig',
    untagged: 'Zonder klanttype', never: 'Nog nooit besteld',
  }
  const buckets = new Map<string, CustomerActivityRow[]>()
  for (const r of rows) {
    const key = r.order_count === 0 ? 'never' : (r.customer_type ?? 'untagged')
    const list = buckets.get(key) ?? []
    list.push(r)
    buckets.set(key, list)
  }
  const order = ['horeca', 'supermarkt', 'other', 'untagged', 'never']
  return order
    .filter(k => buckets.has(k))
    .map(k => {
      const list = buckets.get(k)!.sort((a, b) => b.days_since - a.days_since)
      // Every row in a type bucket shares the type threshold unless it carries
      // its own; show the common one in the heading and flag the exceptions.
      const common = list.find(r => r.rule_source === 'type')?.threshold_days ?? null
      return {
        key: k as ActivityGroup['key'],
        label: labels[k] ?? k,
        thresholdLabel: k === 'never' ? '' : common != null ? `regel: ${common} dagen` : '',
        rows: list,
      }
    })
}

/** "7 dagen · type Horeca" / "21 dagen · eigen regel" / "niet gemonitord" */
export function ruleLabel(row: CustomerActivityRow): string {
  if (row.threshold_days == null) return 'niet gemonitord'
  const source =
    row.rule_source === 'customer' ? 'eigen regel'
    : row.rule_source === 'type' ? 'type-regel'
    : 'standaard'
  return `${row.threshold_days} dagen · ${source}`
}
