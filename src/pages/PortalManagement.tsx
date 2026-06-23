// Owner-only admin page to manage customer portal access across all customers.
// Lists every customer with portal status / email / last login, with search,
// status filter, and per-row actions (enable, manage, delete) reusing the
// existing PortalAccessModal lifecycle. Lives at /settings/portal.

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Search, Loader2, Settings2, Trash2, Users as UsersIcon } from 'lucide-react'
import {
  getCustomersWithPortalStatus,
  deletePortalAccount,
  type CustomerAccount,
} from '../services/portalAuth'
import type { Customer } from '../types'
import PortalAccessModal from '../components/customers/PortalAccessModal'
import ConfirmDialog from '../components/ui/ConfirmDialog'

type Row = Customer & { portal_account?: CustomerAccount }
type StatusFilter = 'all' | 'active' | 'disabled' | 'none'

export default function PortalManagement() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getCustomersWithPortalStatus()
      setRows(data as Row[])
    } catch (err) {
      console.error('Failed to load portal accounts:', err)
      setError(t('settings.portal.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const statusOf = (r: Row): StatusFilter =>
    !r.portal_account ? 'none' : r.portal_account.is_active ? 'active' : 'disabled'

  const counts = useMemo(() => {
    let active = 0, disabled = 0, none = 0
    for (const r of rows) {
      const s = statusOf(r)
      if (s === 'active') active++
      else if (s === 'disabled') disabled++
      else none++
    }
    return { total: rows.length, active, disabled, none }
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && statusOf(r) !== statusFilter) return false
      if (!q) return true
      const email = (r.portal_account?.email || r.email || '').toLowerCase()
      return (
        r.company_name?.toLowerCase().includes(q) ||
        (r.contact_person || '').toLowerCase().includes(q) ||
        email.includes(q)
      )
    })
  }, [rows, search, statusFilter])

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return t('settings.portal.never')
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePortalAccount(deleteTarget.id)
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      console.error('Failed to delete portal account:', err)
      setError(t('settings.portal.deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  const StatusBadge = ({ r }: { r: Row }) => {
    const s = statusOf(r)
    const map = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      disabled: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
      none: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400',
    } as const
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg ${map[s as 'active' | 'disabled' | 'none']}`}>
        {t(`settings.portal.status.${s}`)}
      </span>
    )
  }

  const portalEmail = (r: Row) => r.portal_account?.email || r.email || '—'
  const lastLogin = (r: Row) => r.portal_account ? formatDate(r.portal_account.last_login_at) : '—'

  const SummaryCard = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent}`}>{value}</p>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  const selectClass = "px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label={t('settings.portal.summary.total')} value={counts.total} accent="text-slate-900 dark:text-white" />
        <SummaryCard label={t('settings.portal.summary.active')} value={counts.active} accent="text-green-600 dark:text-green-400" />
        <SummaryCard label={t('settings.portal.summary.disabled')} value={counts.disabled} accent="text-slate-600 dark:text-slate-300" />
        <SummaryCard label={t('settings.portal.summary.none')} value={counts.none} accent="text-amber-600 dark:text-amber-400" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('settings.portal.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={selectClass}>
          <option value="all">{t('settings.portal.filter.all')}</option>
          <option value="active">{t('settings.portal.status.active')}</option>
          <option value="disabled">{t('settings.portal.status.disabled')}</option>
          <option value="none">{t('settings.portal.status.none')}</option>
        </select>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={loadData} className="ml-2 underline">{t('common.tryAgain')}</button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('settings.portal.col.company')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('settings.portal.col.portalEmail')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('settings.portal.col.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('settings.portal.col.lastLogin')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p>{rows.length === 0 ? t('settings.portal.empty') : t('settings.portal.noMatch')}</p>
                    {rows.length > 0 && (
                      <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="mt-2 text-sm text-green-600 dark:text-green-400 underline">
                        {t('settings.portal.clearFilters')}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className={statusOf(r) === 'disabled' ? 'bg-slate-50 dark:bg-slate-900/40' : ''}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{r.company_name}</div>
                      {r.contact_person && <div className="text-xs text-slate-500 dark:text-slate-400">{r.contact_person}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 break-all">{portalEmail(r)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge r={r} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{lastLogin(r)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelected(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors">
                          {r.portal_account ? <Settings2 className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                          {r.portal_account ? t('settings.portal.manage') : t('portal.access.enable')}
                        </button>
                        {r.portal_account && (
                          <button onClick={() => setDeleteTarget(r)}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('settings.portal.deleteAccount')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
            <UsersIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{rows.length === 0 ? t('settings.portal.empty') : t('settings.portal.noMatch')}</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.company_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{portalEmail(r)}</p>
                </div>
                <StatusBadge r={r} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t('settings.portal.col.lastLogin')}: {lastLogin(r)}</p>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => setSelected(r)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  {r.portal_account ? <Settings2 className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  {r.portal_account ? t('settings.portal.manage') : t('portal.access.enable')}
                </button>
                {r.portal_account && (
                  <button onClick={() => setDeleteTarget(r)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <PortalAccessModal
          customer={selected}
          onClose={() => setSelected(null)}
          onUpdate={loadData}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title={t('settings.portal.deleteAccount')}
        message={deleting ? t('common.saving') : t('settings.portal.deleteConfirm', { name: deleteTarget?.company_name || '' })}
        confirmLabel={t('settings.portal.deleteAccount')}
        onConfirm={handleDelete}
        onCancel={() => { if (!deleting) setDeleteTarget(null) }}
      />
    </div>
  )
}
