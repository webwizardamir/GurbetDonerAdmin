import { supabase } from './supabase'
import type { Order, OrderItem, OrderStatus, PaymentMethod, UnitType } from '../types'
import { computeOrderTotals, resolveDiscountCents, resolveShippingVat, type DiscountType } from '../utils/discount'
import { refreshOrderDocumentSnapshots } from './documents'

// Database row shapes for type-safe transformations
interface DbOrderRow {
  id: string
  order_number: string
  customer_id: string
  status: OrderStatus
  payment_method?: PaymentMethod | null
  subtotal: number
  discount: number
  discount_type?: string | null
  discount_value?: number | null
  tax: number
  delivery_fee?: number
  total: number
  order_date?: string
  invoice_date?: string
  woo_invoice_number?: number | null
  woo_invoice_date?: string | null
  refund_amount?: number | null
  deleted_at?: string | null
  pre_trash_status?: OrderStatus | null
  refunds?: Array<{
    id: string
    woo_refund_id?: number | null
    woo_credit_note_number?: number | null
    refund_date: string
    amount: number
    reason?: string | null
  }>
  delivery_notes?: string
  notes?: string
  internal_notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  customer?: {
    id: string
    company_name: string
    contact_person?: string
    email?: string
    phone?: string
    billing_country?: string
    vat_number?: string
  } | { id: string; company_name: string; contact_person?: string; billing_country?: string; vat_number?: string }[] | null
  items?: DbOrderItemRow[]
}

interface DbOrderItemRow {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_sku?: string
  unit_type?: string
  quantity: number
  unit_price: number
  cost_cents?: number
  discount_amount?: number
  discount_type?: string | null
  discount_value?: number | null
  tax_rate: number
  tax_amount?: number
  total: number
  notes?: string
  created_at: string
}

export interface OrderFilters {
  status?: OrderStatus
  paymentMethod?: PaymentMethod
  customerId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
  // When true, return only trashed (soft-deleted) orders; otherwise only live ones.
  trashed?: boolean
}

export interface OrderWithItems extends Omit<Order, 'customer'> {
  items: OrderItem[]
  deleted_at?: string | null
  pre_trash_status?: OrderStatus | null
  customer: {
    id: string
    company_name: string
    contact_person?: string
    email?: string
    phone?: string
    billing_country?: string
    vat_number?: string
  } | null
}

export interface CreateOrderData {
  customer_id: string
  order_date?: string
  delivery_notes?: string
  internal_notes?: string
  payment_method?: PaymentMethod
  // Order-level discount input. percentage -> basis points (10% = 1000);
  // fixed -> cents. The service resolves + distributes it across lines.
  discount_type?: DiscountType | null
  discount_value?: number | null
  // Flat shipping fee (Verzendkosten), ex-BTW cents. Kept out of subtotal/tax
  // (never profit); folded into orders.total with its dominant-rate BTW.
  delivery_fee?: number | null
}

export interface CreateOrderItemData {
  product_id: string
  product_name: string
  product_sku?: string
  unit_type: string
  quantity: number
  unit_price: number // cents
  cost_cents?: number // cents - cost at time of sale
  // Per-line discount input. percentage -> basis points; fixed -> cents.
  discount_type?: DiscountType | null
  discount_value?: number | null
  tax_rate: number
  notes?: string
}

// Generate order number
async function generateOrderNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_order_number')
  if (error) throw error
  return data
}

