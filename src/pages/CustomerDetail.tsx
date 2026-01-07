import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useCustomerDetail } from '../hooks/useCustomerDetail'
import CustomerOrderRow from '../components/customers/CustomerOrderRow'
import CustomerForm from '../components/customers/CustomerForm'
import PortalAccessModal from '../components/customers/PortalAccessModal'
import { updateCustomer } from '../services/customers'
import { formatPrice } from '../utils/format'

type TabType = 'orders' | 'details'
type DateRangeKey = 'all' | 'last7' | 'last30' | 'last90' | 'thisYear'

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

  const handleEditSubmit = async (data: any) => {
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('customerDetail.contactInfo')}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {customer.contact_person && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('customers.contactPerson')}</p>
                    <p className="text-slate-900 dark:text-white">{customer.contact_person}</p>
                  </div>
                </div>
              )}
              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('customers.email')}</p>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-green-600 hover:text-green-700"
                    >
                      {customer.email}
                    </a>
                  </div>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('customers.phone')}</p>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-green-600 hover:text-green-700"
                    >
                      {customer.phone}
                    </a>
                  </div>
                </div>
              )}
              {customer.vat_number && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('customers.vatNumber')}</p>
                    <p className="text-slate-900 dark:text-white font-mono">{customer.vat_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing Address */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('customerDetail.billingAddress')}
              </h3>
            </div>
            <div className="p-6">
              {customer.billing_street || customer.billing_city ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div className="space-y-1">
                    {customer.billing_street && (
                      <p className="text-slate-900 dark:text-white">{customer.billing_street}</p>
                    )}
                    {(customer.billing_postal_code || customer.billing_city) && (
                      <p className="text-slate-900 dark:text-white">
                        {[customer.billing_postal_code, customer.billing_city]
                          .filter(Boolean)
                          .join(' ')}
                      </p>
                    )}
                    {customer.billing_country && (
                      <p className="text-slate-500 dark:text-slate-400">{customer.billing_country}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">{t('customerDetail.noAddress')}</p>
              )}
            </div>
          </div>

          {/* Shipping Address (if different) */}
          {!customer.shipping_same_as_billing && (customer.shipping_street || customer.shipping_city) && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {t('customerDetail.shippingAddress')}
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div className="space-y-1">
                    {customer.shipping_street && (
                      <p className="text-slate-900 dark:text-white">{customer.shipping_street}</p>
                    )}
                    {(customer.shipping_postal_code || customer.shipping_city) && (
                      <p className="text-slate-900 dark:text-white">
                        {[customer.shipping_postal_code, customer.shipping_city]
                          .filter(Boolean)
                          .join(' ')}
                      </p>
                    )}
                    {customer.shipping_country && (
                      <p className="text-slate-500 dark:text-slate-400">{customer.shipping_country}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {customer.internal_notes && (
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
      )}
    </div>
  )
}
