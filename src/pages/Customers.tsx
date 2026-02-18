import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  Loader2,
  Filter,
  Upload,
  Euro,
  Eye,
  Download,
  MoreVertical,
  Globe,
} from 'lucide-react'
import { useCustomers } from '../hooks/useCustomers'
import { usePermission } from '../hooks/usePermission'
import { Customer } from '../types'
import CustomerForm from '../components/customers/CustomerForm'
import CustomerImport from '../components/customers/CustomerImport'
import CustomerPricing from '../components/pricing/CustomerPricing'
import { exportToCSV, customerExportColumns } from '../utils/export'
import { supabase } from '../services/supabase'
import type { CustomerAccount } from '../services/portalAuth'

export default function Customers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { canCreate, canEdit, canDelete } = usePermission('customers')
  const {
    customers,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    cities,
  } = useCustomers()

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
      const { data } = await supabase
        .from('customer_accounts')
        .select('*')
      if (data) {
        setPortalAccounts(new Map(data.map(a => [a.customer_id, a])))
      }
    }
    fetchPortalAccounts()
  }, [customers]) // Refresh when customers change

  // Filter customers locally for instant feedback
  const filteredCustomers = customers.filter(customer => {
    // City filter
    if (cityFilter && customer.billing_city !== cityFilter) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        customer.company_name.toLowerCase().includes(query) ||
        customer.contact_person?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.vat_number?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowForm(true)
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(t('customers.confirmDelete', { name: customer.company_name }))) {
      return
    }
    setDeleting(customer.id)
    try {
      await remove(customer.id)
    } catch (err) {
      console.error('Error deleting customer:', err)
      alert(t('customers.deleteError'))
    } finally {
      setDeleting(null)
    }
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingCustomer) {
        await update(editingCustomer.id, data)
      } else {
        await create(data)
      }
      setShowForm(false)
      setEditingCustomer(null)
    } catch (err) {
      console.error('Error saving customer:', err)
      throw err
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingCustomer(null)
  }

  const handleExport = () => {
    const today = new Date().toISOString().split('T')[0]
    exportToCSV(filteredCustomers, customerExportColumns, `customers-${today}.csv`)
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* Search & Filters - Combined on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('customers.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* City Filter */}
          {cities.length > 0 && (
            <div className="relative flex-1 sm:flex-none">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
              >
                <option value="">{t('customers.allCities')}</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={filteredCustomers.length === 0}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-5 h-5" />
            <span className="hidden lg:inline">{t('common.export')}</span>
          </button>

          {/* Import Button */}
          {canCreate && (
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              <Upload className="w-5 h-5" />
              <span className="hidden lg:inline">{t('common.import')}</span>
            </button>
          )}

          {/* Spacer to push button right on desktop */}
          <div className="hidden sm:block flex-1" />

          {/* Add Customer Button */}
          {canCreate && (
            <button
              onClick={() => {
                setEditingCustomer(null)
                setShowForm(true)
              }}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('customers.addCustomer')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || cityFilter
                ? t('customers.noCustomersMatch')
                : t('customers.noCustomers')}
            </p>
            {!searchQuery && !cityFilter && canCreate && (
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                {t('customers.addFirstCustomer')}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('customers.companyName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('customers.contactPerson')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('customers.city')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('customers.vatNumber')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {customer.company_name}
                            </p>
                            {portalAccounts.get(customer.id)?.is_active && (
                              <span title={t('portal.access.enabled')} className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              </span>
                            )}
                          </div>
                          {customer.contact_person && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {customer.contact_person}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <a href={`mailto:${customer.email}`} className="hover:text-green-600 truncate max-w-[200px]">
                              {customer.email}
                            </a>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <a href={`tel:${customer.phone}`} className="hover:text-green-600">
                              {customer.phone}
                            </a>
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(customer.billing_city || customer.billing_country) ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>
                            {[customer.billing_city, customer.billing_country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.vat_number ? (
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                          {customer.vat_number}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <CustomerActionMenu
                        customer={customer}
                        isOpen={openMenuId === customer.id}
                        onToggle={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                        onClose={() => setOpenMenuId(null)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        deleting={deleting === customer.id}
                        onView={() => navigate(`/customers/${customer.id}`)}
                        onPricing={() => setPricingCustomer(customer)}
                        onEdit={() => handleEdit(customer)}
                        onDelete={() => handleDelete(customer)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || cityFilter
                ? t('customers.noCustomersMatch')
                : t('customers.noCustomers')}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <MobileCustomerCard
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

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <CustomerImport
          onClose={() => setShowImport(false)}
          onComplete={() => {
            refresh()
          }}
        />
      )}

      {/* Customer Pricing Modal */}
      {pricingCustomer && (
        <CustomerPricing
          customer={pricingCustomer}
          onClose={() => setPricingCustomer(null)}
        />
      )}
    </div>
  )
}

// Customer Action Menu Component
interface CustomerActionMenuProps {
  customer: Customer
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  canEdit: boolean
  canDelete: boolean
  deleting: boolean
  onView: () => void
  onPricing: () => void
  onEdit: () => void
  onDelete: () => void
}

function CustomerActionMenu({
  isOpen,
  onToggle,
  onClose,
  canEdit,
  canDelete,
  deleting,
  onView,
  onPricing,
  onEdit,
  onDelete,
}: CustomerActionMenuProps) {
  const { t } = useTranslation()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-slate-500 dark:text-slate-400" />
      </button>
      {isOpen && (
        <>
          {/* Invisible overlay to catch outside clicks */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          />
          {/* Menu dropdown */}
          <div className="absolute right-0 top-full mt-1 z-[9999] w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onView(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {t('customers.viewDetails')}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPricing(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Euro className="w-4 h-4 text-green-600 dark:text-green-400" />
              {t('customers.customPricing')}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Edit2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                {t('customers.editCustomer')}
              </button>
            )}
            {canDelete && (
              <>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {t('customers.deleteCustomer')}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Mobile Card Component
interface MobileCustomerCardProps {
  customer: Customer
  canEdit: boolean
  canDelete: boolean
  deleting: boolean
  isMenuOpen: boolean
  hasPortalAccess: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onEdit: () => void
  onDelete: () => void
  onPricing: () => void
  onView: () => void
}

function MobileCustomerCard({
  customer,
  canEdit,
  canDelete,
  deleting,
  isMenuOpen,
  hasPortalAccess,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
  onPricing,
  onView,
}: MobileCustomerCardProps) {
  const { t } = useTranslation()
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50"
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {customer.company_name}
              </h3>
              {hasPortalAccess && (
                <span title={t('portal.access.enabled')} className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
                  <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </span>
              )}
            </div>
            {customer.contact_person && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {customer.contact_person}
              </p>
            )}
          </div>
        </div>

        {/* Action Menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <CustomerActionMenu
            customer={customer}
            isOpen={isMenuOpen}
            onToggle={onMenuToggle}
            onClose={onMenuClose}
            canEdit={canEdit}
            canDelete={canDelete}
            deleting={deleting}
            onView={onView}
            onPricing={onPricing}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1.5 text-sm">
        {customer.email && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}
        {(customer.billing_city || customer.billing_country) && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">
              {[customer.billing_city, customer.billing_country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* VAT Number */}
      {customer.vat_number && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            VAT: <span className="font-mono text-slate-700 dark:text-slate-300">{customer.vat_number}</span>
          </p>
        </div>
      )}
    </div>
  )
}
