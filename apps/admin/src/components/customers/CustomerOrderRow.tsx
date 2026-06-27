import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Receipt,
  FileCheck,
  Package,
  CreditCard,
  AlertCircle,
  Check,
  Banknote,
  Building2,
} from 'lucide-react'
import type { DocumentType, PaymentMethod } from '../../types'
import type { CustomerOrder } from '../../hooks/useCustomerDetail'
import DocumentGenerator from '../documents/DocumentGenerator'
import { formatPrice, formatDate, formatPercent, profitClass } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

interface CustomerOrderRowProps {
  order: CustomerOrder
  hasDocument: (orderId: string, docType: DocumentType) => boolean
  onDocumentGenerated: () => void
}

// Document type configuration
const DOCUMENT_TYPES: Array<{
  type: DocumentType
  label: string
  icon: typeof FileText
  color: string
  bgColor: string
  onlyFor?: string[]
}> = [
  {
    type: 'invoice',
    label: 'Factuur',
    icon: Receipt,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40',
  },
  {
    type: 'proforma',
    label: 'Proforma',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40',
  },
  {
    type: 'order_confirmation',
    label: 'Bevestiging',
    icon: FileCheck,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40',
  },
  {
    type: 'packing_slip',
    label: 'Pakbon',
    icon: Package,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600',
  },
  {
    type: 'credit_note',
    label: 'Credit',
    icon: CreditCard,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40',
    onlyFor: ['cancelled', 'refunded'],
  },
  {
    type: 'payment_reminder',
    label: 'Herinnering',
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40',
  },
]

// Status badge configuration
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Concept',
    className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  },
  pending_payment: {
    label: 'In afwachting',
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  },
  completed: {
    label: 'Voltooid',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  },
  delivered: {
    label: 'Bezorgd',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  cancelled: {
    label: 'Geannuleerd',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
  refunded: {
    label: 'Terugbetaald',
    className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  },
}

function PaymentBadge({ method }: { method?: PaymentMethod }) {
  if (!method || method === 'none') return null

  const config = {
    cash: {
      label: 'Cash',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      icon: Banknote,
    },
    bank: {
      label: 'Bank',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      icon: Building2,
    },
  }

  const { label, className, icon: Icon } = config[method]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

export default function CustomerOrderRow({
  order,
  hasDocument,
  onDocumentGenerated,
}: CustomerOrderRowProps) {
  const { isOwner } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null)

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft

  // Filter document types based on order status. The Credit Nota is also
  // available whenever the order has a refund — partial refunds keep the
  // order's status as-is (e.g. 'completed'), so a status check alone misses them.
  const availableDocTypes = DOCUMENT_TYPES.filter(dt => {
    if (!dt.onlyFor) return true
    if (dt.type === 'credit_note' && (order.refund_amount ?? 0) > 0) return true
    return dt.onlyFor.includes(order.status)
  })

  // Count existing documents
  const existingDocsCount = availableDocTypes.filter(dt =>
    hasDocument(order.id, dt.type)
  ).length

  return (
    <>
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Header Row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer"
        >
          {/* Expand Icon */}
          <div className="text-slate-400">
            {expanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-white">
                {order.order_number}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
              <PaymentBadge method={order.payment_method} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDate(order.order_date)} - {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          {/* Documents indicator */}
          {existingDocsCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <FileCheck className="w-4 h-4" />
              <span>{existingDocsCount}</span>
            </div>
          )}

          {/* Total */}
          <div className="text-right">
            <p className="font-semibold text-slate-900 dark:text-white">
              {formatPrice(order.total)}
            </p>
            {isOwner && order.profit != null && (
              <p className={`hidden sm:block text-[11px] font-medium tabular-nums ${profitClass(order.profit)}`}>
                {formatPrice(order.profit)}
                {order.margin != null && <> · {formatPercent(order.margin)}</>}
              </p>
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
            {/* Owner-only per-order profit */}
            {isOwner && order.profit != null && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-white dark:bg-slate-800 px-3 py-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Winst</span>
                <span className={`text-sm font-semibold tabular-nums ${profitClass(order.profit)}`}>
                  {formatPrice(order.profit)}
                  {order.margin != null && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">{formatPercent(order.margin)}</span>
                  )}
                </span>
              </div>
            )}
            {/* Document Buttons */}
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Documenten
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {availableDocTypes.map(docType => {
                  const exists = hasDocument(order.id, docType.type)
                  const Icon = docType.icon

                  return (
                    <button
                      key={docType.type}
                      onClick={() => setSelectedDocType(docType.type)}
                      className={`relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all cursor-pointer ${docType.bgColor}`}
                    >
                      <Icon className={`w-5 h-5 ${docType.color}`} />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {docType.label}
                      </span>
                      {exists && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Order Items Summary */}
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Artikelen
              </p>
              <div className="space-y-1">
                {order.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm bg-white dark:bg-slate-800 rounded-lg px-3 py-2"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {item.product_name}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 dark:text-slate-400">
                        {item.quantity} {item.unit_type === 'kg' ? 'kg' : 'x'}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {formatPrice(item.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document Generator Modal */}
      {selectedDocType && (
        <DocumentGenerator
          orderId={order.id}
          orderNumber={order.order_number}
          documentType={selectedDocType}
          onClose={() => setSelectedDocType(null)}
          onGenerated={() => {
            setSelectedDocType(null)
            onDocumentGenerated()
          }}
        />
      )}
    </>
  )
}
