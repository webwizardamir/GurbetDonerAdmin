import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import type { Customer, Document, DocumentType, PaymentMethod } from '../types'

export interface CustomerOrder {
  id: string
  order_number: string
  order_date: string
  status: string
  payment_method?: PaymentMethod
  subtotal: number
  tax: number
  discount: number
  total: number
  created_at: string
  items: Array<{
    id: string
    product_name: string
    quantity: number
    unit_type: string
    unit_price: number
    total: number
  }>
  documents: Document[]
}

export interface CustomerStats {
  totalRevenue: number
  totalOrders: number
  completedOrders: number
  avgOrderValue: number
  totalItems: number
  paymentBreakdown: {
    cash: number
    bank: number
  }
}

interface CustomerDetailState {
  loading: boolean
  error: string | null
  customer: Customer | null
  orders: CustomerOrder[]
  stats: CustomerStats
}

const emptyStats: CustomerStats = {
  totalRevenue: 0,
  totalOrders: 0,
  completedOrders: 0,
  avgOrderValue: 0,
  totalItems: 0,
  paymentBreakdown: { cash: 0, bank: 0 },
}

export function useCustomerDetail(customerId: string | undefined) {
  const [state, setState] = useState<CustomerDetailState>({
    loading: true,
    error: null,
    customer: null,
    orders: [],
    stats: emptyStats,
  })

  const fetchData = useCallback(async () => {
    if (!customerId) {
      setState(prev => ({ ...prev, loading: false, error: 'No customer ID provided' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Fetch customer, orders, and documents in parallel
      const [customerResult, ordersResult] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single(),
        supabase
          .from('orders')
          .select(`
            id,
            order_number,
            order_date,
            status,
            payment_method,
            subtotal,
            tax,
            discount,
            total,
            created_at,
            items:order_items(id, product_name, quantity, unit_type, unit_price, total)
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
      ])

      if (customerResult.error) throw customerResult.error
      if (ordersResult.error) throw ordersResult.error

      const customer = customerResult.data
      const rawOrders = ordersResult.data || []

      // Fetch documents for all orders
      const orderIds = rawOrders.map(o => o.id)
      let documents: Document[] = []

      if (orderIds.length > 0) {
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .in('order_id', orderIds)

        if (docsError) throw docsError
        documents = docsData || []
      }

      // Group documents by order
      const docsByOrder = new Map<string, Document[]>()
      for (const doc of documents) {
        if (!doc.order_id) continue
        const existing = docsByOrder.get(doc.order_id) || []
        existing.push(doc)
        docsByOrder.set(doc.order_id, existing)
      }

      // Transform orders with their documents
      const orders: CustomerOrder[] = rawOrders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        order_date: order.order_date || order.created_at?.split('T')[0],
        status: order.status,
        payment_method: order.payment_method,
        subtotal: Number(order.subtotal) || 0,
        tax: Number(order.tax) || 0,
        discount: Number(order.discount) || 0,
        total: Number(order.total) || 0,
        created_at: order.created_at,
        items: (order.items || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          product_name: item.product_name as string,
          quantity: Number(item.quantity) || 0,
          unit_type: (item.unit_type as string) || 'piece',
          unit_price: Number(item.unit_price) || 0,
          total: Number(item.total) || 0,
        })),
        documents: docsByOrder.get(order.id) || [],
      }))

      // Calculate stats from completed orders
      const completedOrders = orders.filter(o =>
        o.status === 'completed' || o.status === 'delivered'
      )

      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
      const totalItems = completedOrders.reduce(
        (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
        0
      )

      const cashOrders = completedOrders.filter(o => o.payment_method === 'cash')
      const bankOrders = completedOrders.filter(o => o.payment_method === 'bank')

      const stats: CustomerStats = {
        totalRevenue,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        avgOrderValue: completedOrders.length > 0
          ? Math.round(totalRevenue / completedOrders.length)
          : 0,
        totalItems: Math.round(totalItems),
        paymentBreakdown: {
          cash: cashOrders.reduce((sum, o) => sum + o.total, 0),
          bank: bankOrders.reduce((sum, o) => sum + o.total, 0),
        },
      }

      setState({
        loading: false,
        error: null,
        customer,
        orders,
        stats,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load customer data',
      }))
    }
  }, [customerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Check if a document type exists for an order
  const hasDocument = useCallback(
    (orderId: string, docType: DocumentType): boolean => {
      const order = state.orders.find(o => o.id === orderId)
      if (!order) return false
      return order.documents.some(d => d.document_type === docType)
    },
    [state.orders]
  )

  // Get document for an order by type
  const getDocument = useCallback(
    (orderId: string, docType: DocumentType): Document | undefined => {
      const order = state.orders.find(o => o.id === orderId)
      if (!order) return undefined
      return order.documents.find(d => d.document_type === docType)
    },
    [state.orders]
  )

  return {
    ...state,
    refresh: fetchData,
    hasDocument,
    getDocument,
  }
}
