import { supabase } from './supabase'
import type { Category } from '../types'

// Fetch all categories
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch active categories only
export async function fetchActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch single category by ID
export async function fetchCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create category
export async function createCategory(category: {
  name: string
  slug?: string
  description?: string
  sort_order?: number
}): Promise<Category> {
  // Generate slug from name if not provided
  const slug = category.slug || category.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: category.name,
      slug,
      description: category.description || null,
      sort_order: category.sort_order || 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update category
export async function updateCategory(
  id: string,
  updates: {
    name?: string
    slug?: string
    description?: string
    sort_order?: number
    is_active?: boolean
  }
): Promise<Category> {
  // If name is being updated and slug isn't provided, regenerate slug
  const updateData: Record<string, unknown> = { ...updates }
  if (updates.name && !updates.slug) {
    updateData.slug = updates.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const { data, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete category (soft delete by setting is_active = false)
export async function deactivateCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

// Hard delete category (owner only)
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Check if slug is unique
export async function isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return !data || data.length === 0
}
