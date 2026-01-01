import { useState, useEffect } from 'react'
import { Bell, X, Clock, ChevronDown } from 'lucide-react'
import type { Reminder } from '../services/reminders'
import { markReminderRead, snoozeReminder } from '../services/reminders'
import { playNotificationSound } from '../utils/notificationSound'

const SNOOZE_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '1 day', minutes: 1440 },
]

export default function ReminderAlert() {
  const [alerts, setAlerts] = useState<Reminder[]>([])
  const [showSnoozeMenu, setShowSnoozeMenu] = useState<string | null>(null)

  useEffect(() => {
    function handleReminderAlert(event: CustomEvent<Reminder>) {
      const reminder = event.detail
      setAlerts(prev => {
        // Don't add if already in list
        if (prev.find(r => r.id === reminder.id)) return prev
        return [...prev, reminder]
      })

      // Play notification sound
      playNotificationSound()
    }

    window.addEventListener('reminder-alert', handleReminderAlert as EventListener)
    return () => window.removeEventListener('reminder-alert', handleReminderAlert as EventListener)
  }, [])

  // Close snooze menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSnoozeMenu(null)
    if (showSnoozeMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showSnoozeMenu])

  const handleSnooze = async (id: string, minutes: number) => {
    try {
      await snoozeReminder(id, minutes)
      setAlerts(prev => prev.filter(r => r.id !== id))
      setShowSnoozeMenu(null)
    } catch (err) {
      console.error('Failed to snooze reminder:', err)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await markReminderRead(id)
      setAlerts(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('Failed to mark reminder as read:', err)
    }
  }

  const handleClose = (id: string) => {
    // Just hide from UI without snoozing or marking read
    // It will reappear on next poll if still due
    setAlerts(prev => prev.filter(r => r.id !== id))
  }

  if (alerts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 animate-in slide-in-from-right-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl animate-pulse">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {alert.title}
                </h4>
                <button
                  onClick={() => handleClose(alert.id)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Close (will reappear)"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              {alert.notes && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {alert.notes}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                Reminder due
              </div>
              <div className="flex gap-2 mt-3">
                {/* Snooze dropdown */}
                <div className="relative flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSnoozeMenu(showSnoozeMenu === alert.id ? null : alert.id)
                    }}
                    className="w-full px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Snooze
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showSnoozeMenu === alert.id && (
                    <div
                      className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {SNOOZE_OPTIONS.map(option => (
                        <button
                          key={option.minutes}
                          onClick={() => handleSnooze(alert.id, option.minutes)}
                          className="w-full px-3 py-1.5 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleMarkRead(alert.id)}
                  className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
