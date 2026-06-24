import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories'
import Modal from '../ui/Modal'
import { usePermission } from '../../hooks/usePermission'
import type { Category } from '../../types'

interface CategoryManagerProps {
  onClose: () => void
}

export default function CategoryManager({ onClose }: CategoryManagerProps) {
  const { t } = useTranslation()
  const { categories, loading, error, create, update, remove } = useCategories()
  const { canCreate, canEdit, canDelete } = usePermission('products')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    try {
      setSaving(true)
      await create({ name: newName.trim() })
      setNewName('')
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return

    try {
      setSaving(true)
      await update(id, { name: editName.trim() })
      setEditingId(null)
      setEditName('')
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    // TODO: Replace with custom ConfirmDialog component
    if (!confirm(t('categories.confirmDelete'))) return

    try {
      await remove(id)
    } catch (err) {
      // Error is handled by the hook
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Tag className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('products.manageCategories')}
          </h2>
        </div>
      }
    >
        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Add new category */}
          {canCreate && (
            <form onSubmit={handleCreate} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t('products.newCategoryPlaceholder')}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={!newName.trim() || saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t('common.add')}
              </button>
            </form>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Categories list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {t('products.noCategories')}
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  {editingId === category.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleUpdate(category.id)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                      />
                      <button
                        onClick={() => handleUpdate(category.id)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                      >
                        {t('common.save')}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-lg"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {category.name}
                        </span>
                        {!category.is_active && (
                          <span className="ml-2 text-xs text-slate-500">(inactive)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t('common.done')}
          </button>
        </div>
    </Modal>
  )
}
