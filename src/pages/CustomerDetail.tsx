import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Building2,
  Loader2,
  AlertCircle,
  Euro,
  ShoppingCart,
  TrendingUp,
  Package,
  Banknote,
  Phone,
  Mail,
  MapPin,
  FileText,
  User,
  Search,
  Calendar,
  Globe,
  Pencil,
  Tags,
} from 'lucide-react'
import { useCustomerDetail } from '../hooks/useCustomerDetail'
import CustomerOrderRow from '../components/customers/CustomerOrderRow'
import CustomerForm from '../components/customers/CustomerForm'
import CustomerProductsTab from '../components/customers/CustomerProductsTab'
import PortalAccessModal from '../components/customers/PortalAccessModal'
import { updateCustomer, type CustomerFormData } from '../services/customers'
import { formatPrice } from '../utils/format'
import { isReverseChargeCountry } from '../utils/vat'
import type { Customer } from '../types'

type TabType = 'orders' | 'products' | 'details'
type DateRangeKey = 'all' | 'last7' | 'last30' | 'last90' | 'thisYear'

// Renders one label + value row. Empty values fall back to "—" so the field is
// visibly present rather than silently missing — that's the bug this view used
// to have. `link`, when given, renders the value as an anchor (mailto:/tel:).
function DetailRow({
  icon,
  label,
  value,
  link,
  internalLink,
  mono,
  badge,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
  link?: string
  internalLink?: boolean
  mono?: boolean
  badge?: React.ReactNode
}) {
  const hasValue = !!value && value.trim() !== ''
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          {label}
          {badge}
        </p>
        {hasValue ? (
          link ? (
            internalLink ? (
              <Link to={link} className={`text-green-600 hover:text-green-700 break-words ${mono ? 'font-mono' : ''}`}>
                {value}
              </Link>
            ) : (
              <a href={link} className={`text-green-600 hover:text-green-700 break-words ${mono ? 'font-mono' : ''}`}>
                {value}
              </a>
            )
          ) : (
            <p className={`text-slate-900 dark:text-white break-words ${mono ? 'font-mono' : ''}`}>{value}</p>
          )
        ) : (
          <p className="text-slate-400 dark:text-slate-500">—</p>
        )}
      </div>
    </div>
  )
}

