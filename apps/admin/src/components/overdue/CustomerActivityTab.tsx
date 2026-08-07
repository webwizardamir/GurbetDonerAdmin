import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Search, Loader2, UserX, Clock, SlidersHorizontal, EyeOff, FileText,
  MoreVertical, RefreshCw, CalendarClock,
} from 'lucide-react'
import { useCustomerActivity } from '../../hooks/useCustomerActivity'
import { fetchInactivityDigests, ruleLabel } from '../../services/customerActivity'
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from '../../constants/customerType'
import CustomerTypeBadge from '../ui/CustomerTypeBadge'
import DropdownMenu from '../ui/DropdownMenu'
import Modal from '../ui/Modal'
import SortableTh from '../ui/SortableTh'
import { useTableSort } from '../../hooks/useTableSort'
import type { CustomerActivityRow, CustomerInactivityDigest } from '../../types'
import { formatDate } from '../../utils/format'

// ---------------------------------------------------------------------------
// Klantactiviteit — who stopped ordering, and which rule says so.
//
// This is the screen that answers "who is covered by what", which is why it
// lists EVERY active customer (p_only_due = false) rather than just today's
// digest: a rule you cannot see is a rule you cannot trust. The same RPC feeds
// the morning email with p_only_due = true, so the badge here and the mail can
// never disagree.
// ---------------------------------------------------------------------------

type ScopeFilter = 'due' | 'custom' | 'all'

