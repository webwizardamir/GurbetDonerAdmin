import { supabase } from './supabase'
import { formatDate, formatPrice } from '../utils/format'

/**
 * Global (header) search across customers, orders and products.
 *
 * Shape of the result set is deliberately GROUPED rather than one flat list:
 * a global search answers "where is this thing", so the type of the hit is the
 * first thing the eye needs. Each group also carries a `seeAllUrl` pointing at
 * the list page pre-filtered by the same term, which is the escape hatch when
 * the five shown rows are not enough.
 *
 * 🚨 Every url here must be a route that actually EXISTS and opens the entity:
 *   customer -> /customers/:id            (real detail route)
 *   order    -> /orders?order=<id>        (Orders reads this on mount and opens
 *                                          the detail panel; same link the
 *                                          Invoices rows and the dashboard use)
 *   product  -> /products?search=<sku>    (no product detail route; the list
 *                                          page filters down to the one row)
 * A url pointing at a bare list page ("/orders") looks like a working link and
 * silently loses the thing the user searched for.
 */

export type SearchResultType = 'customer' | 'order' | 'product'

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle?: string
  /** Short right-aligned hint (amount, stock, ...). */
  meta?: string
  /** Rendered as a small pill after the title. */
  tag?: string
  url: string
  /** Lower is a better match. Internal, but exported rows keep it for testing. */
  score: number
}

export interface SearchGroup {
  type: SearchResultType
  items: SearchResult[]
  /** True when the list page holds more matches than the ones shown. */
  hasMore: boolean
  seeAllUrl: string
}

/** Below this the dropdown shows a hint instead of firing a query. */
export const MIN_SEARCH_LENGTH = 2

/** Rows shown per group. The `seeAllUrl` covers the rest. */
const PER_GROUP = 5

/**
 * Customer / document ids folded into the orders query. Generous, because these
 * only ever become an `in.(...)` list on a single follow-up query, but capped so
 * a two-letter term can't build a multi-kilobyte URL.
 */
const LOOKUP_LIMIT = 60

const GROUP_PRIORITY: SearchResultType[] = ['customer', 'order', 'product']

/**
 * Inside a double-quoted PostgREST value only `"` and `\` are special, so
 * stripping those makes an arbitrary term safe to embed in an `.or()` ilike
 * clause: commas and parentheses are then literal instead of extra or()-nodes.
 * Same hardening as services/orders.ts.
 *
 * `%` goes too (as in utils/pgSearch.ts): here it would turn a two-character
 * term into a match-all whose customer ids then become a 60-wide `in.(...)`
 * list on the follow-up orders query.
 */
