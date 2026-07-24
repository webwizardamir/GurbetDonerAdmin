import { useState, useEffect, useCallback } from 'react'
import { Customer } from '../types'
import {
  fetchCustomers,
  fetchCustomerCount,
  fetchCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
  purgeCustomer,
  getCustomerCities,
  CustomerFormData,
  CustomerFilters,
} from '../services/customers'

interface UseCustomersOptions {
  autoFetch?: boolean
  filters?: CustomerFilters
  pageSize?: number
  /** Page to start on — used to restore the page from the URL (see useUrlListState). */
  initialPage?: number
}

interface UseCustomersReturn {
  customers: Customer[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (data: CustomerFormData) => Promise<Customer>
  update: (id: string, data: Partial<CustomerFormData>) => Promise<Customer>
  remove: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
  purge: (id: string) => Promise<void>
  setFilters: (filters: CustomerFilters) => void
  cities: string[]
  page: number
  setPage: (page: number) => void
  totalPages: number
  totalCount: number
}

const DEFAULT_CUSTOMER_PAGE_SIZE = 50

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { autoFetch = true, filters: initialFilters = {}, pageSize = DEFAULT_CUSTOMER_PAGE_SIZE, initialPage = 1 } = options

  const [customers, setCustomers] = useState<Customer[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters)
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)

  const totalPages = Math.ceil(totalCount / pageSize)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const offset = (page - 1) * pageSize
      const [data, count] = await Promise.all([
        fetchCustomers({ ...filters, limit: pageSize, offset }),
        fetchCustomerCount(filters),
      ])
      setCustomers(data)
      setTotalCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
      console.error('Error loading customers:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize])

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

  // Archive (soft delete). The customer leaves the active list.
  const remove = async (id: string): Promise<void> => {
    await archiveCustomer(id)
    setCustomers(prev => prev.filter(c => c.id !== id))
    setTotalCount(prev => Math.max(0, prev - 1))
  }

  // Restore an archived customer — it leaves the archived list.
  const restore = async (id: string): Promise<void> => {
    await restoreCustomer(id)
    setCustomers(prev => prev.filter(c => c.id !== id))
    setTotalCount(prev => Math.max(0, prev - 1))
  }

  // Permanently delete an archived customer (only if it has no orders).
  const purge = async (id: string): Promise<void> => {
    await purgeCustomer(id)
    setCustomers(prev => prev.filter(c => c.id !== id))
    setTotalCount(prev => Math.max(0, prev - 1))
  }

  const updateFilters = useCallback((newFilters: CustomerFilters) => {
    setPage(1)
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  return {
    customers,
    loading,
    error,
    refresh: loadCustomers,
    create,
    update,
    remove,
    restore,
    purge,
    setFilters: updateFilters,
    cities,
    page,
    setPage,
    totalPages,
    totalCount,
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
