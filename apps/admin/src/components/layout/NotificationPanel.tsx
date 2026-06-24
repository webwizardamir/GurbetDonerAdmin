// Notification / reminder center for the header bell.
// Shows due, upcoming and recently-dismissed reminders, and lets the user
// create/edit reminders with optional recurrence + an email nudge.

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
  Repeat,
  Mail,
} from 'lucide-react'
import type {
  Reminder,
  ReminderRecurrence,
  CreateReminderData,
  UpdateReminderData,
} from '../../services/reminders'

function formatRelativeTime(dateStr: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const absDiff = Math.abs(diff)
  const past = diff < 0

  if (absDiff < 60000) return past ? t('reminders.time.justNow') : t('reminders.time.soon')
  if (absDiff < 3600000) {
    const n = Math.round(absDiff / 60000)
    return past ? t('reminders.time.minAgo', { n }) : t('reminders.time.inMin', { n })
  }
  if (absDiff < 86400000) {
    const n = Math.round(absDiff / 3600000)
    return past ? t('reminders.time.hourAgo', { n }) : t('reminders.time.inHour', { n })
  }
  const n = Math.round(absDiff / 86400000)
  return past ? t('reminders.time.dayAgo', { n }) : t('reminders.time.inDay', { n })
}

function formatDateTimeForInput(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr)
  const date = d.toISOString().split('T')[0]
  const time = d.toTimeString().slice(0, 5)
  return { date, time }
}

const RECURRENCES: ReminderRecurrence[] = ['none', 'daily', 'weekly', 'monthly']

interface FormState {
  title: string
  notes: string
  date: string
  time: string
  recurrence: ReminderRecurrence
  emailEnabled: boolean
}

const EMPTY_FORM: FormState = { title: '', notes: '', date: '', time: '', recurrence: 'none', emailEnabled: false }

