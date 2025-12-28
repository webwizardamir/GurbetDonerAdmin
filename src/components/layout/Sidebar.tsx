import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  History,
  Warehouse,
} from 'lucide-react'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  ownerOnly?: boolean
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ShoppingCart, label: 'Orders', href: '/orders' },
  { icon: Users, label: 'Customers', href: '/customers' },
  { icon: Package, label: 'Products', href: '/products' },
  { icon: Warehouse, label: 'Inventory', href: '/inventory' },
  { icon: FileText, label: 'Invoices', href: '/invoices' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics', ownerOnly: true },
  { icon: History, label: 'Audit Log', href: '/audit-log', ownerOnly: true },
  { icon: Settings, label: 'Settings', href: '/settings', ownerOnly: true },
]

export default function Sidebar() {
  const { profile, signOut, isOwner } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter((item) => {
    if (item.ownerOnly && !isOwner) return false
    return true
  })

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-20">
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-center px-6 border-b border-slate-200 dark:border-slate-800">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <span className="text-xl font-bold text-white">M</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white">MelekHalalFood</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">B2B Portal</p>
          </div>
        </NavLink>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${isActive
                      ? 'bg-green-50 dark:bg-green-600/10 text-green-700 dark:text-green-400 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-green-600 before:rounded-r'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.ownerOnly && (
                    <span className="ml-auto text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                      Owner
                    </span>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
            {profile?.full_name ? getInitials(profile.full_name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {profile?.role === 'owner' ? 'Owner' : profile?.role === 'shop_manager' ? 'Shop Manager' : profile?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </aside>
  )
}
