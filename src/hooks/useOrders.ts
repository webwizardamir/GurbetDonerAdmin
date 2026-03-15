import { useState, useEffect, useCallback } from 'react'
import type { OrderStatus } from '../types'
import {
  fetchOrders,
  fetchOrderCount,
  fetchOrderById,
  createOrder,
  updateOrderStatus,
  updateOrder,
  updateOrderWithItems,
  deleteOrder,
  getOrderStats,
  type OrderFilters,
  type OrderWithItems,
  type CreateOrderData,
  type CreateOrderItemData,
} from '../services/orders'

// Orders per page
const PAGE_SIZE = 50

export function useOrders(initialFilters: OrderFilters = {}) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<OrderFilters>({
    limit: PAGE_SIZE,
    ...initialFilters,
  })

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const offset = (page - 1) * PAGE_SIZE
      const [data, count] = await Promise.all([
        fetchOrders({ ...filters, limit: PAGE_SIZE, offset }),
        fetchOrderCount(filters),
      ])
      setOrders(data)
      setTotalCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Reset to page 1 when filters change
  const updateFilters = useCallback((newFilters: OrderFilters) => {
    setPage(1)
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const create = async (orderData: CreateOrderData, items: CreateOrderItemData[]) => {
    try {
      setError(null)
      const newOrder = await createOrder(orderData, items)
      setOrders(prev => [newOrder, ...prev])
      return newOrder
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order'
      setError(message)
      throw err
    }
  }

  const changeStatus = async (id: string, status: OrderStatus) => {
    try {
      setError(null)
      await updateOrderStatus(id, status)
      // Refresh orders to get updated data
      await loadOrders()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      setError(message)
      throw err
    }
  }

  const update = async (
    id: string,
    updates: Parameters<typeof updateOrder>[1]
  ) => {
    try {
      setError(null)
      const updated = await updateOrder(id, updates)
      setOrders(prev =>
        prev.map(o => (o.id === id ? { ...o, ...updated } : o))
      )
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order'
      setError(message)
      throw err
    }
  }

  const updateWithItems = async (
    id: string,
    orderData: Partial<CreateOrderData>,
    items: CreateOrderItemData[]
  ) => {
    try {
      setError(null)
      const updated = await updateOrderWithItems(id, orderData, items)
      setOrders(prev =>
        prev.map(o => (o.id === id ? updated : o))
      )
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order'
      setError(message)
      throw err
    }
  }

  const remove = async (id: string) => {
    try {
      setError(null)
      await deleteOrder(id)
      setOrders(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete order'
      setError(message)
      throw err
    }
  }

  return {
    orders,
    loading,
    error,
    filters,
    setFilters: updateFilters,
    refresh: loadOrders,
    create,
    changeStatus,
    update,
    updateWithItems,
    remove,
    // Pagination
    page,
    setPage,
    totalPages,
    totalCount,
    pageSize: PAGE_SIZE,
  }
}

export function useOrder(orderId: string | null) {
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await fetchOrderById(orderId)
      setOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  return {
    order,
    loading,
    error,
    refresh: loadOrder,
  }
}

export function useOrderStats() {
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOrderStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats,
  }
}
