import { useState, useEffect, useCallback } from 'react'
import type { Product, UnitType } from '../types'
import {
  fetchProducts,
  fetchProductCount,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductFilters,
} from '../services/products'
import { setProductUnitPrices } from '../services/productUnitPrices'

const DEFAULT_PAGE_SIZE = 50

export function useProducts(initialFilters: ProductFilters = {}, pageSize: number = DEFAULT_PAGE_SIZE) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProductFilters>(initialFilters)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const totalPages = Math.ceil(totalCount / pageSize)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const offset = (page - 1) * pageSize
      const [data, count] = await Promise.all([
        fetchProducts({ ...filters, limit: pageSize, offset }),
        fetchProductCount(filters),
      ])
      setProducts(data)
      setTotalCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const create = async (product: {
    name: string
    sku?: string
    barcode?: string
    category_id?: string
    unit_type: UnitType
    base_price: number
    cost_cents?: number
    tax_rate?: number
    stock_quantity?: number
    stock_unit_type?: UnitType
    track_stock?: boolean
    description?: string
    unit_prices?: {
      unit_type: UnitType
      price: number | null
      cost_cents?: number | null
      is_default: boolean
    }[]
  }) => {
    try {
      setError(null)
      const { unit_prices, ...productData } = product
      const newProduct = await createProduct(productData)

      // Set unit prices if provided
      if (unit_prices && unit_prices.length > 0) {
        await setProductUnitPrices(newProduct.id, unit_prices)
      }

      // Refresh current page to get updated data
      await loadProducts()
      return newProduct
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create product'
      setError(message)
      throw err
    }
  }

  const update = async (
    id: string,
    updates: {
      name?: string
      sku?: string
      barcode?: string
      category_id?: string | null
      unit_type?: UnitType
      base_price?: number
      cost_cents?: number
      tax_rate?: number
      stock_quantity?: number
      stock_unit_type?: UnitType
      track_stock?: boolean
      description?: string
      unit_prices?: {
        unit_type: UnitType
        price: number | null
        cost_cents?: number | null
        is_default: boolean
      }[]
    }
  ) => {
    try {
      setError(null)
      const { unit_prices, ...productUpdates } = updates
      const updatedProduct = await updateProduct(id, productUpdates)

      // Update unit prices if provided
      if (unit_prices && unit_prices.length > 0) {
        await setProductUnitPrices(id, unit_prices)
      }

      // Refresh current page to get updated data
      await loadProducts()
      return updatedProduct
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update product'
      setError(message)
      throw err
    }
  }

  const remove = async (id: string) => {
    try {
      setError(null)
      await deleteProduct(id)
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete product'
      setError(message)
      throw err
    }
  }

  const updateFilters = useCallback((newFilters: ProductFilters) => {
    setPage(1)
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  return {
    products,
    loading,
    error,
    filters,
    setFilters: updateFilters,
    refresh: loadProducts,
    create,
    update,
    remove,
    page,
    setPage,
    totalPages,
    totalCount,
  }
}
