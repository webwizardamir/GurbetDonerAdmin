import { useState, useEffect, useCallback } from 'react'
import type { PriceHistory, Product } from '../types'
import {
  fetchCustomerPrices,
  fetchPriceHistory,
  setCustomerPrice,
  deleteCustomerPrice,
  getProductsWithPricesForCustomer,
  type CustomerPriceWithProduct,
} from '../services/pricing'

export interface ProductWithPrice extends Product {
  effective_price: number
  has_custom_price: boolean
}

export function useCustomerPricing(customerId: string | null) {
  const [customerPrices, setCustomerPrices] = useState<CustomerPriceWithProduct[]>([])
  const [productsWithPrices, setProductsWithPrices] = useState<ProductWithPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPrices = useCallback(async () => {
    if (!customerId) return

    try {
      setLoading(true)
      setError(null)
      const [prices, products] = await Promise.all([
        fetchCustomerPrices(customerId),
        getProductsWithPricesForCustomer(customerId),
      ])
      setCustomerPrices(prices)
      setProductsWithPrices(products)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prices')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadPrices()
  }, [loadPrices])

  const setPrice = async (productId: string, priceInCents: number) => {
    if (!customerId) return

    try {
      setError(null)
      await setCustomerPrice(customerId, productId, priceInCents)
      await loadPrices() // Refresh all prices
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set price'
      setError(message)
      throw err
    }
  }

  const removePrice = async (customerPriceId: string) => {
    try {
      setError(null)
      await deleteCustomerPrice(customerPriceId)
      await loadPrices() // Refresh all prices
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove price'
      setError(message)
      throw err
    }
  }

  return {
    customerPrices,
    productsWithPrices,
    loading,
    error,
    refresh: loadPrices,
    setPrice,
    removePrice,
  }
}

export function usePriceHistory(customerPriceId: string | null) {
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!customerPriceId) {
      setHistory([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await fetchPriceHistory(customerPriceId)
      setHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load price history')
    } finally {
      setLoading(false)
    }
  }, [customerPriceId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return {
    history,
    loading,
    error,
    refresh: loadHistory,
  }
}
