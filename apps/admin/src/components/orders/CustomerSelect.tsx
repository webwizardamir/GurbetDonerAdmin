// Customer selection section for the order form.
// Shows a searchable list of customers or the selected customer with a clear button.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, Building2, Loader2 } from 'lucide-react'
import type { Customer } from '../../types'

interface CustomerSelectProps {
  selectedCustomer: Customer | null
  customers: Customer[]
  customersLoading: boolean
  onSelect: (customer: Customer) => void
  onClear: () => void
}

export default function CustomerSelect({
  selectedCustomer,
  customers,
  customersLoading,
  onSelect,
  onClear,
}: CustomerSelectProps) {
  const { t } = useTranslation()
  const [customerSearch, setCustomerSearch] = useState('')

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true
    const query = customerSearch.toLowerCase()
    return (
      c.company_name.toLowerCase().includes(query) ||
      c.contact_person?.toLowerCase().includes(query)
    )
  })

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {t('orders.customer')} <span className="text-red-500">*</span>
      </label>
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {selectedCustomer.company_name}
              </p>
              {selectedCustomer.contact_person && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedCustomer.contact_person}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder={t('orders.form.searchCustomers')}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg">
            {customersLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                {t('orders.form.noCustomersFound')}
              </p>
            ) : (
              filteredCustomers.slice(0, 10).map(customer => (
                <button
                  key={customer.id}
                  onClick={() => {
                    onSelect(customer)
                    setCustomerSearch('')
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {customer.company_name}
                  </p>
                  {customer.contact_person && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {customer.contact_person}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
