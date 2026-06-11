import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, UserPlus, X, Loader2, Search, AlertCircle, Building2, Check } from 'lucide-react'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import {
  fetchCustomersByPriceList,
  assignCustomersToPriceList,
  removeCustomerFromPriceList,
  type PriceListCustomer,
} from '../../services/priceLists'
import { fetchCustomers } from '../../services/customers'
import type { Customer } from '../../types'

interface PriceListCustomersProps {
  priceListId: string
  /** Notifies the parent when the assigned-customer set changes (e.g. to refresh counts). */
  onChanged?: () => void
}

export default function PriceListCustomers({ priceListId, onChanged }: PriceListCustomersProps) {
  const { t } = useTranslation()
  const [customers, setCustomers] = useState<PriceListCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<PriceListCustomer | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setCustomers(await fetchCustomersByPriceList(priceListId))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [priceListId])

  const confirmRemove = async () => {
    if (!removeTarget) return
    try {
      await removeCustomerFromPriceList(removeTarget.id)
      setRemoveTarget(null)
      await load()
      onChanged?.()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('priceLists.customers.title')}
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">({customers.length})</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {t('priceLists.customers.add')}
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
      ) : customers.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('priceLists.customers.none')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {customers.map(c => (
            <li
              key={c.id}
              className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <Link
                to={`/customers/${c.id}`}
                className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-green-700 dark:hover:text-green-400 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {c.company_name}
              </Link>
              {c.billing_city && (
                <span className="text-xs text-slate-400 dark:text-slate-500">· {c.billing_city}</span>
              )}
              <button
                onClick={() => setRemoveTarget(c)}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title={t('priceLists.customers.remove')}
                aria-label={t('priceLists.customers.remove')}
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <AddCustomersModal
          priceListId={priceListId}
          onClose={() => setShowAdd(false)}
          onAdded={() => { void load(); onChanged?.() }}
        />
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title={t('priceLists.customers.remove')}
        message={t('priceLists.customers.confirmRemove', { name: removeTarget?.company_name ?? '' })}
        variant="danger"
        confirmLabel={t('priceLists.customers.remove')}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add-customers modal: search, multi-select, warn when reassigning from another
// list, then bulk-assign to this list.
// ---------------------------------------------------------------------------

interface AddCustomersModalProps {
  priceListId: string
  onClose: () => void
  onAdded: () => void
}

function AddCustomersModal({ priceListId, onClose, onAdded }: AddCustomersModalProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const rows = await fetchCustomers({ search: search.trim() || undefined, limit: 50 })
        if (!active) return
        // Hide customers already on this list — they're nothing to add.
        setResults(rows.filter(c => c.price_list_id !== priceListId))
        setError(null)
      } catch (e) {
        if (active) setError((e as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [search, priceListId])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (selected.size === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await assignCustomersToPriceList(Array.from(selected), priceListId)
      onAdded()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t('priceLists.customers.addTitle')} maxWidth="max-w-2xl">
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('priceLists.customers.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 text-green-600 animate-spin" /></div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">{t('priceLists.customers.noResults')}</div>
        ) : (
          results.map(c => {
            const isSel = selected.has(c.id)
            const otherList = c.price_list && c.price_list.id !== priceListId ? c.price_list.name : null
            return (
              <label
                key={c.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  isSel
                    ? 'border-green-400 dark:border-green-700 bg-green-50/40 dark:bg-green-900/10'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(c.id)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0"
                />
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.company_name}</p>
                  {c.billing_city && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.billing_city}</p>
                  )}
                </div>
                {otherList && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
                    <AlertCircle className="w-3 h-3" />
                    {t('priceLists.customers.willBeMoved', { name: otherList })}
                  </span>
                )}
              </label>
            )
          })
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 sm:flex-none min-w-0 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleAdd}
            disabled={submitting || selected.size === 0}
            className="flex-1 sm:flex-none min-w-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t('priceLists.customers.confirmAdd', { count: selected.size })}
          </button>
        </div>
      </div>
    </Modal>
  )
}