// Transform database order to TypeScript interface
// Database stores INTEGER (cents), frontend expects cents
function transformOrderFromDb(dbOrder: DbOrderRow): OrderWithItems | null {
  if (!dbOrder) return null

  return {
    id: dbOrder.id,
    order_number: dbOrder.order_number,
    customer_id: dbOrder.customer_id,
    status: dbOrder.status,
    payment_method: dbOrder.payment_method || undefined,
    // Values are already in cents (INTEGER)
    subtotal: Number(dbOrder.subtotal) || 0,
    discount_amount: Number(dbOrder.discount) || 0,
    discount_type: (dbOrder.discount_type as 'percentage' | 'fixed' | null) ?? null,
    discount_value: dbOrder.discount_value ?? null,
    tax_amount: Number(dbOrder.tax) || 0,
    delivery_fee: Number(dbOrder.delivery_fee) || 0,
    total: Number(dbOrder.total) || 0,
    order_date: dbOrder.order_date || dbOrder.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    invoice_date: dbOrder.invoice_date,
    woo_invoice_number: dbOrder.woo_invoice_number ?? null,
    woo_invoice_date: dbOrder.woo_invoice_date ?? null,
    deleted_at: dbOrder.deleted_at ?? null,
    pre_trash_status: dbOrder.pre_trash_status ?? null,
    refund_amount: Number(dbOrder.refund_amount) || 0,
    refunds: dbOrder.refunds ?? [],
    delivery_notes: dbOrder.delivery_notes || dbOrder.notes || '',
    internal_notes: dbOrder.internal_notes || '',
    created_by: dbOrder.created_by,
    created_at: dbOrder.created_at,
    updated_at: dbOrder.updated_at,
    customer: Array.isArray(dbOrder.customer) ? (dbOrder.customer[0] || null) : (dbOrder.customer || null),
    items: dbOrder.items ? dbOrder.items.map(transformOrderItemFromDb) : [],
  }
}

// Transform database order item to TypeScript interface
function transformOrderItemFromDb(dbItem: DbOrderItemRow): OrderItem {
  return {
    id: dbItem.id,
    order_id: dbItem.order_id,
    product_id: dbItem.product_id,
    product_name: dbItem.product_name,
    product_sku: dbItem.product_sku,
    unit_type: (dbItem.unit_type || 'piece') as UnitType,
    quantity: Number(dbItem.quantity) || 0,
    // Values are already in cents (INTEGER)
    unit_price: Number(dbItem.unit_price) || 0,
    cost_cents: Number(dbItem.cost_cents) || 0,
    discount_amount: Number(dbItem.discount_amount) || 0,
    discount_type: (dbItem.discount_type as 'percentage' | 'fixed' | null) ?? null,
    discount_value: dbItem.discount_value ?? null,
    tax_rate: Number(dbItem.tax_rate) || 0,
    tax_amount: Number(dbItem.tax_amount) || 0,
    line_total: Number(dbItem.total) || 0,
    notes: dbItem.notes || '',
    created_at: dbItem.created_at,
  }
}

// Fetch total order count for pagination
export async function fetchOrderCount(filters: OrderFilters = {}): Promise<number> {
  let query = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })

  query = filters.trashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod)
  if (filters.customerId) query = query.eq('customer_id', filters.customerId)
  if (filters.dateFrom) query = query.gte('order_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('order_date', filters.dateTo)

  // Search by order_number, customer name, and (when numeric) the WC invoice.
  if (filters.search) {
    query = query.or(await buildSearchOr(filters.search))
  }

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

// Inside a double-quoted PostgREST value only `"` and `\` are special, so
// stripping those makes an arbitrary user term safe to embed in an `.or()`
// ilike clause (commas, parentheses, etc. are then treated literally).
function escapeForOrValue(term: string): string {
  return term.replace(/["\\]/g, '')
}

// Build a PostgREST `.or()` expression for the orders query. Matches:
//  - order_number via ilike (full trimmed phrase)
//  - the legacy WC invoice number exactly (when the term is a bare integer)
//  - any order belonging to a customer whose company name OR contact person
//    matches *every* whitespace-separated token (resolved to customer_ids in a
//    quick lookup, since the name lives on the related `customers` table).
//
// Tokenising + trimming is what makes the search whitespace-tolerant: a stray
// trailing space ("Sohbet ") collapses to a single token and still matches,
// while a real multi-word term ("Sohbet BBQ") narrows by AND-ing the tokens.
async function buildSearchOr(term: string): Promise<string> {
  const trimmed = term.trim()
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  const q = escapeForOrValue(trimmed)
  const clauses = [`order_number.ilike."%${q}%"`]
  if (/^\d+$/.test(trimmed)) clauses.push(`woo_invoice_number.eq.${trimmed}`)

  // Resolve matching customers by name. Each token must match company_name OR
  // contact_person; chaining `.or()` per token AND-combines them in PostgREST.
  // Capped so a very broad term can't blow up the IN-list / URL length;
  // order_number matching still covers the rest.
  if (tokens.length > 0) {
    let custQuery = supabase.from('customers').select('id')
    for (const token of tokens) {
      const tq = escapeForOrValue(token)
      custQuery = custQuery.or(`company_name.ilike."%${tq}%",contact_person.ilike."%${tq}%"`)
    }
    const { data: customers } = await custQuery.limit(300)
    const ids = (customers ?? []).map(c => c.id as string)
    if (ids.length > 0) clauses.push(`customer_id.in.(${ids.join(',')})`)
  }

  return clauses.join(',')
}

// Fetch orders with filters and pagination
export async function fetchOrders(filters: OrderFilters = {}): Promise<OrderWithItems[]> {
  // Fetch orders with customer and items relations
  let query = supabase
    .from('orders')
    .select(`
      id, order_number, customer_id, status, payment_method,
      subtotal, discount, discount_type, discount_value, tax, total, order_date, invoice_date,
      woo_invoice_number, woo_invoice_date, refund_amount, deleted_at, pre_trash_status,
      delivery_notes, internal_notes, created_at, updated_at, created_by,
      customer:customers!customer_id(id, company_name, contact_person, billing_country, vat_number),
      items:order_items(id, product_id, product_name, product_sku, quantity, unit_price, cost_cents, discount_amount, discount_type, discount_value, tax_rate, tax_amount, total, unit_type, notes),
      refunds:order_refunds(id, woo_refund_id, woo_credit_note_number, refund_date, amount, reason)
    `)
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false })

  query = filters.trashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.paymentMethod) {
    query = query.eq('payment_method', filters.paymentMethod)
  }

  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId)
  }

  if (filters.dateFrom) {
    query = query.gte('order_date', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('order_date', filters.dateTo)
  }

  if (filters.search) {
    query = query.or(await buildSearchOr(filters.search))
  }

  // Apply pagination with range
  const limit = filters.limit || 50
  const offset = filters.offset || 0
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) throw error
  return ((data || []) as unknown as DbOrderRow[]).map(transformOrderFromDb).filter((o): o is OrderWithItems => o !== null)
}

