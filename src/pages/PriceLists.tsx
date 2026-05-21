import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, Tags, Pencil, Trash2, Loader2, AlertCircle, CheckCircle2, X,
} from 'lucide-react'
import {
  fetchPriceLists,
  fetchPriceListItemCounts,
  fetchPriceListCustomerCounts,
  createPriceList,
  updatePriceList,
  deletePriceList,
} from '../services/priceLists'
import type { PriceList } from '../types'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import SortableTh from '../components/ui/SortableTh'
import { useTableSort } from '../hooks/useTableSort'

export default function PriceLists() {
  const { t } = useTranslation()
  const [lists, setLists] = useState<PriceList[]>([])
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})
  const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<PriceList | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PriceList | null>(null)

  // Phase 6: sortable columns. Default = name asc.
  type PLSortKey = 'name' | 'description' | 'items' | 'customers' | 'active'
  const { sortKey, sortDir, toggleSort, sortBy } = useTableSort<PLSortKey>('name', 'asc')
  const sortedLists = useMemo(() => sortBy(lists, {
    name:        l => l.name,
    description: l => l.description ?? '',
    items:       l => itemCounts[l.id] ?? 0,
    customers:   l => customerCounts[l.id] ?? 0,
    active:      l => l.is_active ? 1 : 0,
  }), [lists, itemCounts, customerCounts, sortBy])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [l, ic, cc] = await Promise.all([
        fetchPriceLists(),
        fetchPriceListItemCounts(),
        fetchPriceListCustomerCounts(),
      ])
      setLists(l)
      setItemCounts(ic)
      setCustomerCounts(cc)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const handleEdit = (list: PriceList) => {
    setEditing(list)
    setShowForm(true)
  }

  const handleDelete = (list: PriceList) => setDeleteTarget(list)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePriceList(deleteTarget.id)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleToggleActive = async (list: PriceList) => {
    try {
      await updatePriceList(list.id, { is_active: !list.is_active })
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const deleteMessage = deleteTarget
    ? (((customerCounts[deleteTarget.id] ?? 0) > 0)
        ? t('priceLists.confirmDeleteWithUsage', { items: itemCounts[deleteTarget.id] ?? 0, customers: customerCounts[deleteTarget.id] ?? 0 })
        : t('priceLists.confirmDelete', { items: itemCounts[deleteTarget.id] ?? 0 }))
    : ''

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('priceLists.intro')}
        </p>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{t('priceLists.create')}</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Tags className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">{t('priceLists.empty')}</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('priceLists.create')}
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <SortableTh sortKey="name"        current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('priceLists.columns.name')}</SortableTh>
                <SortableTh sortKey="description" current={sortKey} dir={sortDir} onToggle={toggleSort}>{t('priceLists.columns.description')}</SortableTh>
                <SortableTh sortKey="items"       current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('priceLists.columns.items')}</SortableTh>
                <SortableTh sortKey="customers"   current={sortKey} dir={sortDir} onToggle={toggleSort} align="right">{t('priceLists.columns.customers')}</SortableTh>
                <SortableTh sortKey="active"      current={sortKey} dir={sortDir} onToggle={toggleSort} align="center">{t('priceLists.columns.active')}</SortableTh>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('priceLists.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedLists.map(list => (
                <tr key={list.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3">
                    <Link
                      to={`/price-lists/${list.id}`}
                      className="font-medium text-slate-900 dark:text-white hover:text-green-700 dark:hover:text-green-400"
                    >
                      {list.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {list.description || <span className="text-slate-400 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                    {itemCounts[list.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                    {customerCounts[list.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(list)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        list.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                      title={list.is_active ? t('priceLists.deactivate') : t('priceLists.activate')}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {list.is_active ? t('priceLists.active') : t('priceLists.inactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(list)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title={t('common.edit')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(list)}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <PriceListForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); void load() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('priceLists.delete')}
        message={deleteMessage}
        variant="danger"
        confirmLabel={t('common.delete')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function PriceListForm({
  initial, onClose, onSaved,
}: {
  initial: PriceList | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = useMemo(() => name.trim().length > 0, [name])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      if (initial) {
        await updatePriceList(initial.id, { name, description, is_active: isActive })
      } else {
        await createPriceList({ name, description, is_active: isActive })
      }
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {initial ? t('priceLists.edit') : t('priceLists.create')}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('priceLists.columns.name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('priceLists.namePlaceholder')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('priceLists.columns.description')}
            </label>
            <textarea
              value={description ?? ''}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder={t('priceLists.descriptionPlaceholder')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            {t('priceLists.active')}
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