function CustomerDetailsTab({ customer }: { customer: Customer }) {
  const { t } = useTranslation()
  const billingCountryLabel = customer.billing_country
    ? t(`customers.countries.${customer.billing_country}`, customer.billing_country)
    : ''
  const shippingCountryLabel = customer.shipping_country
    ? t(`customers.countries.${customer.shipping_country}`, customer.shipping_country)
    : ''
  const isForeign = isReverseChargeCountry(customer.billing_country)
  const verlegdBadge = isForeign ? (
    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
      {t('orders.vat.reverseChargeSuffix')}
    </span>
  ) : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Information */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t('customerDetail.contactInfo')}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <DetailRow
            icon={<User className="w-5 h-5" />}
            label={t('customers.contactPerson')}
            value={customer.contact_person}
          />
          <DetailRow
            icon={<Mail className="w-5 h-5" />}
            label={t('customers.email')}
            value={customer.email}
            link={customer.email ? `mailto:${customer.email}` : undefined}
          />
          <DetailRow
            icon={<Phone className="w-5 h-5" />}
            label={t('customers.phone')}
            value={customer.phone}
            link={customer.phone ? `tel:${customer.phone}` : undefined}
          />
          <DetailRow
            icon={<FileText className="w-5 h-5" />}
            label={t('customers.vatNumber')}
            value={customer.vat_number}
            mono
            badge={verlegdBadge}
          />
          <DetailRow
            icon={<Tags className="w-5 h-5" />}
            label={t('customers.priceList')}
            value={customer.price_list?.name}
            link={customer.price_list ? `/price-lists/${customer.price_list.id}` : undefined}
            internalLink
          />
        </div>
      </div>

      {/* Billing Address */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t('customerDetail.billingAddress')}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <DetailRow
            icon={<MapPin className="w-5 h-5" />}
            label={t('customers.street')}
            value={customer.billing_street}
          />
          <DetailRow
            icon={<MapPin className="w-5 h-5" />}
            label={t('customers.postalCode')}
            value={customer.billing_postal_code}
          />
          <DetailRow
            icon={<MapPin className="w-5 h-5" />}
            label={t('customers.city')}
            value={customer.billing_city}
          />
          <DetailRow
            icon={<Globe className="w-5 h-5" />}
            label={t('customers.country')}
            value={billingCountryLabel}
          />
        </div>
      </div>

      {/* Shipping Address — only when different from billing */}
      {!customer.shipping_same_as_billing && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t('customerDetail.shippingAddress')}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <DetailRow
              icon={<Package className="w-5 h-5" />}
              label={t('customers.street')}
              value={customer.shipping_street}
            />
            <DetailRow
              icon={<Package className="w-5 h-5" />}
              label={t('customers.postalCode')}
              value={customer.shipping_postal_code}
            />
            <DetailRow
              icon={<Package className="w-5 h-5" />}
              label={t('customers.city')}
              value={customer.shipping_city}
            />
            <DetailRow
              icon={<Globe className="w-5 h-5" />}
              label={t('customers.country')}
              value={shippingCountryLabel}
            />
          </div>
        </div>
      )}

      {/* Internal Notes — only when present */}
      {customer.internal_notes && customer.internal_notes.trim() !== '' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t('customerDetail.internalNotes')}
            </h3>
          </div>
          <div className="p-6">
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {customer.internal_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CustomerDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { loading, error, customer, orders, stats, refresh, hasDocument } = useCustomerDetail(id)

  const DATE_RANGES: Record<DateRangeKey, { labelKey: string; days: number | null }> = {
    all: { labelKey: 'customerDetail.dateRanges.all', days: null },
    last7: { labelKey: 'customerDetail.dateRanges.last7', days: 7 },
    last30: { labelKey: 'customerDetail.dateRanges.last30', days: 30 },
    last90: { labelKey: 'customerDetail.dateRanges.last90', days: 90 },
    thisYear: { labelKey: 'customerDetail.dateRanges.thisYear', days: 365 },
  }
  const [activeTab, setActiveTab] = useState<TabType>('orders')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRangeKey>('all')
  const [showPortalModal, setShowPortalModal] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  const handleEditSubmit = async (data: CustomerFormData) => {
    if (!customer) return
    await updateCustomer(customer.id, data)
    setShowEditForm(false)
    refresh()
  }

  // Filter orders based on search and date range
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          order.order_number.toLowerCase().includes(query) ||
          order.items.some(item => item.product_name.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // Date range filter
      if (dateRange !== 'all') {
        const range = DATE_RANGES[dateRange]
        if (range.days) {
          const orderDate = new Date(order.order_date)
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - range.days)
          if (orderDate < cutoffDate) return false
        }
      }

      return true
    })
  }, [orders, searchQuery, dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-slate-600 dark:text-slate-400">
          {error || t('customerDetail.notFound')}
        </p>
        <button
          onClick={() => navigate('/customers')}
          className="text-green-600 hover:text-green-700 font-medium"
        >
          {t('customerDetail.backToCustomers')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {customer.company_name}
              </h1>
              {customer.contact_person && (
                <p className="text-slate-500 dark:text-slate-400">
                  {customer.contact_person}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Edit Button */}
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.edit')}</span>
          </button>
          {/* Portal Access Button */}
          <button
            onClick={() => setShowPortalModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{t('portal.access.title')}</span>
          </button>
        </div>
      </div>

      {/* Portal Access Modal */}
      {showPortalModal && customer && (
        <PortalAccessModal
          customer={customer}
          onClose={() => setShowPortalModal(false)}
          onUpdate={refresh}
        />
      )}

      {/* Edit Customer Modal */}
      {showEditForm && customer && (
        <CustomerForm
          customer={customer}
          onSubmit={handleEditSubmit}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Euro className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('customers.totalRevenue')}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatPrice(stats.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('customers.totalOrders')}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {stats.totalOrders}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('customers.avgOrderValue')}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatPrice(stats.avgOrderValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('customerDetail.items')}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {stats.totalItems}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      {(stats.paymentBreakdown.cash > 0 || stats.paymentBreakdown.bank > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.paymentModal.cashTitle')}</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {formatPrice(stats.paymentBreakdown.cash)}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.paymentModal.bankTitle')}</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {formatPrice(stats.paymentBreakdown.bank)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-green-600 text-green-600 dark:text-green-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('nav.orders')} ({orders.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-green-600 text-green-600 dark:text-green-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('customerDetail.products.tab')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-green-600 text-green-600 dark:text-green-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('customerDetail.details')}
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' ? (
        <div className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('customerDetail.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Date Range Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
              >
                {Object.entries(DATE_RANGES).map(([key, { labelKey }]) => (
                  <option key={key} value={key}>{t(labelKey)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  {t('customerDetail.noOrdersYet')}
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  {t('customerDetail.noOrdersMatch')}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('customerDetail.showingOrders', { showing: filteredOrders.length, total: orders.length })}
                </p>
                {filteredOrders.map(order => (
                  <CustomerOrderRow
                    key={order.id}
                    order={order}
                    hasDocument={hasDocument}
                    onDocumentGenerated={refresh}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      ) : activeTab === 'products' ? (
        <CustomerProductsTab customerId={customer.id} customerName={customer.company_name} />
      ) : (
        <CustomerDetailsTab customer={customer} />
      )}
    </div>
  )
}
