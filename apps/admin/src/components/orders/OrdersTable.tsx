// Shared order table — desktop table + mobile cards — extracted from the Orders
// page so the Customer detail page (and any future host) can reuse the exact same
// look and row actions. Every column/action is opt-in via props, so a host shows
// only the subset it needs. Profit is owner-only and its source is pluggable
// (default = gross computeOrderProfit; customer page passes a refund-correct map).

import { useTranslation } from 'react-i18next'
import {
  ShoppingCart, Loader2, Eye, Pencil, Trash2, Calendar, FileText, Mail,
  Check, RotateCcw, StickyNote, ReceiptText,
} from 'lucide-react'
import type { OrderWithItems } from '../../services/orders'
import type { OrderDocumentInfo } from '../../services/documents'
import StatusBadge from '../ui/StatusBadge'
import PaymentBadge from '../ui/PaymentBadge'
import SortableTh from '../ui/SortableTh'
import { formatPrice, formatDateShort, formatPercent, profitClass } from '../../utils/format'
import { computeOrderProfit } from '../../utils/orderProfit'
import { useAuth } from '../../context/AuthContext'

// Statuses whose orders may be (soft-)deleted. Single source of truth.
export const DELETABLE_STATUSES = ['draft', 'pending', 'pending_payment', 'on_hold']
// Statuses whose orders may be trashed. Cancelled orders are also trashable
// (trash keeps their status 'cancelled' — a stock no-op — see trash_order).
export const TRASHABLE_STATUSES = [...DELETABLE_STATUSES, 'cancelled']

interface SendInfo { sent: number; failed: number; total: number; invoiceSent?: boolean }

interface OrdersTableProps {
  orders: OrderWithItems[]
  loading?: boolean
  emptyMessage?: React.ReactNode
  minWidthClass?: string         // table min-width (default min-w-[760px])
  // columns
  showSelection?: boolean
  showCustomerColumn?: boolean   // default true; false when the customer is fixed
  showInvoiceColumn?: boolean    // default true
  // selection
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: () => void
  // sorting (optional)
  sort?: { sortKey: string; sortDir: 'asc' | 'desc'; onToggle: (k: string) => void }
  // data lookups
  getDocInfo?: (id: string) => (OrderDocumentInfo & { count: number }) | { count: number } | undefined
  getSendInfo?: (id: string) => SendInfo | undefined
  getProfit?: (order: OrderWithItems) => { profit: number; margin: number; totalCost: number } | null
  // actions (each opt-in)
  onView?: (order: OrderWithItems) => void
  onEdit?: (order: OrderWithItems) => void   // parent branches notes-vs-editor; icon picked here
  onDelete?: (order: OrderWithItems) => void
  onQuickComplete?: (id: string) => void
  deletingId?: string | null
  // trash mode
  trashed?: boolean
  onRestore?: (order: OrderWithItems) => void
  onPurge?: (order: OrderWithItems) => void
  // capability flags
  canEdit?: boolean
  canDelete?: boolean
}

