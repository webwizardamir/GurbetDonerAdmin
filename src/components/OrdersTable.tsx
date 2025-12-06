import { Eye, Edit2, Trash2 } from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  customer: string
  status: 'pending' | 'processing' | 'delivered' | 'cancelled'
  total: number
  date: string
}

const sampleOrders: Order[] = [
  { id: '1', orderNumber: 'ORD-20231206-0001', customer: 'Istanbul Kebab House', status: 'delivered', total: 3405.00, date: '2023-12-01' },
  { id: '2', orderNumber: 'ORD-20231206-0002', customer: 'Ankara Restaurant Group', status: 'pending', total: 2250.00, date: '2023-12-05' },
  { id: '3', orderNumber: 'ORD-20231206-0003', customer: 'Izmir Food Services', status: 'processing', total: 2435.00, date: '2023-12-04' },
  { id: '4', orderNumber: 'ORD-20231206-0004', customer: 'Bursa Meat Market', status: 'delivered', total: 1850.00, date: '2023-12-02' },
  { id: '5', orderNumber: 'ORD-20231206-0005', customer: 'Antalya Grill & BBQ', status: 'processing', total: 3120.00, date: '2023-12-06' },
]

const statusColors = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  processing: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
}

export default function OrdersTable() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Orders</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Order #
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {sampleOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {order.orderNumber}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {order.customer}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    ₺{order.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(order.date).toLocaleDateString('tr-TR')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                    <button
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                    <button
                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
