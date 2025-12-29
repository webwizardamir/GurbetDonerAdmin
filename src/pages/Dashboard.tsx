import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock
} from 'lucide-react'
import StatCard from '../components/StatCard'
import OrdersTable from '../components/OrdersTable'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value="1,234"
          trend={{ value: 12.5, isPositive: true }}
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label="Total Revenue"
          value="€125,450"
          trend={{ value: 8.2, isPositive: true }}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          label="Total Customers"
          value="432"
          trend={{ value: 5.1, isPositive: true }}
          icon={Users}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          label="Pending Orders"
          value="23"
          trend={{ value: 3.4, isPositive: false }}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Recent Orders Table */}
      <OrdersTable />

      {/* Additional Dashboard Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Products */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Low Stock Alert
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Halal Beef Tenderloin</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Only 15 kg remaining</p>
              </div>
              <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-full">
                Low Stock
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Halal Lamb Chops</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Only 22 kg remaining</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full">
                Low Stock
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Halal Turkey Breast</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Only 18 kg remaining</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full">
                Low Stock
              </span>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Recent Payments
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Istanbul Kebab House</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Bank Transfer - Dec 1, 2023</p>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">
                €3,405.00
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Bursa Meat Market</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Cash - Dec 2, 2023</p>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">
                €1,850.00
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">Antalya Grill & BBQ</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Bank Transfer - Dec 3, 2023</p>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">
                €2,890.00
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