export default function OrdersTable({
  orders,
  loading = false,
  emptyMessage,
  minWidthClass = 'min-w-[760px]',
  showSelection = false,
  showCustomerColumn = true,
  showInvoiceColumn = true,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sort,
  getDocInfo,
  getSendInfo,
  getProfit,
  onView,
  onEdit,
  onDelete,
  onQuickComplete,
  deletingId,
  trashed = false,
  onRestore,
  onPurge,
  canEdit = false,
  canDelete = false,
}: OrdersTableProps) {
  const { t } = useTranslation()
  const { isOwner } = useAuth()

  const resolveProfit = (order: OrderWithItems) =>
    getProfit ? getProfit(order) : computeOrderProfit(order)

  const Th = ({ k, children, align }: { k: string; children: React.ReactNode; align?: 'right' }) =>
    sort
      ? <SortableTh sortKey={k} current={sort.sortKey} dir={sort.sortDir} onToggle={sort.onToggle} align={align}>{children}</SortableTh>
      : <th className={`px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>

  const empty = emptyMessage ?? (trashed ? t('orders.trash.empty') : t('orders.noOrders'))

  // Owner-only profit line (shared by desktop + mobile).
  const profitLine = (order: OrderWithItems, mobile = false) => {
    if (!isOwner) return null
    const op = resolveProfit(order)
    if (!op || op.totalCost <= 0 || op.profit == null) return null
    return (
      <span className={`${mobile ? '' : 'block'} text-[11px] font-medium tabular-nums ${profitClass(op.profit)}`}>
        {formatPrice(op.profit)} · {formatPercent(op.margin)}
      </span>
    )
  }

  // Shared action set (desktop icon buttons).
  const actions = (order: OrderWithItems) => {
    const docInfo = getDocInfo?.(order.id) || { count: 0 }
    const canComplete = ['draft', 'pending_payment', 'on_hold'].includes(order.status)
    const notesOnly = ['cancelled', 'refunded'].includes(order.status)
    if (trashed) {
      return (
        <div className="flex items-center justify-end gap-1">
          {onRestore && (
            <button onClick={() => onRestore(order)} disabled={deletingId === order.id} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.trash.restore')}>
              {deletingId === order.id ? <Loader2 className="w-4 h-4 text-green-600 animate-spin" /> : <RotateCcw className="w-4 h-4 text-green-600" />}
            </button>
          )}
          {onView && (
            <button onClick={() => onView(order)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.view')}>
              <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          )}
          {onPurge && (
            <button onClick={() => onPurge(order)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.trash.purge')} aria-label={t('orders.trash.purge')}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      )
    }
    const sendI = getSendInfo?.(order.id)
    return (
      <div className="flex items-center justify-end gap-1">
        {docInfo.count > 1 && (
          <div className="relative p-2" title={`${docInfo.count} documents generated`}>
            <FileText className="w-4 h-4 text-violet-500" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{docInfo.count}</span>
          </div>
        )}
        {sendI && sendI.total > 0 && (() => {
          const allOk = sendI.failed === 0
          return (
            <div className="relative p-2" title={`${sendI.sent}/${sendI.total} ${allOk ? 'sent' : `sent (${sendI.failed} failed)`}`}>
              <Mail className={`w-4 h-4 ${allOk ? 'text-emerald-500' : 'text-red-500'}`} />
              {sendI.total > 1 && (
                <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 ${allOk ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>{sendI.total}</span>
              )}
            </div>
          )
        })()}
        {sendI?.invoiceSent && (
          <div className="p-2" title={t('orders.invoiceSent')}>
            <ReceiptText className="w-4 h-4 text-emerald-600" />
          </div>
        )}
        {onQuickComplete && canComplete && (
          <button onClick={() => onQuickComplete(order.id)} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.markComplete')}>
            <Check className="w-4 h-4 text-green-600" />
          </button>
        )}
        {onEdit && canEdit && (
          <button onClick={() => onEdit(order)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer" title={notesOnly ? t('orders.notes.editNotes') : t('common.edit')}>
            {notesOnly ? <StickyNote className="w-4 h-4 text-blue-500" /> : <Pencil className="w-4 h-4 text-blue-500" />}
          </button>
        )}
        {onView && (
          <button onClick={() => onView(order)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.view')}>
            <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        )}
        {onDelete && canDelete && TRASHABLE_STATUSES.includes(order.status) && (
          <button onClick={() => onDelete(order)} disabled={deletingId === order.id} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer" title={t('orders.actions.delete')}>
            {deletingId === order.id ? <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
          </button>
        )}
      </div>
    )
  }

  const invoiceOf = (order: OrderWithItems) => {
    const di = getDocInfo?.(order.id) as (OrderDocumentInfo & { count: number }) | undefined
    return di?.invoiceNumber || (order.woo_invoice_number ? String(order.woo_invoice_number) : null)
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${minWidthClass}`}>
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  {showSelection && (
                    <th className="pl-4 pr-2 py-3 w-10">
                      <input type="checkbox" checked={!!selectedIds && selectedIds.size === orders.length && orders.length > 0} onChange={onToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                    </th>
                  )}
                  <Th k="order_number">{showCustomerColumn ? t('orders.orderColumn') : t('orders.orderColumn')}</Th>
                  <Th k="order_date">{t('common.date')}</Th>
                  <Th k="status">{t('common.status')}</Th>
                  {showInvoiceColumn && <Th k="invoice">{t('orders.invoice')}</Th>}
                  <Th k="total" align="right">{t('common.total')}</Th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {orders.map(order => {
                  const invoice = invoiceOf(order)
                  return (
                    <tr key={order.id} onClick={() => onView?.(order)} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${onView ? 'cursor-pointer' : ''} ${selectedIds?.has(order.id) ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                      {showSelection && (
                        <td className="pl-4 pr-2 py-4" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={!!selectedIds?.has(order.id)} onChange={() => onToggleSelect?.(order.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500" />
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{showCustomerColumn ? (order.customer?.company_name || '-') : `#${order.order_number}`}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{showCustomerColumn ? `#${order.order_number} · ` : ''}{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Calendar className="w-4 h-4" />{formatDateShort(order.order_date)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={trashed ? (order.pre_trash_status || order.status) : order.status} />
                          <PaymentBadge method={order.payment_method} />
                          {(order.refund_amount ?? 0) > 0 && (order.refund_amount ?? 0) < order.total && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 whitespace-nowrap" title={t('orders.refund.partiallyRefunded')}>
                              <RotateCcw className="w-3 h-3" />{t('orders.refund.partiallyRefunded')}
                            </span>
                          )}
                        </div>
                      </td>
                      {showInvoiceColumn && (
                        <td className="px-4 py-4">
                          {!invoice ? <span className="text-sm text-slate-400 dark:text-slate-500">-</span> : (
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-violet-500" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{invoice}</span>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(order.total)}</span>
                        {profitLine(order)}
                      </td>
                      <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>{actions(order)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{empty}</p>
          </div>
        ) : (
          orders.map(order => {
            const invoice = invoiceOf(order)
            const canComplete = ['draft', 'pending_payment', 'on_hold'].includes(order.status)
            const notesOnly = ['cancelled', 'refunded'].includes(order.status)
            return (
              <div key={order.id} onClick={() => onView?.(order)} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${onView ? 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50' : ''} ${selectedIds?.has(order.id) ? 'ring-2 ring-green-500' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  {showSelection && (
                    <input type="checkbox" checked={!!selectedIds?.has(order.id)} onChange={() => onToggleSelect?.(order.id)} onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{showCustomerColumn ? (order.customer?.company_name || '-') : `#${order.order_number}`}</p>
                      {invoice && <span className="text-xs text-violet-600 dark:text-violet-400 font-medium shrink-0">{invoice}</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{showCustomerColumn ? `#${order.order_number} · ` : ''}{formatDateShort(order.order_date)} · {order.items?.length || 0} items</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-green-600 dark:text-green-400">{formatPrice(order.total)}</p>
                    {profitLine(order, true) && <div>{profitLine(order, true)}</div>}
                    <StatusBadge status={trashed ? (order.pre_trash_status || order.status) : order.status} />
                    {(order.refund_amount ?? 0) > 0 && (order.refund_amount ?? 0) < order.total && (
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 whitespace-nowrap">
                        <RotateCcw className="w-3 h-3" />{t('orders.refund.partiallyRefunded')}
                      </span>
                    )}
                  </div>
                </div>
                {order.payment_method && (
                  <div className="mb-3 pl-7"><PaymentBadge method={order.payment_method} /></div>
                )}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 flex-wrap" onClick={e => e.stopPropagation()}>
                  {trashed ? (
                    <>
                      {onRestore && (
                        <button onClick={() => onRestore(order)} disabled={deletingId === order.id} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium whitespace-nowrap">
                          {deletingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}{t('orders.trash.restore')}
                        </button>
                      )}
                      {onPurge && (
                        <button onClick={() => onPurge(order)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                      )}
                    </>
                  ) : (
                    <>
                      {onQuickComplete && canComplete && (
                        <button onClick={() => onQuickComplete(order.id)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium whitespace-nowrap">
                          <Check className="w-4 h-4 flex-shrink-0" />{t('orders.actions.complete')}
                        </button>
                      )}
                      {onEdit && canEdit && (
                        <button onClick={() => onEdit(order)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium whitespace-nowrap">
                          {notesOnly ? <><StickyNote className="w-4 h-4 flex-shrink-0" />{t('orders.notes.editNotes')}</> : <><Pencil className="w-4 h-4 flex-shrink-0" />{t('common.edit')}</>}
                        </button>
                      )}
                      {onView && (
                        <button onClick={() => onView(order)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium whitespace-nowrap">
                          <Eye className="w-4 h-4 flex-shrink-0" />{t('orders.actions.view')}
                        </button>
                      )}
                      {onDelete && canDelete && TRASHABLE_STATUSES.includes(order.status) && (
                        <button onClick={() => onDelete(order)} disabled={deletingId === order.id} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                          {deletingId === order.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