function escapeForOrValue(term: string): string {
  return term.replace(/[%"\\]/g, '')
}

/**
 * Match quality, lowest wins: 0 exact, 1 prefix, 2 start of a word, 3 anywhere.
 * This is what puts "Sohbet BBQ" above "Grill Sohbet" when you type "sohbet",
 * which is the whole difference between a search box and a filter.
 */
function rank(query: string, ...fields: (string | null | undefined)[]): number {
  const q = query.toLowerCase()
  let best = 9
  for (const field of fields) {
    if (!field) continue
    const value = String(field).toLowerCase()
    if (value === q) return 0
    if (value.startsWith(q)) { best = Math.min(best, 1); continue }
    const at = value.indexOf(q)
    if (at > 0) best = Math.min(best, /[\s\-/.,_#]/.test(value[at - 1]) ? 2 : 3)
  }
  return best
}

function byScore(a: SearchResult, b: SearchResult): number {
  return a.score - b.score || a.title.localeCompare(b.title, 'nl')
}

/**
 * Short-lived result cache. Backspacing through a term re-issues queries the
 * user just ran; without this every deletion is another four round-trips.
 * TTL is deliberately tiny: a search result that is 30 seconds stale is fine,
 * one that survives an edit is not.
 */
const CACHE_TTL_MS = 30_000
const CACHE_MAX = 30
const cache = new Map<string, { at: number; groups: SearchGroup[] }>()

function readCache(key: string): SearchGroup[] | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) { cache.delete(key); return null }
  // Refresh LRU position.
  cache.delete(key)
  cache.set(key, hit)
  return hit.groups
}

function writeCache(key: string, groups: SearchGroup[]): void {
  cache.set(key, { at: Date.now(), groups })
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

/** Called after a mutation would make cached rows lie. */
export function clearSearchCache(): void {
  cache.clear()
}

interface CustomerRow {
  id: string
  company_name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  billing_city: string | null
  vat_number: string | null
  is_active: boolean
}

interface ProductRow {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  product_code: string | null
  base_price: number | string | null
  unit_type: string | null
}

interface DocumentRow {
  order_id: string | null
  document_number: string
}

interface OrderRow {
  id: string
  order_number: string
  order_date: string | null
  total: number | string | null
  woo_invoice_number: string | null
  customer: { company_name: string } | { company_name: string }[] | null
}

function firstEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function globalSearch(
  rawQuery: string,
  opts: { signal?: AbortSignal } = {},
): Promise<SearchGroup[]> {
  const query = rawQuery.trim()
  if (query.length < MIN_SEARCH_LENGTH) return []

  const cacheKey = query.toLowerCase()
  const cached = readCache(cacheKey)
  if (cached) return cached

  // Always a real signal: `.abortSignal()` is typed non-optional, and a never
  // aborted controller costs nothing.
  const signal = opts.signal ?? new AbortController().signal
  const q = escapeForOrValue(query)
  const like = `%${q}%`
  const isNumeric = /^\d+$/.test(query)
  const encoded = encodeURIComponent(query)

  // Wave 1: everything that needs no other table's ids.
  const [customersRes, productsRes, documentsRes] = await Promise.all([
    supabase
      .from('customers')
      .select('id, company_name, contact_person, email, phone, billing_city, vat_number, is_active')
      .or([
        `company_name.ilike."${like}"`,
        `contact_person.ilike."${like}"`,
        `email.ilike."${like}"`,
        `phone.ilike."${like}"`,
        `billing_city.ilike."${like}"`,
        `vat_number.ilike."${like}"`,
      ].join(','))
      // Archived customers still resolve (7-year retention keeps them around),
      // they just sort below the active ones.
      .order('is_active', { ascending: false })
      .limit(LOOKUP_LIMIT)
      .abortSignal(signal),

    supabase
      .from('products')
      .select('id, name, sku, barcode, product_code, base_price, unit_type')
      .or([
        `name.ilike."${like}"`,
        `sku.ilike."${like}"`,
        `barcode.ilike."${like}"`,
        `product_code.ilike."${like}"`,
      ].join(','))
      .limit(PER_GROUP + 1)
      .abortSignal(signal),

    // App-issued document numbers (FC-08497, CN-0003, ...) live on `documents`,
    // not on `orders`, so they are resolved to order ids for wave 2. order_id is
    // nullable (purge_order detaches it), so null rows are excluded.
    supabase
      .from('documents')
      .select('order_id, document_number')
      .ilike('document_number', like)
      .not('order_id', 'is', null)
      .limit(LOOKUP_LIMIT)
      .abortSignal(signal),
  ])

  if (signal.aborted) return []

  const customerRows = (customersRes.data ?? []) as CustomerRow[]
  const productRows = (productsRes.data ?? []) as ProductRow[]
  const documentRows = (documentsRes.data ?? []) as DocumentRow[]

  // Invoice number per order, so an order matched only by its document number
  // can say WHY it matched.
  const docNumberByOrder = new Map<string, string>()
  for (const doc of documentRows) {
    if (doc.order_id && !docNumberByOrder.has(doc.order_id)) {
      docNumberByOrder.set(doc.order_id, doc.document_number)
    }
  }

  // Wave 2: orders, reusing the ids wave 1 already resolved (so the customer
  // name lookup is not paid for twice).
  const orderClauses = [`order_number.ilike."${like}"`]
  if (isNumeric) orderClauses.push(`woo_invoice_number.eq.${query}`)
  const customerIds = customerRows.slice(0, LOOKUP_LIMIT).map(c => c.id)
  if (customerIds.length) orderClauses.push(`customer_id.in.(${customerIds.join(',')})`)
  const docOrderIds = [...docNumberByOrder.keys()]
  if (docOrderIds.length) orderClauses.push(`id.in.(${docOrderIds.join(',')})`)

  const ordersRes = await supabase
    .from('orders')
    .select('id, order_number, order_date, total, woo_invoice_number, customer:customers!customer_id(company_name)')
    // Trashed orders live in the Prullenbak, not in search.
    .is('deleted_at', null)
    .or(orderClauses.join(','))
    .order('order_date', { ascending: false })
    .limit(PER_GROUP + 1)
    .abortSignal(signal)

  if (signal.aborted) return []

  const orderRows = (ordersRes.data ?? []) as unknown as OrderRow[]

  const customers: SearchResult[] = customerRows.map(c => ({
    type: 'customer' as const,
    id: c.id,
    title: c.company_name,
    subtitle: [c.contact_person, c.billing_city, c.email].filter(Boolean).join(' · ') || undefined,
    tag: c.is_active ? undefined : 'archived',
    url: `/customers/${c.id}`,
    score: rank(query, c.company_name, c.contact_person, c.email, c.phone, c.vat_number, c.billing_city)
      + (c.is_active ? 0 : 4),
  })).sort(byScore)

  const orders: SearchResult[] = orderRows.map(o => {
    const customerName = firstEmbed(o.customer)?.company_name
    const invoiceNumber = docNumberByOrder.get(o.id) ?? o.woo_invoice_number ?? undefined
    return {
      type: 'order' as const,
      id: o.id,
      title: `#${o.order_number}`,
      subtitle: [customerName, invoiceNumber, o.order_date ? formatDate(o.order_date) : null]
        .filter(Boolean).join(' · ') || undefined,
      meta: o.total == null ? undefined : formatPrice(Number(o.total)),
      url: `/orders?order=${o.id}`,
      score: rank(query, o.order_number, invoiceNumber, customerName),
    }
  }).sort(byScore)

  const products: SearchResult[] = productRows.map(p => ({
    type: 'product' as const,
    id: p.id,
    title: p.name,
    subtitle: [p.sku, p.product_code].filter(Boolean).join(' · ') || undefined,
    meta: p.base_price == null ? undefined : formatPrice(Number(p.base_price)),
    // No product detail route: land on the list filtered to this one product.
    url: `/products?search=${encodeURIComponent(p.sku || p.name)}`,
    score: rank(query, p.name, p.sku, p.barcode, p.product_code),
  })).sort(byScore)

  const groups: SearchGroup[] = [
    { type: 'customer' as const, items: customers, seeAllUrl: `/customers?q=${encoded}` },
    { type: 'order' as const, items: orders, seeAllUrl: `/orders?q=${encoded}` },
    { type: 'product' as const, items: products, seeAllUrl: `/products?search=${encoded}` },
  ]
    .map(g => ({ ...g, hasMore: g.items.length > PER_GROUP, items: g.items.slice(0, PER_GROUP) }))
    .filter(g => g.items.length > 0)
    // Best-matching group first (typing an order number puts orders on top),
    // with a fixed order as the tie-break so the list does not jump around
    // while the term is still being typed.
    .sort((a, b) =>
      (a.items[0]?.score ?? 9) - (b.items[0]?.score ?? 9)
      || GROUP_PRIORITY.indexOf(a.type) - GROUP_PRIORITY.indexOf(b.type))

  writeCache(cacheKey, groups)
  return groups
}