interface NotificationPanelProps {
  reminders: Reminder[]
  dueReminders: Reminder[]
  onCreate: (data: CreateReminderData) => Promise<unknown>
  onUpdate: (id: string, data: UpdateReminderData) => Promise<unknown>
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setShowAddReminder(false)
    setEditingReminder(null)
  }

  const handleAddReminder = async () => {
    if (!form.title || !form.date || !form.time) return
    try {
      const remindAt = new Date(`${form.date}T${form.time}`).toISOString()
      await onCreate({
        title: form.title,
        notes: form.notes || undefined,
        remind_at: remindAt,
        recurrence: form.recurrence,
        email_enabled: form.emailEnabled,
      })
      resetForm()
    } catch (err) { console.error('Failed to create reminder:', err) }
  }

  const handleEditReminder = (reminder: Reminder) => {
    const { date, time } = formatDateTimeForInput(reminder.remind_at)
    setForm({
      title: reminder.title,
      notes: reminder.notes || '',
      date,
      time,
      recurrence: reminder.recurrence || 'none',
      emailEnabled: reminder.email_enabled || false,
    })
    setEditingReminder(reminder)
    setShowAddReminder(false)
  }

  const handleUpdateReminder = async () => {
    if (!editingReminder || !form.title || !form.date || !form.time) return
    try {
      const remindAt = new Date(`${form.date}T${form.time}`).toISOString()
      await onUpdate(editingReminder.id, {
        title: form.title,
        notes: form.notes || undefined,
        remind_at: remindAt,
        recurrence: form.recurrence,
        email_enabled: form.emailEnabled,
      })
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

  const badges = (r: Reminder) => (
    <>
      {r.recurrence && r.recurrence !== 'none' && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500" title={t(`reminders.recurrence.${r.recurrence}`)}>
          <Repeat className="w-3 h-3" />
        </span>
      )}
      {r.email_enabled && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500" title={t('reminders.emailNudge')}>
          <Mail className="w-3 h-3" />
        </span>
      )}
    </>
  )

  return (
    <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('reminders.title')}</h3>
        <button
          onClick={() => { setShowAddReminder(!showAddReminder); setEditingReminder(null); setForm(EMPTY_FORM) }}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title={t('reminders.add')}
        >
          <Plus className="w-5 h-5 text-green-600" />
        </button>
      </div>

      {/* Add/Edit form */}
      {(showAddReminder || editingReminder) && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-700/50">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
            {editingReminder ? t('reminders.editTitle') : t('reminders.newTitle')}
          </div>
          <input
            type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder={t('reminders.titlePlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <textarea
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder={t('reminders.notesPlaceholder')} rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <div className="flex gap-2">
            <input
              type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
              className="w-28 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={form.recurrence}
              onChange={e => setForm({ ...form, recurrence: e.target.value as ReminderRecurrence })}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {RECURRENCES.map(r => (
                <option key={r} value={r}>{t(`reminders.recurrence.${r}`)}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox" checked={form.emailEnabled}
              onChange={e => setForm({ ...form, emailEnabled: e.target.checked })}
              className="rounded border-slate-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
            />
            <Mail className="w-4 h-4 text-slate-400" />
            {t('reminders.emailNudge')}
          </label>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              {t('common.cancel')}
            </button>
            <button
              onClick={editingReminder ? handleUpdateReminder : handleAddReminder}
              disabled={!form.title || !form.date || !form.time}
              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {editingReminder ? t('common.update') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {/* Due now */}
        {dueReminders.length > 0 && (
          <>
            <SectionLabel tone="red">{t('reminders.dueNow')} ({dueReminders.length})</SectionLabel>
            {dueReminders.map(reminder => (
              <div key={reminder.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-900/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                      {reminder.title} {badges(reminder)}
                    </p>
                    {reminder.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{reminder.notes}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400"><Clock className="w-3 h-3" />{formatRelativeTime(reminder.remind_at, t)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconBtn onClick={() => handleEditReminder(reminder)} title={t('common.edit')}><Edit2 className="w-4 h-4 text-slate-500" /></IconBtn>
                    <IconBtn onClick={() => onMarkRead(reminder.id)} title={t('reminders.markRead')}><Check className="w-4 h-4 text-green-600" /></IconBtn>
                    <IconBtn onClick={() => onDismiss(reminder.id)} title={t('reminders.dismiss')}><X className="w-4 h-4 text-slate-400" /></IconBtn>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Upcoming */}
        {upcomingReminders.length > 0 && (
          <>
            <SectionLabel tone="slate">{t('reminders.upcoming')} ({upcomingReminders.length})</SectionLabel>
            {upcomingReminders.slice(0, 10).map(reminder => (
              <div key={reminder.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                      {reminder.title} {badges(reminder)}
                    </p>
                    {reminder.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{reminder.notes}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400"><Clock className="w-3 h-3" />{formatRelativeTime(reminder.remind_at, t)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconBtn onClick={() => handleEditReminder(reminder)} title={t('common.edit')}><Edit2 className="w-4 h-4 text-slate-500" /></IconBtn>
                    <IconBtn onClick={() => onRemove(reminder.id)} title={t('common.delete')}><Trash2 className="w-4 h-4 text-red-500" /></IconBtn>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Dismissed */}
        {dismissedReminders.length > 0 && (
          <>
            <SectionLabel tone="muted">{t('reminders.dismissed')}</SectionLabel>
            {dismissedReminders.slice(0, 5).map(reminder => (
              <div key={reminder.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-through">{reminder.title}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 dark:text-slate-500"><Clock className="w-3 h-3" />{formatRelativeTime(reminder.remind_at, t)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconBtn onClick={() => handleReactivate(reminder)} title={t('reminders.reactivate')}><RefreshCw className="w-4 h-4 text-green-600" /></IconBtn>
                    <IconBtn onClick={() => onRemove(reminder.id)} title={t('common.delete')}><Trash2 className="w-4 h-4 text-red-500" /></IconBtn>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Empty */}
        {reminders.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('reminders.empty')}</p>
            <button onClick={() => { setShowAddReminder(true); setForm(EMPTY_FORM) }}
              className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium">{t('reminders.addFirst')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ tone, children }: { tone: 'red' | 'slate' | 'muted'; children: React.ReactNode }) {
  const cls = tone === 'red'
    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    : tone === 'muted'
      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
      : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
  return (
    <div className={`px-4 py-2 border-b border-slate-200 dark:border-slate-700 ${cls}`}>
      <p className="text-xs font-semibold uppercase">{children}</p>
    </div>
  )
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
      {children}
    </button>
  )
}
