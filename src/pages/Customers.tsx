import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Plus,
  Building2,
  Loader2,
  Filter,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useCustomers } from '../hooks/useCustomers'
import { usePermission } from '../hooks/usePermission'
import { Customer } from '../types'
import CustomerForm from '../components/customers/CustomerForm'
import CustomerImport from '../components/customers/CustomerImport'
import CustomerPricing from '../components/pricing/CustomerPricing'
import CustomerTableRow from '../components/customers/CustomerTableRow'
import CustomerCard from '../components/customers/CustomerCard'
import { exportToExcelGeneric, customerExportColumns } from '../utils/export'
import { supabase } from '../services/supabase'
import type { CustomerAccount } from '../services/portalAuth'

export default function Customers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { canCreate, canEdit, canDelete } = usePermission('customers')
  const { customers, loading, error, refresh, create, update, remove, cities, page, setPage, totalPages, totalCount, setFilters } = useCustomers()

  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [pricingCustomer, setPricingCustomer] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [portalAccounts, setPortalAccounts] = useState<Map<string, CustomerAccount>>(new Map())

  // Fetch portal accounts
  useEffect(() => {
    const fetchPortalAccounts = async () => {
      const { data } = await supabase.from('customer_accounts').select('*')
      if (data) setPortalAccounts(new Map(data.map(a => [a.customer_id, a])))
    }
    fetchPortalAccounts()
  }, [customers])

  // Debounced server-side search (skip initial mount)
  const [searchInit, setSearchInit] = useState(false)
  useEffect(() => {
    if (!searchInit) { setSearchInit(true); return }
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Server-side city filter (skip initial mount)
  const [cityInit, setCityInit] = useState(false)
  useEffect(() => {
    if (!cityInit) { setCityInit(true); return }
    setFilters({ city: cityFilter || undefined })
  }, [cityFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCustomers = customers

  const handleEdit = (customer: Customer) => { setEditingCustomer(customer); setShowForm(true) }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(t('customers.confirmDelete', { name: customer.company_name }))) return
    setDeleting(customer.id)
    try { await remove(customer.id) }
    catch (err) { console.error('Error deleting customer:', err); alert(t('customers.deleteError')) }
    finally { setDeleting(null) }
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingCustomer) { await update(editingCustomer.id, data) }
      else { await create(data) }
      setShowForm(false); setEditingCustomer(null)
    } catch (err) { console.error('Error saving customer:', err); throw err }
  }

  const handleFormClose = () => { setShowForm(false); setEditingCustomer(null) }
  const handleExport = () => exportToExcelGeneric(filteredCustomers, customerExportColumns, `customers-${new Date().toISOString().split('T')[0]}`)

  return (
    <div className="space-y-4 min-w-0">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('customers.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {cities.length > 0 && (
            <div className="relative flex-1 sm:flex-none">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer">
                <option value="">{t('customers.allCities')}</option>
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          )}
          <button onClick={handleExport} disabled={filteredCustomers.length === 0}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors whitespace-nowrap disabled:opacity-50" title="Export to Excel">
            <Download className="w-5 h-5" /><span className="hidden lg:inline">{t('common.export')}</span>
          </button>
          {canCreate && (
            <button onClick={() => setShowImport(true)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
              <Upload className="w-5 h-5" /><span className="hidden lg:inline">{t('common.import')}</span>
            </button>
          )}
          <div className="hidden sm:block flex-1" />
          {canCreate && (
            <button onClick={() => { setEditingCustomer(null); setShowForm(true) }}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap shrink-0">
              <Plus className="w-5 h-5" /><span className="hidden sm:inline">{t('customers.addCustomer')}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{searchQuery || cityFilter ? t('customers.noCustomersMatch') : t('customers.noCustomers')}</p>
            {!searchQuery && !cityFilter && canCreate && <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">{t('customers.addFirstCustomer')}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('customers.companyName')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('customers.contactPerson')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('customers.city')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('customers.vatNumber')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredCustomers.map((customer) => (
                  <CustomerTableRow
                    key={customer.id}
                    customer={customer}
                    hasPortalAccess={portalAccounts.get(customer.id)?.is_active || false}
                    isMenuOpen={openMenuId === customer.id}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    deleting={deleting === customer.id}
                    onMenuToggle={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                    onMenuClose={() => setOpenMenuId(null)}
                    onView={() => navigate(`/customers/${customer.id}`)}
                    onPricing={() => setPricingCustomer(customer)}
                    onEdit={() => handleEdit(customer)}
                    onDelete={() => handleDelete(customer)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{searchQuery || cityFilter ? t('customers.noCustomersMatch') : t('customers.noCustomers')}</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              canEdit={canEdit}
              canDelete={canDelete}
              deleting={deleting === customer.id}
              isMenuOpen={openMenuId === customer.id}
              hasPortalAccess={portalAccounts.get(customer.id)?.is_active || false}
              onMenuToggle={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
              onMenuClose={() => setOpenMenuId(null)}
              onEdit={() => handleEdit(customer)}
              onDelete={() => handleDelete(customer)}
              onPricing={() => setPricingCustomer(customer)}
              onView={() => navigate(`/customers/${customer.id}`)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-3">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            <span className="hidden sm:inline">{t('common.showing')} </span>{((page - 1) * 50) + 1}-{Math.min(page * 50, totalCount)} <span className="hidden sm:inline">{t('common.of')}</span><span className="sm:hidden">/</span> {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {(() => {
              const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 7
              return Array.from({ length: Math.min(totalPages, maxVisible) }, (_, i) => {
                let pageNum: number
                const half = Math.floor(maxVisible / 2)
                if (totalPages <= maxVisible) {
                  pageNum = i + 1
                } else if (page <= half + 1) {
                  pageNum = i + 1
                } else if (page >= totalPages - half) {
                  pageNum = totalPages - maxVisible + 1 + i
                } else {
                  pageNum = page - half + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      pageNum === page
                        ? 'bg-green-600 text-white font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })
            })()}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showForm && <CustomerForm customer={editingCustomer} onSubmit={handleFormSubmit} onClose={handleFormClose} />}
      {showImport && <CustomerImport onClose={() => setShowImport(false)} onComplete={() => { refresh() }} />}
      {pricingCustomer && <CustomerPricing customer={pricingCustomer} onClose={() => setPricingCustomer(null)} />}
    </div>
  )
}