// Fetch single order by ID
export async function fetchOrderById(id: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers!customer_id(id, company_name, contact_person, email, phone, billing_country, vat_number),
      items:order_items(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return transformOrderFromDb(data)
}

// Resolve discounts + totals authoritatively from the discount inputs and build
// the order header + order_items rows. Shared by createOrder/updateOrderWithItems
// so the math lives in exactly one place (and matches the order form's preview,
// which calls the same computeOrderTotals). The service NEVER trusts a
// client-sent cents amount — it recomputes from {discount_type, discount_value}.
//
// Per-line `total`/`tax_amount` are stored fully net of BOTH the line discount
// and the line's share of the order-level discount (refund-safety invariant —
// see migration 00056). `order_items.discount_amount` holds the LINE portion
// only; `orders.discount` holds the grand-total discount.
function buildOrderRows(
  orderData: Pick<CreateOrderData, 'discount_type' | 'discount_value' | 'delivery_fee'>,
  items: CreateOrderItemData[],
) {
  const totals = computeOrderTotals(
    items.map(i => ({
      unitPrice: i.unit_price,
      quantity: i.quantity,
      taxRate: i.tax_rate,
      lineDiscountType: i.discount_type ?? null,
      lineDiscountValue: i.discount_value ?? null,
    })),
    orderData.discount_type ?? null,
    orderData.discount_value ?? null,
  )

  // Shipping fee (ex-BTW) follows the order's dominant BTW rate; kept OUT of
  // subtotal/discount/tax (so profit stays goods-only) and folded into `total`.
  const shipping = Math.max(0, Math.round(orderData.delivery_fee ?? 0))
  const shipVat = resolveShippingVat(shipping, totals.lines.map(l => ({ rate: l.taxRate, base: l.finalBase })))

  const itemRows = items.map((item, idx) => {
    const line = totals.lines[idx]
    return {
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku || '',
      unit_type: item.unit_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_cents: item.cost_cents || 0,
      discount_amount: line.lineDiscount,
      discount_type: item.discount_type ?? null,
      discount_value: item.discount_value ?? null,
      tax_rate: item.tax_rate,
      tax_amount: line.tax,
      total: line.total,
      notes: item.notes || null,
    }
  })

  const header = {
    subtotal: totals.subtotal,
    discount: totals.discountTotal,
    discount_type: orderData.discount_type ?? null,
    discount_value: orderData.discount_value ?? null,
    tax: totals.tax,
    delivery_fee: shipping,
    total: totals.total + shipping + shipVat.vat,
  }

  return { header, itemRows }
}

// Create order with items
export async function createOrder(
  orderData: CreateOrderData,
  items: CreateOrderItemData[]
): Promise<OrderWithItems> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  // Generate order number
  const orderNumber = await generateOrderNumber()

  const { header, itemRows } = buildOrderRows(orderData, items)

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: orderData.customer_id,
      order_date: orderData.order_date || new Date().toISOString().split('T')[0],
      delivery_notes: orderData.delivery_notes || '',
      internal_notes: orderData.internal_notes || '',
      ...header,
      created_by: userId,
    })
    .select()
    .single()

  if (orderError) throw orderError

  // Insert order items
  const itemsToInsert = itemRows.map(row => ({ order_id: order.id, ...row }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) throw itemsError

  // Fetch and return complete order
  const result = await fetchOrderById(order.id)
  if (!result) throw new Error('Failed to fetch created order')
  return result
}

