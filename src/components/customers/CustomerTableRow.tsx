// Desktop table row for a single customer in the customer list.
// Displays company info, contact, location, VAT, and action menu.

import { useTranslation } from 'react-i18next'
import { Building2, Phone, Mail, MapPin, Globe, Tags } from 'lucide-react'
import type { Customer } from '../../types'
import CustomerActionMenu from './CustomerActionMenu'

interface CustomerTableRowProps {
  customer: Customer
  hasPortalAccess: boolean
  isMenuOpen: boolean
  canEdit: boolean
  canDelete: boolean
  deleting: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onView: () => void
  onPricing: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function CustomerTableRow({
  customer,
  hasPortalAccess,
  isMenuOpen,
  canEdit,
  canDelete,
  deleting,
  onMenuToggle,
  onMenuClose,
  onView,
  onPricing,
  onEdit,
  onDelete,
}: CustomerTableRowProps) {
  const { t } = useTranslation()

  return (
    <tr
      onClick={onView}
      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {customer.company_name}
              </p>
              {hasPortalAccess && (
                <span title={t('portal.access.enabled')} className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </span>
              )}
            </div>
            {customer.contact_person && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {customer.contact_person}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Mail className="w-4 h-4 text-slate-400" />
              <a href={`mailto:${customer.email}`} className="hover:text-green-600 truncate max-w-[200px]">
                {customer.email}
              </a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Phone className="w-4 h-4 text-slate-400" />
              <a href={`tel:${customer.phone}`} className="hover:text-green-600">
                {customer.phone}
              </a>
            </div>
          )}
          {!customer.email && !customer.phone && (
            <span className="text-sm text-slate-400">-</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {(customer.billing_city || customer.billing_country) ? (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>
              {[customer.billing_city, customer.billing_country].filter(Boolean).join(', ')}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {customer.vat_number ? (
          <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
            {customer.vat_number}
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center">
        {customer.price_list ? (
          <span
            title={customer.price_list.name}
            aria-label={`${t('customers.priceList')}: ${customer.price_list.name}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
          >
            <Tags className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
        <CustomerActionMenu
          customer={customer}
          isOpen={isMenuOpen}
          onToggle={onMenuToggle}
          onClose={onMenuClose}
          canEdit={canEdit}
          canDelete={canDelete}
          deleting={deleting}
          onView={onView}
          onPricing={onPricing}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </td>
    </tr>
  )
}
