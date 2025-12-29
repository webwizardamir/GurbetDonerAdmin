import { useState, useEffect, useCallback } from 'react'
import type { Product, UnitType } from '../types'
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  reactivateProduct,
  deleteProduct,
  type ProductFilters,
} from '../services/products'

export function useProducts(initialFilters: ProductFilters = {}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProductFilters>(initialFilters)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchProducts(filters)
      setProducts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [filters])

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
    tax_rate?: number
    description?: string
  }) => {
    try {
      setError(null)
      const newProduct = await createProduct(product)
      setProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)))
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
      tax_rate?: number
      description?: string
      is_active?: boolean
    }
  ) => {
    try {
      setError(null)
      const updatedProduct = await updateProduct(id, updates)
      setProducts(prev =>
        prev.map(p => (p.id === id ? updatedProduct : p)).sort((a, b) => a.name.localeCompare(b.name))
      )
      return updatedProduct
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update product'
      setError(message)
      throw err
    }
  }

  const deactivate = async (id: string) => {
    try {
      setError(null)
      await deactivateProduct(id)
      setProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, is_active: false } : p))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate product'
      setError(message)
      throw err
    }
  }

  const reactivate = async (id: string) => {
    try {
      setError(null)
      await reactivateProduct(id)
      setProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, is_active: true } : p))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate product'
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

  return {
    products,
    loading,
    error,
    filters,
    setFilters,
    refresh: loadProducts,
    create,
    update,
    deactivate,
    reactivate,
    remove,
  }
}
