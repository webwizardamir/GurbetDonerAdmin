import { supabase } from './supabase'
import type { Order, OrderItem, OrderStatus, PaymentMethod } from '../types'

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformOrderFromDb(dbOrder: any): OrderWithItems | null {
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
    delivery_notes: dbOrder.delivery_notes || dbOrder.notes || '',
    internal_notes: dbOrder.internal_notes || '',
    created_by: dbOrder.created_by,
    created_at: dbOrder.created_at,
    updated_at: dbOrder.updated_at,
    customer: dbOrder.customer || null,
    items: dbOrder.items ? dbOrder.items.map(transformOrderItemFromDb) : [],
  }
}

// Transform database order item to TypeScript interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformOrderItemFromDb(dbItem: any) {
  return {
    id: dbItem.id,
    order_id: dbItem.order_id,
    product_id: dbItem.product_id,
    product_name: dbItem.product_name,
    product_sku: dbItem.product_sku,
    unit_type: dbItem.unit_type || 'piece',
    quantity: Number(dbItem.quantity) || 0,
    // Values are already in cents (INTEGER)
    unit_price: Number(dbItem.unit_price) || 0,
    discount_amount: Number(dbItem.discount) || 0,
    tax_rate: Number(dbItem.tax_rate) || 0,
    tax_amount: Number(dbItem.tax_amount) || 0,
    line_total: Number(dbItem.total) || 0,
    notes: dbItem.notes || '',
    created_at: dbItem.created_at,
  }
}

// Fetch orders with filters
export async function fetchOrders(filters: OrderFilters = {}): Promise<OrderWithItems[]> {
  // Fetch orders with customer and items relations
  // Only select needed customer fields to reduce payload
  let query = supabase
    .from('orders')
    .select(`
      id, order_number, customer_id, status, payment_method,
      subtotal, discount, tax, total, order_date, delivery_notes,
      internal_notes, created_at, updated_at, created_by,
      customer:customers!customer_id(id, company_name, contact_person),
      items:order_items(id, product_name, quantity, unit_price, tax_rate, total, unit_type)
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
    query = query.or(`order_number.ilike.%${filters.search}%`)
  }

  // Apply pagination
  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).map(transformOrderFromDb).filter((o): o is OrderWithItems => o !== null)
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
  return fetchOrderById(order.id) as Promise<OrderWithItems>
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
  return fetchOrderById(orderId) as Promise<OrderWithItems>
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

// Get order statistics
export async function getOrderStats(): Promise<{
  total: number
  draft: number
  pending: number
  completed: number
  cancelled: number
}> {
  const { data, error } = await supabase
    .from('orders')
    .select('status')

  if (error) throw error

  const stats = {
    total: data?.length || 0,
    draft: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  }

  for (const order of data || []) {
    if (order.status === 'draft') stats.draft++
    else if (order.status === 'pending_payment') stats.pending++
    else if (order.status === 'completed') stats.completed++
    else if (order.status === 'cancelled' || order.status === 'refunded') stats.cancelled++
  }

  return stats
}
