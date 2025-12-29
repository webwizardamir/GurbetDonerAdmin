import { useLocation } from 'react-router-dom'
import { Search, Sun, Moon, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'

// Page metadata mapping
const PAGE_META: Record<string, { title: string; description?: string }> = {
  '/': { title: 'Dashboard', description: 'Overview of your business' },
  '/orders': { title: 'Orders', description: 'Manage customer orders' },
  '/customers': { title: 'Customers', description: 'Manage your customer base' },
  '/products': { title: 'Products', description: 'Product catalog and inventory' },
  '/invoices': { title: 'Invoices', description: 'Billing and invoices' },
  '/analytics': { title: 'Analytics', description: 'Business insights and reports' },
  '/settings/users': { title: 'User Management', description: 'Manage staff accounts' },
  '/settings/audit-log': { title: 'Audit Log', description: 'System activity history' },
}

export default function Header() {
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      return saved === 'true'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const pageMeta = PAGE_META[location.pathname] || { title: 'MelekHalalFood' }
  const { title, description } = pageMeta

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('darkMode', String(newMode))

    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <header className="fixed top-0 right-0 left-64 h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
      <div className="h-full px-6 flex items-center justify-between gap-6">
        {/* Left: Page Title & Description */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white whitespace-nowrap">
              {title}
            </h1>
            {description && (
              <>
                <span className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-slate-600" />
                <span className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 truncate">
                  {description}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Search, Theme Toggle, Notifications */}
        <div className="flex items-center gap-3">
          {/* Global Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="
                w-64 lg:w-80 pl-10 pr-4 py-2 rounded-xl text-sm
                bg-slate-50 dark:bg-slate-800
                border border-slate-200 dark:border-slate-700
                text-slate-900 dark:text-white
                placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-green-500
                transition-all
              "
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="
              p-2 rounded-xl
              bg-slate-50 dark:bg-slate-800
              border border-slate-200 dark:border-slate-700
              text-slate-600 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-slate-700
              transition-colors
            "
            title="Toggle theme"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <button
            className="
              relative p-2 rounded-xl
              bg-slate-50 dark:bg-slate-800
              border border-slate-200 dark:border-slate-700
              text-slate-600 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-slate-700
              transition-colors
            "
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  )
}
