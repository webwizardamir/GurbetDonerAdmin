import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Sun,
  Moon,
  Bell,
  ShoppingCart,
  Users,
  Package,
  X,
  Loader2,
  Plus,
  Clock,
  Trash2,
  Check,
  Edit2,
  RefreshCw,
  Menu,
} from 'lucide-react'
import { globalSearch, type SearchResult } from '../../services/search'
import { useReminders } from '../../hooks/useReminders'
import type { Reminder } from '../../services/reminders'
import LanguageSelector from '../LanguageSelector'

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

// Icon mapping for search results
const TYPE_ICONS = {
  order: ShoppingCart,
  customer: Users,
  product: Package,
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const absDiff = Math.abs(diff)

  if (absDiff < 60000) return diff < 0 ? 'Just now' : 'In less than a minute'
  if (absDiff < 3600000) {
    const mins = Math.round(absDiff / 60000)
    return diff < 0 ? `${mins}m ago` : `In ${mins}m`
  }
  if (absDiff < 86400000) {
    const hours = Math.round(absDiff / 3600000)
    return diff < 0 ? `${hours}h ago` : `In ${hours}h`
  }
  const days = Math.round(absDiff / 86400000)
  return diff < 0 ? `${days}d ago` : `In ${days}d`
}

// Format datetime for input
function formatDateTimeForInput(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr)
  const date = d.toISOString().split('T')[0]
  const time = d.toTimeString().slice(0, 5)
  return { date, time }
}

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [reminderForm, setReminderForm] = useState({ title: '', notes: '', date: '', time: '' })
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

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setSearchLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await globalSearch(searchQuery)
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
        setShowAddReminder(false)
        setEditingReminder(null)
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

  const handleSearchSelect = (result: SearchResult) => {
    setSearchQuery('')
    setShowSearchResults(false)
    navigate(result.url)
  }

  const resetForm = () => {
    setReminderForm({ title: '', notes: '', date: '', time: '' })
    setShowAddReminder(false)
    setEditingReminder(null)
  }

  const handleAddReminder = async () => {
    if (!reminderForm.title || !reminderForm.date || !reminderForm.time) return

    try {
      const remindAt = new Date(`${reminderForm.date}T${reminderForm.time}`).toISOString()
      await create({
        title: reminderForm.title,
        notes: reminderForm.notes || undefined,
        remind_at: remindAt,
      })
      resetForm()
    } catch (err) {
      console.error('Failed to create reminder:', err)
    }
  }

  const handleEditReminder = (reminder: Reminder) => {
    const { date, time } = formatDateTimeForInput(reminder.remind_at)
    setReminderForm({
      title: reminder.title,
      notes: reminder.notes || '',
      date,
      time,
    })
    setEditingReminder(reminder)
    setShowAddReminder(false)
  }

  const handleUpdateReminder = async () => {
    if (!editingReminder || !reminderForm.title || !reminderForm.date || !reminderForm.time) return

    try {
      const remindAt = new Date(`${reminderForm.date}T${reminderForm.time}`).toISOString()
      await update(editingReminder.id, {
        title: reminderForm.title,
        notes: reminderForm.notes || undefined,
        remind_at: remindAt,
      })
      resetForm()
    } catch (err) {
      console.error('Failed to update reminder:', err)
    }
  }

  const handleReactivate = async (reminder: Reminder) => {
    // Reactivate by setting a new time (5 minutes from now by default)
    const newTime = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    try {
      await update(reminder.id, { remind_at: newTime })
    } catch (err) {
      console.error('Failed to reactivate reminder:', err)
    }
  }

  // Separate active and dismissed reminders
  const activeReminders = reminders.filter(r => !r.is_dismissed)
  const dismissedReminders = reminders.filter(r => r.is_dismissed)
  const upcomingReminders = activeReminders.filter(r => !dueReminders.find(d => d.id === r.id))

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Hamburger + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white whitespace-nowrap">
              {title}
            </h1>
            {description && (
              <>
                <span className="hidden md:block w-px h-4 bg-slate-300 dark:bg-slate-600" />
                <span className="hidden md:block text-sm text-slate-500 dark:text-slate-400 truncate">
                  {description}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Search, Theme Toggle, Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Global Search (Desktop) */}
          <div ref={searchRef} className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              placeholder="Search orders, customers, products..."
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
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto z-50">
                {searchResults.map((result) => {
                  const Icon = TYPE_ICONS[result.type]
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSearchSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-600">
                        <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 capitalize">{result.type}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 text-center z-50">
                <p className="text-sm text-slate-500 dark:text-slate-400">No results found</p>
              </div>
            )}
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
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
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
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t('reminders.title')}</h3>
                  <button
                    onClick={() => {
                      setShowAddReminder(!showAddReminder)
                      setEditingReminder(null)
                      setReminderForm({ title: '', notes: '', date: '', time: '' })
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Add Reminder"
                  >
                    <Plus className="w-5 h-5 text-green-600" />
                  </button>
                </div>

                {/* Add/Edit Reminder Form */}
                {(showAddReminder || editingReminder) && (
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                      {editingReminder ? 'Edit Reminder' : 'New Reminder'}
                    </div>
                    <input
                      type="text"
                      value={reminderForm.title}
                      onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                      placeholder="Reminder title..."
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                    />
                    <textarea
                      value={reminderForm.notes}
                      onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
                      placeholder="Notes (optional)..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white resize-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={reminderForm.date}
                        onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                      />
                      <input
                        type="time"
                        value={reminderForm.time}
                        onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
                        className="w-28 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={resetForm}
                        className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingReminder ? handleUpdateReminder : handleAddReminder}
                        disabled={!reminderForm.title || !reminderForm.date || !reminderForm.time}
                        className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {editingReminder ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Reminders List */}
                <div className="max-h-96 overflow-y-auto">
                  {/* Due Now Section */}
                  {dueReminders.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">
                          Due Now ({dueReminders.length})
                        </p>
                      </div>
                      {dueReminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-900/10"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {reminder.title}
                              </p>
                              {reminder.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                  {reminder.notes}
                                </p>
                              )}
                              <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(reminder.remind_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditReminder(reminder)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => markRead(reminder.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => dismiss(reminder.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                title="Dismiss"
                              >
                                <X className="w-4 h-4 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Upcoming Section */}
                  {upcomingReminders.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Upcoming ({upcomingReminders.length})
                        </p>
                      </div>
                      {upcomingReminders.slice(0, 10).map((reminder) => (
                        <div
                          key={reminder.id}
                          className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {reminder.title}
                              </p>
                              {reminder.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                  {reminder.notes}
                                </p>
                              )}
                              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(reminder.remind_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditReminder(reminder)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => remove(reminder.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Dismissed Section */}
                  {dismissedReminders.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">
                          Dismissed (24h)
                        </p>
                      </div>
                      {dismissedReminders.slice(0, 5).map((reminder) => (
                        <div
                          key={reminder.id}
                          className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-through">
                                {reminder.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 dark:text-slate-500">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(reminder.remind_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleReactivate(reminder)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                title="Reactivate (5 min from now)"
                              >
                                <RefreshCw className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleEditReminder(reminder)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                title="Edit & Reactivate"
                              >
                                <Edit2 className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => remove(reminder.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Empty State */}
                  {reminders.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No reminders yet
                      </p>
                      <button
                        onClick={() => {
                          setShowAddReminder(true)
                          setReminderForm({ title: '', notes: '', date: '', time: '' })
                        }}
                        className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Add your first reminder
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="absolute top-full left-0 right-0 p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              placeholder="Search orders, customers, products..."
              autoFocus
              className="
                w-full pl-10 pr-10 py-2.5 rounded-xl text-sm
                bg-slate-50 dark:bg-slate-800
                border border-slate-200 dark:border-slate-700
                text-slate-900 dark:text-white
                placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-green-500
              "
            />
            {searchLoading && (
              <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
            <button
              onClick={() => {
                setShowMobileSearch(false)
                setSearchQuery('')
                setShowSearchResults(false)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Mobile Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
              {searchResults.map((result) => {
                const Icon = TYPE_ICONS[result.type]
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      handleSearchSelect(result)
                      setShowMobileSearch(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-600">
                      <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 capitalize">{result.type}</span>
                  </button>
                )
              })}
            </div>
          )}

          {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
            <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No results found</p>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
