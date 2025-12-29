import { useState, useEffect, useCallback } from 'react'
import type { Category } from '../types'
import {
  fetchCategories,
  fetchActiveCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  deleteCategory,
} from '../services/categories'

interface UseCategoriesOptions {
  activeOnly?: boolean
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { activeOnly = false } = options
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = activeOnly
        ? await fetchActiveCategories()
        : await fetchCategories()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [activeOnly])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const create = async (category: {
    name: string
    slug?: string
    description?: string
    sort_order?: number
  }) => {
    try {
      setError(null)
      const newCategory = await createCategory(category)
      setCategories(prev => [...prev, newCategory].sort((a, b) =>
        a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      ))
      return newCategory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create category'
      setError(message)
      throw err
    }
  }

  const update = async (
    id: string,
    updates: {
      name?: string
      slug?: string
      description?: string
      sort_order?: number
      is_active?: boolean
    }
  ) => {
    try {
      setError(null)
      const updatedCategory = await updateCategory(id, updates)
      setCategories(prev =>
        prev.map(c => (c.id === id ? updatedCategory : c)).sort((a, b) =>
          a.sort_order - b.sort_order || a.name.localeCompare(b.name)
        )
      )
      return updatedCategory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update category'
      setError(message)
      throw err
    }
  }

  const deactivate = async (id: string) => {
    try {
      setError(null)
      await deactivateCategory(id)
      if (activeOnly) {
        setCategories(prev => prev.filter(c => c.id !== id))
      } else {
        setCategories(prev =>
          prev.map(c => (c.id === id ? { ...c, is_active: false } : c))
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate category'
      setError(message)
      throw err
    }
  }

  const remove = async (id: string) => {
    try {
      setError(null)
      await deleteCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category'
      setError(message)
      throw err
    }
  }

  return {
    categories,
    loading,
    error,
    refresh: loadCategories,
    create,
    update,
    deactivate,
    remove,
  }
}