// Update order status (with optional payment method for completed orders)
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  paymentMethod?: PaymentMethod
): Promise<Order> {
  const updateData: { status: OrderStatus; payment_method?: PaymentMethod } = { status }

  // If completing an order, include payment method
  if (status === 'completed' && paymentMethod) {
    updateData.payment_method = paymentMethod
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// =====================================================
// Refunds (full + partial)
// =====================================================

export interface RefundLineInput {
  order_item_id: string
  quantity: number
}

export interface CreateRefundParams {
  orderId: string
  reason?: string
  refundDate: string // 'YYYY-MM-DD'
  restoreStock: boolean
  items: RefundLineInput[]
}

export interface CreateRefundResult {
  refund_id: string
  total_refund: number       // cents, gross (incl. VAT)
  new_refund_amount: number  // cents, cumulative on the order
  fully_refunded: boolean
}

/**
 * Issue a refund (full or partial) on an order via the create_order_refund
 * RPC. The server recomputes each line amount from the immutable order_items
 * snapshot, restores stock for the refunded units, and bumps
 * orders.refund_amount. The order's status is intentionally left unchanged
 * (see migration 00050) — "fully refunded" is derived from refund_amount.
 */
export async function createOrderRefund(params: CreateRefundParams): Promise<CreateRefundResult> {
  const { data, error } = await supabase.rpc('create_order_refund', {
    p_order_id: params.orderId,
    p_reason: params.reason ?? null,
    p_refund_date: params.refundDate,
    p_restore_stock: params.restoreStock,
    p_items: params.items.map(i => ({ order_item_id: i.order_item_id, quantity: i.quantity })),
  })
  if (error) throw error
  return data as CreateRefundResult
}

/**
 * Units already refunded per order_item for an order, so the refund modal can
 * show "remaining refundable" and cap each input.
 */
export async function fetchRefundedQuantities(orderId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('order_refund_items')
    .select('order_item_id, quantity, refund:order_refunds!inner(order_id)')
    .eq('refund.order_id', orderId)
  if (error) throw error
  const out: Record<string, number> = {}
  for (const row of (data as unknown as Array<{ order_item_id: string | null; quantity: number }>) ?? []) {
    if (!row.order_item_id) continue
    out[row.order_item_id] = (out[row.order_item_id] ?? 0) + (Number(row.quantity) || 0)
  }
  return out
}

// Update order details
export async function updateOrder(
  id: string,
  updates: {
    delivery_notes?: string
    internal_notes?: string
    payment_method?: PaymentMethod
    order_date?: string
  }
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Notes-only update — edits order-level delivery/internal notes and per-line
 * product notes (the "notitie" that prints on documents) WITHOUT touching
 * quantities, prices or the item set. This is the only safe way to edit a
 * cancelled/refunded order: it issues plain UPDATEs, so the stock
 * deduct/restore triggers (which fire on order_items INSERT/DELETE) never run.
 * Works in every order status.
 */
export async function updateOrderNotes(
  orderId: string,
  orderNotes: { delivery_notes?: string; internal_notes?: string },
  itemNotes: { id: string; notes: string }[] = []
): Promise<void> {
  const orderUpdate: { delivery_notes?: string | null; internal_notes?: string | null } = {}
  if (orderNotes.delivery_notes !== undefined) orderUpdate.delivery_notes = orderNotes.delivery_notes.trim() || null
  if (orderNotes.internal_notes !== undefined) orderUpdate.internal_notes = orderNotes.internal_notes.trim() || null

  if (Object.keys(orderUpdate).length > 0) {
    const { error } = await supabase.from('orders').update(orderUpdate).eq('id', orderId)
    if (error) throw error
  }

  // Per-item notes: plain UPDATE on order_items (no INSERT/DELETE → no stock change)
  for (const item of itemNotes) {
    const { error } = await supabase
      .from('order_items')
      .update({ notes: item.notes.trim() || null })
      .eq('id', item.id)
      .eq('order_id', orderId)
    if (error) throw error
  }

  // Per-line notes print in the document "Notitie" column, so refresh any
  // existing document snapshots to match. Fire-and-forget (never throws).
  void refreshOrderDocumentSnapshots(orderId)
}

// Move an order to the trash (soft delete). Sets status=cancelled + deleted_at
// server-side, which restores stock via the existing trigger. Recoverable.
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.rpc('trash_order', { p_id: id })
  if (error) throw error
}

// Restore a trashed order back to its original status (re-deducts stock).
export async function restoreOrder(id: string): Promise<void> {
  const { error } = await supabase.rpc('restore_order', { p_id: id })
  if (error) throw error
}

// Permanently delete a trashed order (cannot be undone).
export async function purgeOrder(id: string): Promise<void> {
  const { error } = await supabase.rpc('purge_order', { p_id: id })
  if (error) throw error
}

// Permanently delete ALL trashed orders. Returns how many were purged.
export async function emptyOrderTrash(): Promise<number> {
  const { data, error } = await supabase.rpc('empty_order_trash')
  if (error) throw error
  return (data as number) ?? 0
}

// Update order with items (full order edit)
export async function updateOrderWithItems(
  orderId: string,
  orderData: Partial<CreateOrderData>,
  items: CreateOrderItemData[]
): Promise<OrderWithItems> {
  const { header, itemRows } = buildOrderRows(orderData, items)

  // Update order
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      customer_id: orderData.customer_id,
      order_date: orderData.order_date,
      delivery_notes: orderData.delivery_notes || '',
      internal_notes: orderData.internal_notes || '',
      ...header,
    })
    .eq('id', orderId)

  if (orderError) throw orderError

  // Delete existing items
  const { error: deleteError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId)

  if (deleteError) throw deleteError

  // Insert new items
  const itemsToInsert = itemRows.map(row => ({ order_id: orderId, ...row }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) throw itemsError

  // Fetch and return complete order
  const result = await fetchOrderById(orderId)
  if (!result) throw new Error('Failed to fetch updated order')

  // Keep any already-generated documents' frozen snapshots in sync with the
  // now-edited order so the Invoices page + customer portal match the live
  // Orders-page rebuild. Fire-and-forget: it contributes nothing to the
  // returned order and must not delay the save (best-effort, never throws).
  void refreshOrderDocumentSnapshots(orderId)

  return result
}

// Add item to existing order
export async function addOrderItem(
  orderId: string,
  item: CreateOrderItemData
): Promise<OrderItem> {
  // Single-item add resolves only this line's own discount. NOTE: it does not
  // re-distribute the order-level discount onto the new line — that requires a
  // full-order recompute (use updateOrderWithItems). recalculateOrderTotals
  // below keeps the header consistent with the stored line nets regardless.
  const lineSubtotal = item.unit_price * item.quantity
  const discount = resolveDiscountCents(item.discount_type ?? null, item.discount_value ?? null, lineSubtotal)
  const taxableAmount = lineSubtotal - discount
  const tax = Math.round(taxableAmount * (item.tax_rate / 100))
  const lineTotal = taxableAmount + tax

  const { data, error } = await supabase
    .from('order_items')
    .insert({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku || '',
      unit_type: item.unit_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_cents: item.cost_cents || 0,
      discount_amount: discount,
      discount_type: item.discount_type ?? null,
      discount_value: item.discount_value ?? null,
      tax_rate: item.tax_rate,
      tax_amount: tax,
      total: lineTotal,
      notes: item.notes || null,
    })
    .select()
    .single()

  if (error) throw error

  // Recalculate order totals
  await recalculateOrderTotals(orderId)

  return data
}

// Remove item from order
export async function removeOrderItem(itemId: string, orderId: string): Promise<void> {
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error

  // Recalculate order totals
  await recalculateOrderTotals(orderId)
}

// Recalculate order totals
export async function recalculateOrderTotals(orderId: string): Promise<void> {
  // Get all items for order
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (itemsError) throw itemsError

  // Derive the header from the stored per-line NET values (`total`/`tax_amount`
  // are already net of every discount), so the discount is recovered as the gap
  // between gross goods and net total. This stays correct no matter how the
  // discount was split between line and order level (the per-item `discount`
  // column only holds the line portion).
  let subtotal = 0
  let totalTax = 0
  let netTotal = 0

  for (const item of items || []) {
    // Values are in cents (INTEGER)
    const unitPrice = Number(item.unit_price) || 0
    // Round per line to match computeOrderTotals (the create/update path), so
    // decimal kg quantities don't drift the stored subtotal/discount.
    subtotal += Math.round(unitPrice * Number(item.quantity))
    totalTax += Number(item.tax_amount) || 0
    netTotal += Number(item.total) || 0
  }

  // Preserve the shipping fee (Verzendkosten): it lives in orders.delivery_fee
  // and is folded into total (with its dominant-rate BTW) — recomputing total
  // purely from line items would silently drop it.
  const { data: ord } = await supabase
    .from('orders')
    .select('delivery_fee')
    .eq('id', orderId)
    .single()
  const shipping = Math.max(0, Number(ord?.delivery_fee) || 0)
  const shipVat = resolveShippingVat(
    shipping,
    (items || []).map(it => ({
      rate: Number(it.tax_rate) || 0,
      base: (Number(it.total) || 0) - (Number(it.tax_amount) || 0),
    })),
  )

  const total = netTotal + shipping + shipVat.vat
  const totalDiscount = subtotal + totalTax - netTotal

  // Update with cents values (subtotal/discount/tax stay goods-only).
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      subtotal: subtotal,
      discount: totalDiscount,
      tax: totalTax,
      total: total,
    })
    .eq('id', orderId)

  if (updateError) throw updateError
}

