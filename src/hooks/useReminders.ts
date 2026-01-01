import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchReminders,
  fetchDueReminders,
  getUnreadCount,
  createReminder,
  updateReminder,
  markReminderRead,
  dismissReminder,
  snoozeReminder,
  deleteReminder,
  type Reminder,
  type CreateReminderData,
  type UpdateReminderData,
} from '../services/reminders'

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [dueReminders, setDueReminders] = useState<Reminder[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track which reminders have been alerted
  const alertedIds = useRef<Set<string>>(new Set())

  const loadReminders = useCallback(async () => {
    try {
      setError(null)
      const [all, due, count] = await Promise.all([
        fetchReminders(),
        fetchDueReminders(),
        getUnreadCount(),
      ])
      setReminders(all)
      setDueReminders(due)
      setUnreadCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadReminders()
  }, [loadReminders])

  // Poll for due reminders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadReminders()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadReminders])

  // Check for new due reminders and trigger alerts
  useEffect(() => {
    for (const reminder of dueReminders) {
      if (!alertedIds.current.has(reminder.id)) {
        alertedIds.current.add(reminder.id)
        // Dispatch custom event for alert
        window.dispatchEvent(new CustomEvent('reminder-alert', { detail: reminder }))
      }
    }
  }, [dueReminders])

  const create = async (data: CreateReminderData) => {
    try {
      setError(null)
      const newReminder = await createReminder(data)
      setReminders(prev => [...prev, newReminder].sort(
        (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
      ))
      return newReminder
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create reminder'
      setError(message)
      throw err
    }
  }

  const update = async (id: string, data: UpdateReminderData) => {
    try {
      setError(null)
      const updated = await updateReminder(id, data)
      setReminders(prev => prev.map(r => r.id === id ? updated : r).sort(
        (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
      ))
      // If time changed, reset alerted status so it can alert again
      if (data.remind_at) {
        alertedIds.current.delete(id)
      }
      await loadReminders() // Refresh all
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update reminder'
      setError(message)
      throw err
    }
  }

  const markRead = async (id: string) => {
    try {
      await markReminderRead(id)
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r))
      setDueReminders(prev => prev.filter(r => r.id !== id))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark reminder as read:', err)
    }
  }

  const dismiss = async (id: string) => {
    try {
      await dismissReminder(id)
      // Update local state to show as dismissed (not remove - stays visible for 24h)
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_dismissed: true } : r))
      setDueReminders(prev => prev.filter(r => r.id !== id))
      alertedIds.current.delete(id)
      await loadReminders() // Refresh count
    } catch (err) {
      console.error('Failed to dismiss reminder:', err)
    }
  }

  const snooze = async (id: string, minutes: number = 5) => {
    try {
      await snoozeReminder(id, minutes)
      setDueReminders(prev => prev.filter(r => r.id !== id))
      alertedIds.current.delete(id)
      await loadReminders() // Refresh to get updated remind_at
    } catch (err) {
      console.error('Failed to snooze reminder:', err)
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteReminder(id)
      setReminders(prev => prev.filter(r => r.id !== id))
      setDueReminders(prev => prev.filter(r => r.id !== id))
      alertedIds.current.delete(id)
      await loadReminders() // Refresh count
    } catch (err) {
      console.error('Failed to delete reminder:', err)
    }
  }

  return {
    reminders,
    dueReminders,
    unreadCount,
    loading,
    error,
    refresh: loadReminders,
    create,
    update,
    markRead,
    dismiss,
    snooze,
    remove,
  }
}
