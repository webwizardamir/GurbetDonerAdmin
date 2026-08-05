import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Building2,
  Loader2,
  Filter,
  Tags,
  Upload,
  Archive,
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
import { customerExportColumns, withoutOwnerOnlyColumns } from '../utils/export'
import { fetchCustomers, type CustomerFormData } from '../services/customers'
import { getCustomerPerformance, type CustomerPerformanceRow } from '../services/analyticsCustomers'
import { useAuth } from '../context/AuthContext'
import ExportMenu from '../components/ui/ExportMenu'
import SelectionBar from '../components/ui/SelectionBar'
import { useRowSelection } from '../hooks/useRowSelection'
import ListToolbar, { type ToolbarAction } from '../components/ui/ListToolbar'
import type { FilterDef } from '../components/ui/filterTypes'
import SortableTh from '../components/ui/SortableTh'
import { useTableSort } from '../hooks/useTableSort'
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from '../constants/customerType'
import { useUrlListState } from '../hooks/useUrlListState'
import { supabase } from '../services/supabase'
import type { CustomerAccount } from '../services/portalAuth'

export default function Customers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { canCreate, canEdit, canDelete } = usePermission('customers')
  const { isOwner } = useAuth()

  // View state lives in the URL so opening a customer and coming back restores
  // the page + filters (see useUrlListState). Read once here, mirrored below
  // from the filter/pagination handlers.
  const [urlInit, setUrlState] = useUrlListState({ page: 1, q: '', city: '', type: '', archived: false })

  const { customers, loading, error, refresh, create, update, remove, restore, purge, cities, page, setPage, totalPages, totalCount, setFilters } = useCustomers({
    initialPage: urlInit.page,
    filters: {
      search: urlInit.q || undefined,
      city: urlInit.city || undefined,
      customerType: urlInit.type || undefined,
      archived: urlInit.archived,
    },
  })

  const [searchQuery, setSearchQuery] = useState(urlInit.q)
  const [cityFilter, setCityFilter] = useState(urlInit.city)
  const [typeFilter, setTypeFilter] = useState(urlInit.type)
  const [showArchived, setShowArchived] = useState(urlInit.archived)

  // Paging goes through here so the URL always reflects the visible page.
  const goToPage = (next: number) => { setPage(next); setUrlState({ page: next }) }
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

  // Each filter effect below skips its initial run, so the URL is only ever
  // written in response to a real user change — never on mount, where it could
  // clobber the params we just read.
  // setFilters() resets the hook to page 1, so the URL mirror does too.

  // Debounced server-side search (skip initial mount)
  const [searchInit, setSearchInit] = useState(false)
  useEffect(() => {
    if (!searchInit) { setSearchInit(true); return }
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery || undefined })
      setUrlState({ q: searchQuery, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Server-side city filter (skip initial mount)
  const [cityInit, setCityInit] = useState(false)
  useEffect(() => {
    if (!cityInit) { setCityInit(true); return }
    setFilters({ city: cityFilter || undefined })
    setUrlState({ city: cityFilter, page: 1 })
  }, [cityFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Server-side customer-type filter (skip initial mount)
  const [typeInit, setTypeInit] = useState(false)
  useEffect(() => {
    if (!typeInit) { setTypeInit(true); return }
    setFilters({ customerType: typeFilter || undefined })
    setUrlState({ type: typeFilter, page: 1 })
  }, [typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle between active and archived customers (skip initial mount)
  const [archivedInit, setArchivedInit] = useState(false)
  useEffect(() => {
    if (!archivedInit) { setArchivedInit(true); return }
    setFilters({ archived: showArchived })
    setUrlState({ archived: showArchived, page: 1 })
  }, [showArchived]) // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 6: sortable columns
  type CustomerSortKey = 'company_name' | 'contact_person' | 'city' | 'vat_number' | 'price_list' | 'customer_type'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<CustomerSortKey>('company_name', 'asc')

  const filteredCustomers = useMemo(() => sortBy(customers, {
    company_name:   c => c.company_name,
    contact_person: c => c.contact_person ?? '',
    city:           c => c.billing_city ?? '',
    vat_number:     c => c.vat_number ?? '',
    price_list:     c => c.price_list?.name ?? '',
    customer_type:  c => c.customer_type ?? '',
  }), [customers, sortBy])

  const handleEdit = (customer: Customer) => { setEditingCustomer(customer); setShowForm(true) }

  // "Delete" = archive (soft delete): a hard delete is blocked by order history
  // and Dutch retention. See migration 00093.
  const handleArchive = async (customer: Customer) => {
    if (!confirm(t('customers.confirmArchive', { name: customer.company_name }))) return
    setDeleting(customer.id)
    try { await remove(customer.id) }
    catch (err) { console.error('Error archiving customer:', err); alert(t('customers.archiveError')) }
    finally { setDeleting(null) }
  }

  const handleRestore = async (customer: Customer) => {
    setDeleting(customer.id)
    try { await restore(customer.id) }
    catch (err) {
      console.error('Error restoring customer:', err)
      alert(err instanceof Error && err.message === 'EMAIL_TAKEN'
        ? t('customers.restoreEmailTaken')
        : t('customers.restoreError'))
    }
    finally { setDeleting(null) }
  }

  const handlePurge = async (customer: Customer) => {
    if (!confirm(t('customers.confirmPermanentDelete', { name: customer.company_name }))) return
    setDeleting(customer.id)
    try { await purge(customer.id) }
    catch (err) {
      console.error('Error deleting customer:', err)
      alert(err instanceof Error && err.message === 'HAS_ORDERS'
        ? t('customers.purgeHasOrders')
        : t('customers.deleteError'))
    }
    finally { setDeleting(null) }
  }

  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      if (editingCustomer) { await update(editingCustomer.id, data) }
      else { await create(data) }
      setShowForm(false); setEditingCustomer(null)
    } catch (err) { console.error('Error saving customer:', err); throw err }
  }

  const handleFormClose = () => { setShowForm(false); setEditingCustomer(null) }

  // Row selection (export scope only — no bulk actions)
  // NOT cleared on search/filter/page change — see useRowSelection. Keeping the
  // rows (not just ids) means the export's "selected" scope also covers picks
  // made under an earlier search that are no longer on screen.
  const { selectedIds, selectedItems: selectedCustomers, selectedCount, toggle, toggleAllVisible, clear: clearSelection } = useRowSelection<Customer>()
  const toggleSelect = (id: string) => {
    const row = filteredCustomers.find(c => c.id === id)
    if (row) toggle(row)
  }
  const toggleSelectAll = () => toggleAllVisible(filteredCustomers)

  // --- Owner-only COG/profit columns for the export -------------------------
  // `customers` rows carry no cost or profit, and a per-customer rollup would be
  // an N+1. get_customer_performance returns all-time totals for every customer
  // in ONE call and is server-gated (is_owner() -> NULL cost/profit), so unlike
  // the Products/Orders exports this one is gated in the RPC too, not just here.
  // Loaded once on mount, owner only.
  const [perfByCustomer, setPerfByCustomer] = useState<Map<string, CustomerPerformanceRow>>(new Map())
  useEffect(() => {
    if (!isOwner) return
    let cancelled = false
    getCustomerPerformance()
      .then(rows => {
        if (!cancelled) setPerfByCustomer(new Map(rows.map(r => [r.customerId, r])))
      })
      // Never let this kill the export — the cost cells just come out blank.
      .catch(err => console.error('customer performance (export columns)', err))
    return () => { cancelled = true }
  }, [isOwner])

  const withCostFields = useCallback((c: Customer) => {
    if (!isOwner) return c
    const p = perfByCustomer.get(c.id)
    if (!p) return c
    return { ...c, total_cost: p.totalCost, total_profit: p.totalProfit, margin_pct: p.profitMargin }
  }, [isOwner, perfByCustomer])

  const customerExportColumnsGated = useMemo(
    () => (isOwner ? customerExportColumns : withoutOwnerOnlyColumns(customerExportColumns)),
    [isOwner],
  )

  // The city and type selects used to sit in the toolbar as `flex-1 sm:flex-none`
  // pairs, which on a phone collapsed into two ~40%-wide stubs showing an icon
  // and a truncated first letter ("A , A"). They now live in the filter sheet.
  const filterDefs = useMemo<FilterDef[]>(() => [
    {
      id: 'city',
      kind: 'select',
      label: t('customers.allCities'),
      icon: Filter,
      hidden: cities.length === 0,
      value: cityFilter,
      // Long list -> searchable picker instead of a native select.
      searchable: true,
      searchPlaceholder: t('common.search'),
      options: cities.map(c => ({ value: c, label: c })),
      onChange: setCityFilter,
      allLabel: t('customers.allCities'),
    },
    {
      id: 'type',
      kind: 'select',
      label: t('orders.allTypes'),
      icon: Tags,
      value: typeFilter,
      options: CUSTOMER_TYPES.map(ct => ({ value: ct, label: CUSTOMER_TYPE_LABELS[ct] })),
      onChange: setTypeFilter,
      allLabel: t('orders.allTypes'),
    },
    {
      id: 'archived',
      kind: 'toggle',
      label: t('customers.showArchived'),
      icon: Archive,
      value: showArchived,
      onChange: setShowArchived,
    },
  ], [t, cities, cityFilter, setCityFilter, typeFilter, setTypeFilter, showArchived, setShowArchived])

  const toolbarActions = useMemo<ToolbarAction[]>(() => {
    const list: ToolbarAction[] = [{
      id: 'export',
      label: t('common.export'),
      icon: Upload,
      priority: 'secondary',
      render: (mode) => (
        <ExportMenu
          variant={mode === 'menuitem' ? 'menuitem' : 'button'}
          getAllData={async () => (await fetchCustomers({ search: searchQuery || undefined, city: cityFilter || undefined, customerType: typeFilter || undefined, archived: showArchived })).map(withCostFields)}
          pageData={filteredCustomers.map(withCostFields)}
          selectedData={selectedCustomers.map(withCostFields)}
          onSelectionExported={clearSelection}
          totalCount={totalCount}
          columns={customerExportColumnsGated as never}
          filename={`customers-${new Date().toISOString().split('T')[0]}`}
          pdfTitle="Klanten"
          storageKey="customers"
        />
      ),
      // Mounted at the toolbar root so the ⋮ menu closing cannot unmount it.
      renderOverlay: (open, onClose) => (
        <ExportMenu
          headless
          open={open}
          onOpenChange={o => { if (!o) onClose() }}
                    getAllData={async () => (await fetchCustomers({ search: searchQuery || undefined, city: cityFilter || undefined, customerType: typeFilter || undefined, archived: showArchived })).map(withCostFields)}
          pageData={filteredCustomers.map(withCostFields)}
          selectedData={selectedCustomers.map(withCostFields)}
          onSelectionExported={clearSelection}
          totalCount={totalCount}
          columns={customerExportColumnsGated as never}
          filename={`customers-${new Date().toISOString().split('T')[0]}`}
          pdfTitle="Klanten"
          storageKey="customers"
        />
      ),
    }]
    if (canCreate && !showArchived) {
      list.push({ id: 'import', label: t('common.import'), icon: Upload, priority: 'secondary', onClick: () => setShowImport(true) })
      list.push({ id: 'add', label: t('customers.addCustomer'), icon: Plus, priority: 'primary', onClick: () => { setEditingCustomer(null); setShowForm(true) } })
    }
    return list
  }, [t, canCreate, showArchived, searchQuery, cityFilter, typeFilter, filteredCustomers, selectedCustomers, totalCount, customerExportColumnsGated, withCostFields, clearSelection])

  return (
    <div className="space-y-4 min-w-0">
      <ListToolbar
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: t('customers.searchPlaceholder') }}
        filters={filterDefs}
        actions={toolbarActions}
        resultCount={totalCount}
        resultsLoading={loading}
        renderResultLabel={n => t('common.filters.showResults', { count: n })}
      />

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
            <p className="text-slate-600 dark:text-slate-400">{showArchived ? t('customers.noArchived') : (searchQuery || cityFilter || typeFilter ? t('customers.noCustomersMatch') : t('customers.noCustomers'))}</p>
            {!showArchived && !searchQuery && !cityFilter && !typeFilter && canCreate && <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">{t('customers.addFirstCustomer')}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.has(c.id))} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                  </th>
                  <SortableTh sortKey="company_name"   current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('customers.companyName')}</SortableTh>
                  <SortableTh sortKey="contact_person" current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('customers.contactPerson')}</SortableTh>
                  <SortableTh sortKey="city"           current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('customers.city')}</SortableTh>
                  <SortableTh sortKey="vat_number"     current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('customers.vatNumber')}</SortableTh>
                  <SortableTh sortKey="customer_type"  current={sortKey} dir={sortDir} onToggle={toggleSort} align="center">Type</SortableTh>
                  <SortableTh sortKey="price_list"     current={sortKey} dir={sortDir} onToggle={toggleSort} align="center">{t('customers.priceList')}</SortableTh>
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
                    archived={showArchived}
                    selected={selectedIds.has(customer.id)}
                    onToggleSelect={() => toggleSelect(customer.id)}
                    onMenuToggle={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                    onMenuClose={() => setOpenMenuId(null)}
                    onView={() => navigate(`/customers/${customer.id}`)}
                    onPricing={() => setPricingCustomer(customer)}
                    onEdit={() => handleEdit(customer)}
                    onDelete={() => handleArchive(customer)}
                    onRestore={() => handleRestore(customer)}
                    onPurge={() => handlePurge(customer)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {!loading && filteredCustomers.length > 0 && (
          <SelectionBar
            selectedCount={selectedCount}
            visibleCount={filteredCustomers.length}
            allVisibleSelected={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.has(c.id))}
            someVisibleSelected={filteredCustomers.some(c => selectedIds.has(c.id))}
            onToggleSelectAll={toggleSelectAll}
            onClear={clearSelection}
          />
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{showArchived ? t('customers.noArchived') : (searchQuery || cityFilter || typeFilter ? t('customers.noCustomersMatch') : t('customers.noCustomers'))}</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              canEdit={canEdit}
              canDelete={canDelete}
              deleting={deleting === customer.id}
              archived={showArchived}
              showSelection
              selected={selectedIds.has(customer.id)}
              onToggleSelect={() => toggleSelect(customer.id)}
              isMenuOpen={openMenuId === customer.id}
              hasPortalAccess={portalAccounts.get(customer.id)?.is_active || false}
              onMenuToggle={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
              onMenuClose={() => setOpenMenuId(null)}
              onEdit={() => handleEdit(customer)}
              onDelete={() => handleArchive(customer)}
              onPricing={() => setPricingCustomer(customer)}
              onView={() => navigate(`/customers/${customer.id}`)}
              onRestore={() => handleRestore(customer)}
              onPurge={() => handlePurge(customer)}
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
              onClick={() => goToPage(Math.max(1, page - 1))}
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
                    onClick={() => goToPage(pageNum)}
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
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
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
