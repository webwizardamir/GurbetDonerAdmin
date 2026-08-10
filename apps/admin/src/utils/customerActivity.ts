import type { CustomerActivityRow, CustomerTypeKey } from '../types'

// ===========================================================================
// Klantactiviteit — PURE shaping helpers, shared by the screen and the PDF.
//
// 🚨 These live here, and NOT in services/customerActivity.ts, because
// CustomerActivityTemplate imports them and that template is bundled into the
// Vercel Node function (api-src/render-invoice.tsx -> api/render-invoice.mjs).
// A service module imports services/supabase.ts, which reads
// `import.meta.env.VITE_SUPABASE_URL` and touches `window` at MODULE SCOPE.
// Node has neither, so pulling one into the template graph makes the whole
// render function throw on load: the endpoint 500s, and every caller of it
// (the 24h invoice mail, the monthly Betaaloverzicht, this digest's own
// attachment) silently stops. That is not hypothetical, it shipped.
//
// Same family of rule as "a template cannot import config/tenant.ts".
// Anything a document template needs must be free of a DB client.
// ===========================================================================

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
