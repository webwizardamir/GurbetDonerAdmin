// Notification/reminder panel for the header.
// Displays due, upcoming, and dismissed reminders with add/edit functionality.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Plus,
  Clock,
  Trash2,
  Check,
  Edit2,
  RefreshCw,
  X,
} from 'lucide-react'
import type { Reminder } from '../../services/reminders'

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

function formatDateTimeForInput(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr)
  const date = d.toISOString().split('T')[0]
  const time = d.toTimeString().slice(0, 5)
  return { date, time }
}

interface NotificationPanelProps {
  reminders: Reminder[]
  dueReminders: Reminder[]
  onCreate: (data: { title: string; notes?: string; remind_at: string }) => Promise<unknown>
  onUpdate: (id: string, data: { title?: string; notes?: string; remind_at?: string }) => Promise<unknown>
  onMarkRead: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

export default function NotificationPanel({
  reminders,
  dueReminders,
  onCreate,
  onUpdate,
  onMarkRead,
  onDismiss,
  onRemove,
}: NotificationPanelProps) {
  const { t } = useTranslation()
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [reminderForm, setReminderForm] = useState({ title: '', notes: '', date: '', time: '' })

  const resetForm = () => {
    setReminderForm({ title: '', notes: '', date: '', time: '' })
    setShowAddReminder(false)
    setEditingReminder(null)
  }

  const handleAddReminder = async () => {
    if (!reminderForm.title || !reminderForm.date || !reminderForm.time) return
    try {
      const remindAt = new Date(`${reminderForm.date}T${reminderForm.time}`).toISOString()
      await onCreate({ title: reminderForm.title, notes: reminderForm.notes || undefined, remind_at: remindAt })
      resetForm()
    } catch (err) { console.error('Failed to create reminder:', err) }
  }

  const handleEditReminder = (reminder: Reminder) => {
    const { date, time } = formatDateTimeForInput(reminder.remind_at)
    setReminderForm({ title: reminder.title, notes: reminder.notes || '', date, time })
    setEditingReminder(reminder)
    setShowAddReminder(false)
  }

  const handleUpdateReminder = async () => {
    if (!editingReminder || !reminderForm.title || !reminderForm.date || !reminderForm.time) return
    try {
      const remindAt = new Date(`${reminderForm.date}T${reminderForm.time}`).toISOString()
      await onUpdate(editingReminder.id, { title: reminderForm.title, notes: reminderForm.notes || undefined, remind_at: remindAt })
      resetForm()
    } catch (err) { console.error('Failed to update reminder:', err) }
  }

  const handleReactivate = async (reminder: Reminder) => {
    const newTime = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    try { await onUpdate(reminder.id, { remind_at: newTime }) }
    catch (err) { console.error('Failed to reactivate reminder:', err) }
  }

  const activeReminders = reminders.filter(r => !r.is_dismissed)
  const dismissedReminders = reminders.filter(r => r.is_dismissed)
  const upcomingReminders = activeReminders.filter(r => !dueReminders.find(d => d.id === r.id))

  return (
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
          <input type="text" value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
            placeholder="Reminder title..."
            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" />
          <textarea value={reminderForm.notes} onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
            placeholder="Notes (optional)..." rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white resize-none" />
          <div className="flex gap-2">
            <input type="date" value={reminderForm.date} onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" />
            <input type="time" value={reminderForm.time} onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
              className="w-28 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" />
          </div>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={editingReminder ? handleUpdateReminder : handleAddReminder}
              disabled={!reminderForm.title || !reminderForm.date || !reminderForm.time}
              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
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
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Due Now ({dueReminders.length})</p>
            </div>
            {dueReminders.map((reminder) => (
              <div key={reminder.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-900/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{reminder.title}</p>
                    {reminder.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{reminder.notes}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400"><Clock className="w-3 h-3" />{formatRelativeTime(reminder.remind_at)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditReminder(reminder)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="Edit"><Edit2 className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => onMarkRead(reminder.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="Mark as read"><Check className="w-4 h-4 text-green-600" /></button>
                    <button onClick={() => onDismiss(reminder.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="Dismiss"><X className="w-4 h-4 text-slate-400" /></button>
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
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Upcoming ({upcomingReminders.length})</p>
            </div>
            {upcomingReminders.slice(0, 10).map((reminder) => (
              <div key={reminder.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{reminder.title}</p>
                    {reminder.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{reminder.notes}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400"><Clock className="w-3 h-3" />{formatRelativeTime(reminder.remind_at)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditReminder(reminder)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="Edit"><Edit2 className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => onRemove(reminder.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
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
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Dismissed (24h)</p>
            </div>
            {dismissedReminders.slice(0, 5).map((reminder) => (
              <div key={reminder.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-through">{reminder.title}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 dark:text-slate-500"><Clock className="w-3 h-3" />{formatRelativeTime(reminder.remind_at)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleReactivate(reminder)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="Reactivate (5 min from now)"><RefreshCw className="w-4 h-4 text-green-600" /></button>
                    <button onClick={() => handleEditReminder(reminder)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="Edit & Reactivate"><Edit2 className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => onRemove(reminder.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="Delete permanently"><Trash2 className="w-4 h-4 text-red-500" /></button>
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
            <p className="text-sm text-slate-500 dark:text-slate-400">No reminders yet</p>
            <button onClick={() => { setShowAddReminder(true); setReminderForm({ title: '', notes: '', date: '', time: '' }) }}
              className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium">Add your first reminder</button>
          </div>
        )}
      </div>
    </div>
  )
}
