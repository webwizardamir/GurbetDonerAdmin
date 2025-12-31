import { supabase } from './supabase'
import type { Order, OrderItem, OrderStatus, PaymentMethod } from '../types'

export interface OrderFilters {
  status?: OrderStatus
  customerId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
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

// Fetch orders with filters
export async function fetchOrders(filters: OrderFilters = {}): Promise<OrderWithItems[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, company_name, contact_person, email, phone),
      items:order_items(*)
    `)
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
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

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Fetch single order by ID
export async function fetchOrderById(id: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, company_name, contact_person, email, phone),
      items:order_items(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
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
      delivery_notes: orderData.delivery_notes || null,
      internal_notes: orderData.internal_notes || null,
      payment_method: orderData.payment_method || null,
      status: 'draft',
      subtotal,
      discount_amount: totalDiscount,
      tax_amount: totalTax,
      total,
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
    product_sku: item.product_sku || null,
    unit_type: item.unit_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount,
    tax_rate: item.tax_rate,
    tax_amount: item.tax_amount,
    line_total: item.line_total,
    notes: item.notes || null,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) throw itemsError

  // Fetch and return complete order
  return fetchOrderById(order.id) as Promise<OrderWithItems>
}

// Update order status
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
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
      product_sku: item.product_sku || null,
      unit_type: item.unit_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: discount,
      tax_rate: item.tax_rate,
      tax_amount: tax,
      line_total: lineTotal,
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

  let subtotal = 0
  let totalTax = 0
  let totalDiscount = 0

  for (const item of items || []) {
    subtotal += item.unit_price * item.quantity
    totalTax += item.tax_amount
    totalDiscount += item.discount_amount
  }

  const total = subtotal - totalDiscount + totalTax

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      subtotal,
      discount_amount: totalDiscount,
      tax_amount: totalTax,
      total,
    })
    .eq('id', orderId)

  if (updateError) throw updateError
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
