// Granular analytics filter bar: slice profit/revenue by customer, product,
// payment method and unit type. Wraps on mobile and shows an active-filter
// chip row with clear-all. Date range + status stay in the page's own row.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Package, CreditCard, Box, X } from 'lucide-react'
import { supabase } from '../../services/supabase'
import type { AnalyticsFilters } from '../../services/analyticsHelpers'
import ComboPicker, { type ComboOption } from '../ui/ComboPicker'

export type FilterDim = 'customer' | 'product' | 'payment' | 'unit'

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

const selectClass =
  'pl-3 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer'

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
    (show('unit') && value.unitType)
  )

  const customerLabel = value.customerId ? customers.find(c => c.value === value.customerId)?.label : null
  const productLabel = value.productId ? products.find(p => p.value === value.productId)?.label : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {show('customer') && (
          <ComboPicker
            value={value.customerId ?? null}
            options={customers}
            loading={loading}
            onChange={v => set({ customerId: v })}
            placeholder={t('analytics.filters.allCustomers')}
            searchPlaceholder={t('analytics.filters.searchCustomer')}
            icon={Building2}
          />
        )}
        {show('product') && (
          <ComboPicker
            value={value.productId ?? null}
            options={products}
            loading={loading}
            onChange={v => set({ productId: v })}
            placeholder={t('analytics.filters.allProducts')}
            searchPlaceholder={t('analytics.filters.searchProduct')}
            icon={Package}
          />
        )}
        {show('payment') && (
          <div className="relative inline-flex items-center">
            <CreditCard className="absolute left-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={value.paymentMethod ?? ''}
              onChange={e => set({ paymentMethod: e.target.value || null })}
              className={`${selectClass} pl-9`}
            >
              <option value="">{t('analytics.filters.allPayments')}</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{t(`analytics.filters.${m}`)}</option>
              ))}
            </select>
          </div>
        )}
        {show('unit') && (
          <div className="relative inline-flex items-center">
            <Box className="absolute left-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={value.unitType ?? ''}
              onChange={e => set({ unitType: e.target.value || null })}
              className={`${selectClass} pl-9`}
            >
              <option value="">{t('analytics.filters.allUnits')}</option>
              {UNIT_TYPES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        )}
      </div>

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
