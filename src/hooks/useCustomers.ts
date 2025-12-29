import { useState, useEffect, useCallback } from 'react'
import { Customer } from '../types'
import {
  fetchCustomers,
  fetchCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerCities,
  CustomerFormData,
  CustomerFilters,
} from '../services/customers'

interface UseCustomersOptions {
  autoFetch?: boolean
  filters?: CustomerFilters
}

interface UseCustomersReturn {
  customers: Customer[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (data: CustomerFormData) => Promise<Customer>
  update: (id: string, data: Partial<CustomerFormData>) => Promise<Customer>
  remove: (id: string) => Promise<void>
  setFilters: (filters: CustomerFilters) => void
  cities: string[]
}

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { autoFetch = true, filters: initialFilters = {} } = options

  const [customers, setCustomers] = useState<Customer[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCustomers(filters)
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
      console.error('Error loading customers:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadCities = useCallback(async () => {
    try {
      const data = await getCustomerCities()
      setCities(data)
    } catch (err) {
      console.error('Error loading cities:', err)
    }
  }, [])

  useEffect(() => {
    if (autoFetch) {
      loadCustomers()
      loadCities()
    }
  }, [autoFetch, loadCustomers, loadCities])

  const create = async (data: CustomerFormData): Promise<Customer> => {
    const customer = await createCustomer(data)
    setCustomers(prev => [...prev, customer].sort((a, b) =>
      a.company_name.localeCompare(b.company_name)
    ))
    return customer
  }

  const update = async (id: string, data: Partial<CustomerFormData>): Promise<Customer> => {
    const customer = await updateCustomer(id, data)
    setCustomers(prev => prev.map(c => c.id === id ? customer : c))
    return customer
  }

  const remove = async (id: string): Promise<void> => {
    await deleteCustomer(id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  return {
    customers,
    loading,
    error,
    refresh: loadCustomers,
    create,
    update,
    remove,
    setFilters,
    cities,
  }
}

// Hook to fetch a single customer
interface UseCustomerReturn {
  customer: Customer | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  update: (data: Partial<CustomerFormData>) => Promise<Customer>
}

export function useCustomer(id: string | null): UseCustomerReturn {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCustomer = useCallback(async () => {
    if (!id) {
      setCustomer(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchCustomer(id)
      setCustomer(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer')
      console.error('Error loading customer:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  const update = async (data: Partial<CustomerFormData>): Promise<Customer> => {
    if (!id) throw new Error('No customer ID')
    const updated = await updateCustomer(id, data)
    setCustomer(updated)
    return updated
  }

  return {
    customer,
    loading,
    error,
    refresh: loadCustomer,
    update,
  }
}
