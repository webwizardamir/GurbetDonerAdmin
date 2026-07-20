// Action menu dropdown for customer rows (desktop table and mobile cards).
// Provides view, pricing, edit, and delete actions.

import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MoreVertical,
  Eye,
  Euro,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { Customer } from '../../types'
import DropdownMenu from '../ui/DropdownMenu'

interface CustomerActionMenuProps {
  customer: Customer
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  canEdit: boolean
  canDelete: boolean
  deleting: boolean
  // When true the customer is archived → show Restore + Permanent delete
  // instead of the Archive action.
  archived?: boolean
  onView: () => void
  onPricing: () => void
  onEdit: () => void
  onDelete: () => void
  onRestore?: () => void
  onPurge?: () => void
}

export default function CustomerActionMenu({
  isOpen,
  onToggle,
  onClose,
  canEdit,
  canDelete,
  deleting,
  archived,
  onView,
  onPricing,
  onEdit,
  onDelete,
  onRestore,
  onPurge,
}: CustomerActionMenuProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-slate-500 dark:text-slate-400" />
      </button>
      <DropdownMenu isOpen={isOpen} onClose={onClose} anchorRef={triggerRef} align="right">
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
            {canDelete && !archived && (
              <>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  {t('customers.archive')}
                </button>
              </>
            )}
            {canDelete && archived && (
              <>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRestore?.(); onClose(); }}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  {t('customers.restore')}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onPurge?.(); onClose(); }}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {t('customers.permanentDelete')}
                </button>
              </>
            )}
      </DropdownMenu>
    </div>
  )
}
