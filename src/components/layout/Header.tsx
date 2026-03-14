import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Sun, Moon, Bell, Menu } from 'lucide-react'
import { useReminders } from '../../hooks/useReminders'
import LanguageSelector from '../LanguageSelector'
import SearchBar from './SearchBar'
import NotificationPanel from './NotificationPanel'

// Page metadata mapping - using translation keys
const PAGE_META: Record<string, { titleKey: string; descKey?: string }> = {
  '/': { titleKey: 'nav.dashboard', descKey: 'dashboard.welcome' },
  '/orders': { titleKey: 'nav.orders', descKey: 'orders.title' },
  '/customers': { titleKey: 'nav.customers', descKey: 'customers.title' },
  '/products': { titleKey: 'nav.products', descKey: 'products.title' },
  '/sold-products': { titleKey: 'nav.soldProducts', descKey: 'soldProducts.subtitle' },
  '/invoices': { titleKey: 'nav.invoices', descKey: 'documents.title' },
  '/analytics': { titleKey: 'nav.analytics', descKey: 'analytics.title' },
  '/settings/documents': { titleKey: 'settings.documents.title' },
  '/settings/users': { titleKey: 'settings.users.title' },
  '/settings/audit-log': { titleKey: 'settings.auditLog.title' },
}

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation()
  const location = useLocation()

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Mobile search state
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  // Reminders
  const { reminders, dueReminders, unreadCount, create, update, markRead, dismiss, remove } = useReminders()

  const pageMeta = PAGE_META[location.pathname] || { titleKey: 'common.name' }
  const title = t(pageMeta.titleKey)
  const description = pageMeta.descKey ? t(pageMeta.descKey) : undefined

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Hamburger + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white whitespace-nowrap">{title}</h1>
            {description && (
              <>
                <span className="hidden md:block w-px h-4 bg-slate-300 dark:bg-slate-600" />
                <span className="hidden md:block text-sm text-slate-500 dark:text-slate-400 truncate">{description}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Search, Theme Toggle, Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Toggle */}
          <button onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Search className="w-5 h-5" />
          </button>

          {/* Global Search */}
          <SearchBar showMobileSearch={showMobileSearch} onCloseMobileSearch={() => setShowMobileSearch(false)} />

          {/* Theme Toggle */}
          <button onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Toggle theme">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Notifications">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationPanel
                reminders={reminders}
                dueReminders={dueReminders}
                onCreate={create}
                onUpdate={update}
                onMarkRead={markRead}
                onDismiss={dismiss}
                onRemove={remove}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
