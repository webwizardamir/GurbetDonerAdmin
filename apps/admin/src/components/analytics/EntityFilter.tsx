// Granular analytics filter bar: slice profit/revenue by customer, product,
// payment method and unit type. Wraps on mobile and shows an active-filter
// chip row with clear-all. Date range + status stay in the page's own row.

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Package, CreditCard, Box, Tags, X } from 'lucide-react'
import { supabase } from '../../services/supabase'
import type { AnalyticsFilters } from '../../services/analyticsHelpers'
import type { ComboOption } from '../ui/ComboPicker'
import ListToolbar from '../ui/ListToolbar'
import type { FilterDef } from '../ui/filterTypes'
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from '../../constants/customerType'

export type FilterDim = 'customer' | 'product' | 'payment' | 'unit' | 'customerType'

interface EntityFilterProps {
  value: AnalyticsFilters
  onChange: (f: AnalyticsFilters) => void
  // Which filter controls to show. Order-grained tabs (Orders/Customers/Financial) only
  // honour customer + payment; product/unit are dropped server-side there, so showing them
  // would be a misleading no-op. Defaults to all four.
  dims?: FilterDim[]
}

const UNIT_TYPES = ['kg', 'piece', 'zak', 'doos']
const PAYMENT_METHODS = ['cash', 'bank']

export default function EntityFilter({ value, onChange, dims = ['customer', 'product', 'payment', 'unit'] }: EntityFilterProps) {
  const { t } = useTranslation()
  const show = (d: FilterDim) => dims.includes(d)
  const [customers, setCustomers] = useState<ComboOption[]>([])
  const [products, setProducts] = useState<ComboOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from('customers').select('id, company_name').order('company_name'),
      supabase.from('products').select('id, name').eq('is_active', true).order('name'),
    ]).then(([c, p]) => {
      if (cancelled) return
      setCustomers(((c.data as Array<{ id: string; company_name: string }>) ?? []).map(r => ({ value: r.id, label: r.company_name })))
      setProducts(((p.data as Array<{ id: string; name: string }>) ?? []).map(r => ({ value: r.id, label: r.name })))
      setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const set = (patch: Partial<AnalyticsFilters>) => onChange({ ...value, ...patch })
  const hasActiveShown = !!(
    (show('customer') && value.customerId) ||
    (show('product') && value.productId) ||
    (show('payment') && value.paymentMethod) ||
    (show('unit') && value.unitType) ||
    (show('customerType') && value.customerType)
  )

  const customerLabel = value.customerId ? customers.find(c => c.value === value.customerId)?.label : null
  const productLabel = value.productId ? products.find(p => p.value === value.productId)?.label : null

  // Analytics tabs are aggregates, not row lists, so no result count is passed
  // — the sheet's footer button falls back to "Klaar" rather than inventing a
  // number. `dims` still decides which dimensions are meaningful per tab.
  const filterDefs = useMemo<FilterDef[]>(() => [
    {
      id: 'customer',
      kind: 'select',
      label: t('analytics.filters.customer'),
      icon: Building2,
      hidden: !show('customer'),
      value: value.customerId ?? '',
      searchable: true,
      searchPlaceholder: t('analytics.filters.searchCustomer'),
      options: customers.map(c => ({ value: c.value, label: c.label })),
      onChange: v => set({ customerId: v || null }),
      allLabel: t('analytics.filters.allCustomers'),
    },
    {
      id: 'product',
      kind: 'select',
      label: t('analytics.filters.product'),
      icon: Package,
      hidden: !show('product'),
      value: value.productId ?? '',
      searchable: true,
      searchPlaceholder: t('analytics.filters.searchProduct'),
      options: products.map(p => ({ value: p.value, label: p.label })),
      onChange: v => set({ productId: v || null }),
      allLabel: t('analytics.filters.allProducts'),
    },
    {
      id: 'payment',
      kind: 'select',
      label: t('analytics.filters.payment'),
      icon: CreditCard,
      hidden: !show('payment'),
      value: value.paymentMethod ?? '',
      options: PAYMENT_METHODS.map(m => ({ value: m, label: t(`analytics.filters.${m}`) })),
      onChange: v => set({ paymentMethod: v || null }),
      allLabel: t('analytics.filters.allPayments'),
    },
    {
      id: 'unit',
      kind: 'select',
      label: t('analytics.filters.unitType'),
      icon: Box,
      hidden: !show('unit'),
      value: value.unitType ?? '',
      options: UNIT_TYPES.map(u => ({ value: u, label: u })),
      onChange: v => set({ unitType: v || null }),
      allLabel: t('analytics.filters.allUnits'),
    },
    {
      id: 'customerType',
      kind: 'select',
      label: t('orders.allTypes'),
      icon: Tags,
      hidden: !show('customerType'),
      value: value.customerType ?? '',
      options: CUSTOMER_TYPES.map(ct => ({ value: ct, label: CUSTOMER_TYPE_LABELS[ct] })),
      onChange: v => set({ customerType: v || null }),
      allLabel: t('orders.allTypes'),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, dims, value, customers, products, loading])

  return (
    <div className="space-y-2">
      {/* Chips below are this component's own (they carry per-dimension
          labels), so the toolbar's generic chip row is suppressed. */}
      <ListToolbar filters={filterDefs} chips={null} />

      {hasActiveShown && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.filters.active')}:</span>
          {show('customer') && customerLabel && (
            <Chip label={t('analytics.filters.customer')} value={customerLabel} onClear={() => set({ customerId: null })} />
          )}
          {show('product') && productLabel && (
            <Chip label={t('analytics.filters.product')} value={productLabel} onClear={() => set({ productId: null })} />
          )}
          {show('payment') && value.paymentMethod && (
            <Chip label={t('analytics.filters.payment')} value={t(`analytics.filters.${value.paymentMethod}`)} onClear={() => set({ paymentMethod: null })} />
          )}
          {show('unit') && value.unitType && (
            <Chip label={t('analytics.filters.unitType')} value={value.unitType} onClear={() => set({ unitType: null })} />
          )}
          {show('customerType') && value.customerType && (
            <Chip label="Type" value={CUSTOMER_TYPE_LABELS[value.customerType as keyof typeof CUSTOMER_TYPE_LABELS] ?? value.customerType} onClear={() => set({ customerType: null })} />
          )}
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
          >
            {t('common.filters.clearAll')}
          </button>
        </div>
      )}
    </div>
  )
}

function Chip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 max-w-[220px]"
    >
      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
      <span className="truncate">{value}</span>
      <X className="w-3 h-3 shrink-0" />
    </button>
  )
}
