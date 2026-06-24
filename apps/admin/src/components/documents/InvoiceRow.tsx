// Single document row for the Invoices page.
// Renders both a desktop table row and a mobile card view for a document.

import {
  FileText,
  Download,
  Trash2,
  Calendar,
  Building2,
  Hash,
  Loader2,
} from 'lucide-react'
import type { Document, DocumentType } from '../../types'
import { formatDateTime } from '../../utils/format'

// Color mappings for document type icons
const DOC_ICON_COLORS: Record<DocumentType, { bg: string; text: string }> = {
  invoice: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
  proforma: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  credit_note: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
  order_confirmation: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' },
  payment_reminder: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  packing_slip: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300' },
}

const TYPE_BADGE_CLASSES: Record<DocumentType, string> = {
  invoice: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  proforma: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  credit_note: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  packing_slip: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  order_confirmation: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  payment_reminder: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
}

export interface InvoiceRowData {
  customerName: string
  orderNumber: string
  orderId: string
}

interface TypeBadgeProps {
  type: DocumentType
  onClick?: () => void
  t: (key: string) => string
}

function TypeBadge({ type, onClick, t }: TypeBadgeProps) {
  const className = TYPE_BADGE_CLASSES[type]
  return (
    <span
      className={`px-2.5 py-1 text-xs font-medium rounded-full ${className} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      {t(`documents.types.${type}`)}
    </span>
  )
}

interface InvoiceTableRowProps {
  doc: Document
  data: InvoiceRowData
  isSelected: boolean
  deleting: boolean
  canDelete: boolean
  t: (key: string) => string
  onToggleSelect: () => void
  onDownload: () => void
  onDelete: () => void
  onTypeFilter: () => void
  onNavigateOrder: () => void
}

export function InvoiceTableRow({
  doc,
  data,
  isSelected,
  deleting,
  canDelete,
  t,
  onToggleSelect,
  onDownload,
  onDelete,
  onTypeFilter,
  onNavigateOrder,
}: InvoiceTableRowProps) {
  const iconColors = DOC_ICON_COLORS[doc.document_type]

  return (
    <tr
      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
        isSelected ? 'bg-green-50/50 dark:bg-green-900/10' : ''
      }`}
    >
      <td className="pl-4 pr-2 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
        />
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconColors.bg} flex items-center justify-center shrink-0`}>
            <FileText className={`w-5 h-5 ${iconColors.text}`} />
          </div>
          <p className="font-semibold font-mono text-slate-900 dark:text-white">
            {doc.document_number}
          </p>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        {data.customerName ? (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-300">{data.customerName}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        {data.orderNumber ? (
          <button
            onClick={onNavigateOrder}
            className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 hover:underline font-mono"
          >
            <Hash className="w-3.5 h-3.5" />
            {data.orderNumber}
          </button>
        ) : (
          <span className="text-sm text-slate-400">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <TypeBadge type={doc.document_type} onClick={onTypeFilter} t={t} />
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="text-sm">{formatDateTime(doc.generated_at)}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onDownload}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
            title={t('common.download')}
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title={t('common.delete')}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-red-500" />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

interface InvoiceMobileCardProps {
  doc: Document
  data: InvoiceRowData
  isSelected: boolean
  deleting: boolean
  canDelete: boolean
  t: (key: string) => string
  onToggleSelect: () => void
  onDownload: () => void
  onDelete: () => void
  onTypeFilter: () => void
  onNavigateOrder: () => void
}

export function InvoiceMobileCard({
  doc,
  data,
  isSelected,
  deleting,
  canDelete,
  t,
  onToggleSelect,
  onDownload,
  onDelete,
  onTypeFilter,
  onNavigateOrder,
}: InvoiceMobileCardProps) {
  const iconColors = DOC_ICON_COLORS[doc.document_type]

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${
        isSelected ? 'ring-2 ring-green-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0 mt-1"
          />
          <div className={`w-10 h-10 rounded-xl ${iconColors.bg} flex items-center justify-center shrink-0`}>
            <FileText className={`w-5 h-5 ${iconColors.text}`} />
          </div>
          <div>
            <p className="font-semibold font-mono text-slate-900 dark:text-white">
              {doc.document_number}
            </p>
            <TypeBadge type={doc.document_type} onClick={onTypeFilter} t={t} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDownload}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
            title={t('common.download')}
          >
            <Download className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title={t('common.delete')}
            >
              {deleting ? (
                <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5 text-red-500" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Customer & Order info */}
      <div className="space-y-1.5 mb-3">
        {data.customerName && (
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            {data.customerName}
          </div>
        )}
        {data.orderNumber && (
          <button
            onClick={onNavigateOrder}
            className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 hover:underline font-mono"
          >
            <Hash className="w-3.5 h-3.5" />
            {data.orderNumber}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Calendar className="w-4 h-4" />
        {formatDateTime(doc.generated_at)}
      </div>
    </div>
  )
}