export default function CustomerActivityTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { rows, stats, loading, error, refresh, saveRule } = useCustomerActivity()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('due')
  const [editing, setEditing] = useState<CustomerActivityRow | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [digests, setDigests] = useState<CustomerInactivityDigest[] | null>(null)

  type SortKey = 'name' | 'days' | 'last'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<SortKey>('days', 'desc')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = rows.filter(r => {
      if (scope === 'due' && !r.is_due) return false
      if (scope === 'custom' && r.rule_source !== 'customer' && r.threshold_days != null) return false
      if (typeFilter && (r.customer_type ?? '') !== typeFilter) return false
      if (q && !r.company_name.toLowerCase().includes(q) && !(r.city ?? '').toLowerCase().includes(q)) return false
      return true
    })
    return sortBy(base, {
      name: r => r.company_name,
      days: r => r.days_since,
      last: r => r.last_order_date ?? '',
    })
  }, [rows, search, typeFilter, scope, sortBy])

  const loadDigests = async () => {
    try { setDigests(await fetchInactivityDigests(20)) }
    catch { setDigests([]) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Stat tiles. "Wordt gemeld" is the number that will actually be in
          tomorrow's email, so it leads. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={<UserX className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          label={t('customerActivity.stats.reported')} value={stats.dueCount} tone="amber" />
        <StatTile icon={<Clock className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
          label={t('customerActivity.stats.longest')}
          value={stats.longestQuiet ? t('customerActivity.daysValue', { count: stats.longestQuiet }) : '0'} />
        <StatTile icon={<SlidersHorizontal className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
          label={t('customerActivity.stats.customRule')} value={stats.customRuleCount} />
        <StatTile icon={<EyeOff className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
          label={t('customerActivity.stats.unmonitored')} value={stats.unmonitoredCount} />
      </div>

      {/* Never-ordered customers are excluded from the mail by default, and that
          is surprising enough to say out loud on the screen that explains it. */}
      {stats.neverOrderedCount > 0 && (
        <div className="flex items-start gap-2 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('customerActivity.neverOrderedNote', { count: stats.neverOrderedCount })}
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('customerActivity.searchPlaceholder')}
            className="w-full pl-9 pr-3 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base md:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
        >
          <option value="">{t('orders.allTypes')}</option>
          {CUSTOMER_TYPES.map(ct => <option key={ct} value={ct}>{CUSTOMER_TYPE_LABELS[ct]}</option>)}
        </select>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {(['due', 'custom', 'all'] as ScopeFilter[]).map((s, i) => (
            <button key={s} onClick={() => setScope(s)}
              className={`px-3 h-11 text-sm font-medium transition-colors ${
                scope === s ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              } ${i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}>
              {t(`customerActivity.scope.${s}`)}
            </button>
          ))}
        </div>
        <button onClick={refresh}
          className="h-11 px-3 inline-flex items-center gap-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => { if (digests === null) loadDigests(); else setDigests(null) }}
          className="h-11 px-3 inline-flex items-center gap-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
          <CalendarClock className="w-4 h-4" />
          <span className="hidden sm:inline">{t('customerActivity.history')}</span>
        </button>
      </div>

      {/* Sent-digest history */}
      {digests !== null && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('customerActivity.historyTitle')}</p>
          </div>
          {digests.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('customerActivity.historyEmpty')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {digests.map(d => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white tabular-nums">{formatDate(d.run_date)}</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {t('customerActivity.historyCount', { count: d.customer_count })}
                  </span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    d.status === 'sent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : d.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {t(`customerActivity.sendStatus.${d.status}`)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">{d.recipients.join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <SortableTh sortKey="name" current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-4">{t('customerActivity.col.customer')}</SortableTh>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('customerActivity.col.type')}</th>
              <SortableTh sortKey="last" current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-4">{t('customerActivity.col.lastOrder')}</SortableTh>
              <SortableTh sortKey="days" current={sortKey} dir={sortDir} onToggle={toggleSort} className="px-4" align="right">{t('customerActivity.col.days')}</SortableTh>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('customerActivity.col.rule')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('customerActivity.col.status')}</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map(r => (
              <tr key={r.customer_id}
                onClick={() => navigate(`/customers/${r.customer_id}`)}
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-white">{r.company_name}</p>
                  {r.city && <p className="text-xs text-slate-500 dark:text-slate-400">{r.city}</p>}
                </td>
                <td className="px-4 py-3"><CustomerTypeBadge type={r.customer_type} /></td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                  {r.last_order_date ? formatDate(r.last_order_date) : t('customerActivity.never')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={`text-sm font-semibold ${r.is_due ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {r.days_since}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{ruleLabel(r)}</td>
                <td className="px-4 py-3"><StatusPill row={r} /></td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <RowMenu row={r} open={menuFor === r.customer_id}
                    onOpen={() => setMenuFor(menuFor === r.customer_id ? null : r.customer_id)}
                    onClose={() => setMenuFor(null)}
                    onEdit={() => { setEditing(r); setMenuFor(null) }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">{t('customerActivity.empty')}</p>
        )}
      </div>

      {/* Mobile / iPad-portrait cards */}
      <div className="lg:hidden space-y-2">
        {filtered.map(r => (
          <div key={r.customer_id}
            onClick={() => navigate(`/customers/${r.customer_id}`)}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">{r.company_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <CustomerTypeBadge type={r.customer_type} />
                  <StatusPill row={r} />
                </div>
              </div>
              <div className="shrink-0" onClick={e => e.stopPropagation()}>
                <RowMenu row={r} open={menuFor === r.customer_id}
                  onOpen={() => setMenuFor(menuFor === r.customer_id ? null : r.customer_id)}
                  onClose={() => setMenuFor(null)}
                  onEdit={() => { setEditing(r); setMenuFor(null) }} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('customerActivity.col.lastOrder')}</p>
                <p className="text-slate-900 dark:text-white tabular-nums">
                  {r.last_order_date ? formatDate(r.last_order_date) : t('customerActivity.never')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('customerActivity.col.days')}</p>
                <p className={`font-semibold tabular-nums ${r.is_due ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  {r.days_since}
                </p>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ruleLabel(r)}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{t('customerActivity.empty')}</p>
        )}
      </div>

      {editing && (
        <RuleModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async rule => { await saveRule(editing.customer_id, rule); setEditing(null) }}
        />
      )}
    </div>
  )
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: 'amber' }) {
  return (
    <div className={`rounded-2xl border p-4 ${
      tone === 'amber'
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ row }: { row: CustomerActivityRow }) {
  const { t } = useTranslation()
  const [key, cls] =
    row.threshold_days == null ? ['off', 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300']
    : row.is_due ? ['due', 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400']
    : ['ok', 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400']
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${cls}`}>{t(`customerActivity.status.${key}`)}</span>
}

function RowMenu({ row, open, onOpen, onClose, onEdit }: {
  row: CustomerActivityRow
  open: boolean
  onOpen: () => void
  onClose: () => void
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const btnRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={btnRef}
        onClick={onOpen}
        aria-label={t('customerActivity.rowMenu', { name: row.company_name })}
        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <DropdownMenu isOpen={open} onClose={onClose} anchorRef={btnRef} align="right" width={200}>
        <button onClick={onEdit}
          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
          {t('customerActivity.editRule')}
        </button>
      </DropdownMenu>
    </>
  )
}

/**
 * The three choices the owner actually has for one customer. Presented as
 * choices rather than as two raw columns, because "inactivity_enabled = null"
 * is not a thing anyone should have to reason about.
 */
function RuleModal({ row, onClose, onSave }: {
  row: CustomerActivityRow
  onClose: () => void
  onSave: (rule: { mode: 'inherit' | 'custom' | 'off'; days?: number | null }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'inherit' | 'custom' | 'off'>(
    row.rule_source === 'customer' ? 'custom' : row.threshold_days == null ? 'off' : 'inherit',
  )
  const [days, setDays] = useState(row.threshold_days ?? 30)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try { await onSave({ mode, days: mode === 'custom' ? days : null }) }
    finally { setSaving(false) }
  }

  const options: { id: 'inherit' | 'custom' | 'off'; label: string; hint: string }[] = [
    { id: 'inherit', label: t('customerActivity.rule.inherit'), hint: t('customerActivity.rule.inheritHint') },
    { id: 'custom', label: t('customerActivity.rule.custom'), hint: t('customerActivity.rule.customHint') },
    { id: 'off', label: t('customerActivity.rule.off'), hint: t('customerActivity.rule.offHint') },
  ]

  return (
    <Modal isOpen onClose={onClose} title={row.company_name} maxWidth="max-w-md">
      <div className="px-6 py-4 space-y-3">
        {options.map(o => (
          <label key={o.id}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              mode === o.id
                ? 'border-green-500 bg-green-50/60 dark:bg-green-900/10'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
            }`}>
            <input type="radio" name="rule" checked={mode === o.id} onChange={() => setMode(o.id)}
              className="mt-1 text-green-600 focus:ring-green-500" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900 dark:text-white">{o.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{o.hint}</span>
            </span>
          </label>
        ))}

        {mode === 'custom' && (
          <div className="flex items-center gap-2 pl-3">
            <input type="number" min={1} max={3650} value={days}
              onChange={e => setDays(Math.max(1, Math.min(3650, +e.target.value)))}
              className="w-28 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('customerActivity.daysLabel')}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <button onClick={onClose}
          className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">
          {t('common.cancel')}
        </button>
        <button onClick={submit} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('common.save')}
        </button>
      </div>
    </Modal>
  )
}