// Bulk update order status (for multiple orders)
export async function bulkUpdateOrderStatus(
  ids: string[],
  status: OrderStatus,
  paymentMethod?: PaymentMethod
): Promise<void> {
  if (ids.length === 0) return

  const updateData: { status: OrderStatus; payment_method?: PaymentMethod } = { status }

  if (status === 'completed' && paymentMethod) {
    updateData.payment_method = paymentMethod
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .in('id', ids)

  if (error) throw error
}

// Bulk move orders to the trash. Sequential RPC calls (each restores stock +
// flips status); a failing one (e.g. wrong status) doesn't block the rest.
export async function bulkDeleteOrders(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const errors: string[] = []
  for (const id of ids) {
    const { error } = await supabase.rpc('trash_order', { p_id: id })
    if (error) errors.push(error.message)
  }
  if (errors.length) throw new Error(errors[0])
}

// Get order statistics using server-side RPC to avoid PostgREST 1000-row limit
export async function getOrderStats(): Promise<{
  total: number
  draft: number
  pending: number
  completed: number
  cancelled: number
}> {
  const { data, error } = await supabase.rpc('get_order_stats_by_status')

  if (error) throw error

  const stats = {
    total: 0,
    draft: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  }

  for (const row of data || []) {
    const count = Number(row.count)
    stats.total += count
    if (row.status === 'draft') stats.draft += count
    else if (row.status === 'pending_payment') stats.pending += count
    else if (row.status === 'completed') stats.completed += count
    else if (row.status === 'cancelled' || row.status === 'refunded') stats.cancelled += count
  }

  return stats
}

// Per-status order counts for the status-filter dropdown (WooCommerce-style
// `Pending (12)`). Reuses the same server RPC as getOrderStats so there's no
// extra migration; returns a raw map keyed by the exact status value plus a
// `total`. Counts are global (across all orders), matching how WC's status
// tabs behave — they are not narrowed by the other active filters.
export async function getOrderStatusCounts(): Promise<Record<string, number> & { total: number }> {
  const { data, error } = await supabase.rpc('get_order_stats_by_status')
  if (error) throw error

  const counts: Record<string, number> & { total: number } = { total: 0 }
  for (const row of data || []) {
    const count = Number(row.count)
    counts[row.status as string] = (counts[row.status as string] || 0) + count
    counts.total += count
  }
  return counts
}
