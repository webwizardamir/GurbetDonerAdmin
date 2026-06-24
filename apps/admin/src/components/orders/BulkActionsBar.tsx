// Bulk actions bar for the Orders page.
// Shows selected count and provides bulk complete, cancel, and delete actions.

import { useTranslation } from 'react-i18next'
import { Loader2, CheckCircle, X, Trash2 } from 'lucide-react'

interface BulkActionsBarProps {
  selectedCount: number
  completableCount: number
  deletableCount: number
  bulkProcessing: boolean
  canDelete: boolean
  onClear: () => void
  onBulkComplete: () => void
  onBulkCancel: () => void
  onBulkDelete: () => void
}

export default function BulkActionsBar({
  selectedCount,
  completableCount,
  deletableCount,
  bulkProcessing,
  canDelete,
  onClear,
  onBulkComplete,
  onBulkCancel,
  onBulkDelete,
}: BulkActionsBarProps) {
  const { t } = useTranslation()

  if (selectedCount === 0) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-green-800 dark:text-green-300 whitespace-nowrap">
          {selectedCount} {t('orders.selected')}
        </span>
        <button
          onClick={onClear}
          className="text-sm text-green-600 dark:text-green-400 hover:underline whitespace-nowrap"
        >
          {t('orders.clear')}
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {completableCount > 0 && (
          <button
            onClick={onBulkComplete}
            disabled={bulkProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {bulkProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {t('orders.actions.complete')} ({completableCount})
          </button>
        )}
        <button
          onClick={onBulkCancel}
          disabled={bulkProcessing || completableCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <X className="w-4 h-4" />
          {t('orders.actions.cancel')}
        </button>
        {canDelete && deletableCount > 0 && (
          <button
            onClick={onBulkDelete}
            disabled={bulkProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {bulkProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {t('orders.actions.delete')} ({deletableCount})
          </button>
        )}
      </div>
    </div>
  )
}
