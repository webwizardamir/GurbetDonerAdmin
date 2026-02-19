import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  RefreshCw,
  Loader2,
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  Warehouse,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDateRange } from '../hooks/useDateRange'
import DateRangePicker from '../components/analytics/DateRangePicker'
import OverviewTab from '../components/analytics/tabs/OverviewTab'

const ProductsTab = lazy(() => import('../components/analytics/tabs/ProductsTab'))
const CustomersTab = lazy(() => import('../components/analytics/tabs/CustomersTab'))
const OrdersTab = lazy(() => import('../components/analytics/tabs/OrdersTab'))
const FinancialTab = lazy(() => import('../components/analytics/tabs/FinancialTab'))
const InventoryTab = lazy(() => import('../components/analytics/tabs/InventoryTab'))

type TabKey = 'overview' | 'products' | 'customers' | 'orders' | 'financial' | 'inventory'

const TABS: { key: TabKey; icon: typeof LayoutDashboard; labelKey: string }[] = [
  { key: 'overview', icon: LayoutDashboard, labelKey: 'analytics.tabs.overview' },
  { key: 'products', icon: Package, labelKey: 'analytics.tabs.products' },
  { key: 'customers', icon: Users, labelKey: 'analytics.tabs.customers' },
  { key: 'orders', icon: ShoppingCart, labelKey: 'analytics.tabs.orders' },
  { key: 'financial', icon: DollarSign, labelKey: 'analytics.tabs.financial' },
  { key: 'inventory', icon: Warehouse, labelKey: 'analytics.tabs.inventory' },
]

export default function Analytics() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isOwner, loading: authLoading } = useAuth()
  const { dateRange, dateRangeKey, setDateRange, dateRanges } = useDateRange()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  // Redirect non-owners
  useEffect(() => {
    if (!authLoading && !isOwner) {
      navigate('/')
    }
  }, [isOwner, authLoading, navigate])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!isOwner) {
    return null
  }

  const showDatePicker = activeTab !== 'inventory'

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        {/* Tab Bar */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            )
          })}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {showDatePicker && (
            <DateRangePicker
              currentKey={dateRangeKey}
              currentLabel={dateRange.label}
              dateRanges={dateRanges}
              onSelect={setDateRange}
            />
          )}
        </div>
      </div>

      {/* Tab Content */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        }
      >
        {activeTab === 'overview' && <OverviewTab key={refreshKey} dateRange={dateRange} />}
        {activeTab === 'products' && <ProductsTab key={refreshKey} dateRange={dateRange} />}
        {activeTab === 'customers' && <CustomersTab key={refreshKey} dateRange={dateRange} />}
        {activeTab === 'orders' && <OrdersTab key={refreshKey} dateRange={dateRange} />}
        {activeTab === 'financial' && <FinancialTab key={refreshKey} dateRange={dateRange} />}
        {activeTab === 'inventory' && <InventoryTab key={refreshKey} dateRange={dateRange} />}
      </Suspense>
    </div>
  )
}
