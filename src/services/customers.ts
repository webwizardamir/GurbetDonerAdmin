import { supabase } from './supabase'
import { Customer } from '../types'

export interface CustomerFormData {
  company_name: string
  contact_person?: string
  email?: string
  phone?: string
  vat_number?: string
  billing_street?: string
  billing_city?: string
  billing_postal_code?: string
  billing_country?: string
  shipping_same_as_billing?: boolean
  shipping_street?: string
  shipping_city?: string
  shipping_postal_code?: string
  shipping_country?: string
  internal_notes?: string
}

export interface CustomerFilters {
  search?: string
  city?: string
}

// Fetch all customers
export async function fetchCustomers(filters?: CustomerFilters): Promise<Customer[]> {
  let query = supabase
    .from('customers')
    .select('*')
    .order('company_name', { ascending: true })

  if (filters?.city) {
    query = query.eq('billing_city', filters.city)
  }

  if (filters?.search) {
    query = query.or(
      `company_name.ilike.%${filters.search}%,` +
      `contact_person.ilike.%${filters.search}%,` +
      `email.ilike.%${filters.search}%,` +
      `phone.ilike.%${filters.search}%,` +
      `vat_number.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Fetch a single customer by ID
export async function fetchCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

// Create a new customer
export async function createCustomer(customer: CustomerFormData): Promise<Customer> {
  const { data: userData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('customers')
    .insert({
      ...customer,
      created_by: userData?.user?.id,
      billing_country: customer.billing_country || 'NL',
      shipping_same_as_billing: customer.shipping_same_as_billing ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update a customer
export async function updateCustomer(id: string, updates: Partial<CustomerFormData>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete a customer
export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get customer stats for dashboard
export async function getCustomerStats(): Promise<{
  total: number
  newThisMonth: number
}> {
  const { data, error } = await supabase.rpc('get_customer_stats')

  if (error) throw error

  return {
    total: data?.[0]?.total_customers || 0,
    newThisMonth: data?.[0]?.new_this_month || 0,
  }
}

// Get unique cities for filter dropdown
export async function getCustomerCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('billing_city')
    .not('billing_city', 'is', null)
    .order('billing_city')

  if (error) throw error

  // Get unique cities
  const cities = [...new Set(data?.map(c => c.billing_city).filter(Boolean))]
  return cities as string[]
}

// Check if email is already used by another customer
export async function checkEmailExists(email: string, excludeCustomerId?: string): Promise<boolean> {
  if (!email || email.trim() === '') return false

  let query = supabase
    .from('customers')
    .select('id')
    .ilike('email', email.trim())

  if (excludeCustomerId) {
    query = query.neq('id', excludeCustomerId)
  }

  const { data } = await query.limit(1)
  return (data?.length || 0) > 0
}
