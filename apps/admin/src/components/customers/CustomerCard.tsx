// Mobile card view for a single customer in the customer list.
// Displays company info, contact details, and an action menu.

import { useTranslation } from 'react-i18next'
import { Building2, Phone, Mail, MapPin, Globe } from 'lucide-react'
import type { Customer } from '../../types'
import CustomerActionMenu from './CustomerActionMenu'
import CustomerTypeBadge from '../ui/CustomerTypeBadge'

interface CustomerCardProps {
  customer: Customer
  canEdit: boolean
  canDelete: boolean
  deleting: boolean
  archived?: boolean
  isMenuOpen: boolean
  hasPortalAccess: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onEdit: () => void
  onDelete: () => void
  onPricing: () => void
  onView: () => void
  onRestore?: () => void
  onPurge?: () => void
  /** Show the selection checkbox. Off unless the page has row selection. */
  showSelection?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

export default function CustomerCard({
  customer,
  canEdit,
  canDelete,
  deleting,
  archived,
  isMenuOpen,
  hasPortalAccess,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
  onPricing,
  onView,
  onRestore,
  onPurge,
  showSelection,
  selected,
  onToggleSelect,
}: CustomerCardProps) {
  const { t } = useTranslation()
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50 ${selected ? 'ring-2 ring-green-500' : ''}`}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {showSelection && (
            /* stopPropagation: the card's onClick navigates to the detail page. */
            <label
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center justify-center w-11 h-11 -m-2 shrink-0 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!selected}
                onChange={() => onToggleSelect?.()}
                aria-label={t('common.selectRow', { name: customer.company_name })}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
              />
            </label>
          )}
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {customer.company_name}
              </h3>
              {hasPortalAccess && (
                <span title={t('portal.access.enabled')} className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
                  <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </span>
              )}
              {archived && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide shrink-0">
                  {t('customers.archivedBadge')}
                </span>
              )}
            </div>
            {customer.contact_person && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {customer.contact_person}
              </p>
            )}
            {customer.customer_type && (
              <div className="mt-1"><CustomerTypeBadge type={customer.customer_type} /></div>
            )}
          </div>
        </div>

        {/* Action Menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <CustomerActionMenu
            customer={customer}
            isOpen={isMenuOpen}
            onToggle={onMenuToggle}
            onClose={onMenuClose}
            canEdit={canEdit}
            canDelete={canDelete}
            deleting={deleting}
            archived={archived}
            onView={onView}
            onPricing={onPricing}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestore={onRestore}
            onPurge={onPurge}
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1.5 text-sm">
        {customer.email && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}
        {(customer.billing_city || customer.billing_country) && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">
              {[customer.billing_city, customer.billing_country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* VAT Number */}
      {customer.vat_number && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            VAT: <span className="font-mono text-slate-700 dark:text-slate-300">{customer.vat_number}</span>
          </p>
        </div>
      )}
    </div>
  )
}
