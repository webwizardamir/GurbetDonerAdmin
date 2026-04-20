import { supabase } from './supabase'
import type { Order, OrderItem, OrderStatus, PaymentMethod, UnitType } from '../types'

// Database row shapes for type-safe transformations
interface DbOrderRow {
  id: string
  order_number: string
  customer_id: string
  status: OrderStatus
  payment_method?: PaymentMethod | null
  subtotal: number
  discount: number
  tax: number
  delivery_fee?: number
  total: number
  order_date?: string
  invoice_date?: string
  woo_invoice_number?: number | null
  woo_invoice_date?: string | null
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
  } | { id: string; company_name: string; contact_person?: string }[] | null
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
  discount?: number
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
}

export interface OrderWithItems extends Omit<Order, 'customer'> {
  items: OrderItem[]
  customer: {
    id: string
    company_name: string
    contact_person?: string
    email?: string
    phone?: string
  } | null
}

export interface CreateOrderData {
  customer_id: string
  order_date?: string
  delivery_notes?: string
  internal_notes?: string
  payment_method?: PaymentMethod
}

export interface CreateOrderItemData {
  product_id: string
  product_name: string
  product_sku?: string
  unit_type: string
  quantity: number
  unit_price: number // cents
  cost_cents?: number // cents - cost at time of sale
  discount_amount?: number // cents
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
    tax_amount: Number(dbOrder.tax) || 0,
    delivery_fee: Number(dbOrder.delivery_fee) || 0,
    total: Number(dbOrder.total) || 0,
    order_date: dbOrder.order_date || dbOrder.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    invoice_date: dbOrder.invoice_date,
    woo_invoice_number: dbOrder.woo_invoice_number ?? null,
    woo_invoice_date: dbOrder.woo_invoice_date ?? null,
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
    discount_amount: Number(dbItem.discount) || 0,
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

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod)
  if (filters.customerId) query = query.eq('customer_id', filters.customerId)
  if (filters.dateFrom) query = query.gte('order_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('order_date', filters.dateTo)

  // Search by order_number and, when numeric, also by woo_invoice_number.
  if (filters.search) {
    query = query.or(buildSearchOr(filters.search))
  }

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

// Build a PostgREST `.or()` expression that matches order_number via ilike
// and, if the term is a bare integer, also matches the legacy WC invoice number exactly.
function buildSearchOr(term: string): string {
  const clauses = [`order_number.ilike.%${term}%`]
  if (/^\d+$/.test(term)) clauses.push(`woo_invoice_number.eq.${term}`)
  return clauses.join(',')
}

// Fetch orders with filters and pagination
export async function fetchOrders(filters: OrderFilters = {}): Promise<OrderWithItems[]> {
  // Fetch orders with customer and items relations
  let query = supabase
    .from('orders')
    .select(`
      id, order_number, customer_id, status, payment_method,
      subtotal, discount, tax, total, order_date, invoice_date,
      woo_invoice_number, woo_invoice_date,
      delivery_notes, internal_notes, created_at, updated_at, created_by,
      customer:customers!customer_id(id, company_name, contact_person),
      items:order_items(id, product_id, product_name, product_sku, quantity, unit_price, cost_cents, tax_rate, total, unit_type)
    `)
    .order('created_at', { ascending: false })

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
    query = query.or(buildSearchOr(filters.search))
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
      customer:customers!customer_id(id, company_name, contact_person, email, phone),
      items:order_items(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return transformOrderFromDb(data)
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

  // Calculate totals
  let subtotal = 0
  let totalTax = 0
  let totalDiscount = 0

  const processedItems = items.map(item => {
    const lineSubtotal = item.unit_price * item.quantity
    const discount = item.discount_amount || 0
    const taxableAmount = lineSubtotal - discount
    const tax = Math.round(taxableAmount * (item.tax_rate / 100))
    const lineTotal = taxableAmount + tax

    subtotal += lineSubtotal
    totalTax += tax
    totalDiscount += discount

    return {
      ...item,
      discount_amount: discount,
      tax_amount: tax,
      line_total: lineTotal,
    }
  })

  const total = subtotal - totalDiscount + totalTax

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: orderData.customer_id,
      order_date: orderData.order_date || new Date().toISOString().split('T')[0],
      delivery_notes: orderData.delivery_notes || '',
      internal_notes: orderData.internal_notes || '',
      subtotal: subtotal,
      tax: totalTax,
      discount: totalDiscount,
      total: total,
      created_by: userId,
    })
    .select()
    .single()

  if (orderError) throw orderError

  // Insert order items
  const itemsToInsert = processedItems.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku || '',
    unit_type: item.unit_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    cost_cents: item.cost_cents || 0,
    discount_amount: item.discount_amount,
    tax_rate: item.tax_rate,
    tax_amount: item.tax_amount,
    total: item.line_total,
  }))

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

// Delete order (and its items - cascade)
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Update order with items (full order edit)
export async function updateOrderWithItems(
  orderId: string,
  orderData: Partial<CreateOrderData>,
  items: CreateOrderItemData[]
): Promise<OrderWithItems> {
  // Calculate totals
  let subtotal = 0
  let totalTax = 0
  let totalDiscount = 0

  const processedItems = items.map(item => {
    const lineSubtotal = item.unit_price * item.quantity
    const discount = item.discount_amount || 0
    const taxableAmount = lineSubtotal - discount
    const tax = Math.round(taxableAmount * (item.tax_rate / 100))
    const lineTotal = taxableAmount + tax

    subtotal += lineSubtotal
    totalTax += tax
    totalDiscount += discount

    return {
      ...item,
      discount_amount: discount,
      tax_amount: tax,
      line_total: lineTotal,
    }
  })

  const total = subtotal - totalDiscount + totalTax

  // Update order
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      customer_id: orderData.customer_id,
      order_date: orderData.order_date,
      delivery_notes: orderData.delivery_notes || '',
      internal_notes: orderData.internal_notes || '',
      subtotal: subtotal,
      tax: totalTax,
      discount: totalDiscount,
      total: total,
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
  const itemsToInsert = processedItems.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku || '',
    unit_type: item.unit_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    cost_cents: item.cost_cents || 0,
    discount_amount: item.discount_amount,
    tax_rate: item.tax_rate,
    tax_amount: item.tax_amount,
    total: item.line_total,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) throw itemsError

  // Fetch and return complete order
  const result = await fetchOrderById(orderId)
  if (!result) throw new Error('Failed to fetch updated order')
  return result
}

// Add item to existing order
export async function addOrderItem(
  orderId: string,
  item: CreateOrderItemData
): Promise<OrderItem> {
  const lineSubtotal = item.unit_price * item.quantity
  const discount = item.discount_amount || 0
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
      tax_rate: item.tax_rate,
      tax_amount: tax,
      total: lineTotal,
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

  let subtotal = 0
  let totalTax = 0
  let totalDiscount = 0

  for (const item of items || []) {
    // Values are in cents (INTEGER)
    const unitPrice = Number(item.unit_price) || 0
    subtotal += unitPrice * Number(item.quantity)
    totalTax += Number(item.tax_amount) || 0
    totalDiscount += Number(item.discount) || 0
  }

  const total = subtotal - totalDiscount + totalTax

  // Update with cents values
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

// Bulk delete orders (and their items - cascade)
export async function bulkDeleteOrders(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const { error } = await supabase
    .from('orders')
    .delete()
    .in('id', ids)

  if (error) throw error
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
