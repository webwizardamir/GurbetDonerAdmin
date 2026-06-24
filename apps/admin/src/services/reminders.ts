import { supabase } from './supabase'

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'
export type ReminderCategory = 'generic' | 'payment_due'

export interface Reminder {
  id: string
  user_id: string
  title: string
  notes?: string
  remind_at: string
  is_read: boolean
  is_dismissed: boolean
  order_id?: string
  customer_id?: string
  product_id?: string
  recurrence: ReminderRecurrence
  recurrence_until?: string | null
  email_enabled: boolean
  email_sent_at?: string | null
  category: ReminderCategory
  created_at: string
  updated_at: string
}

export interface CreateReminderData {
  title: string
  notes?: string
  remind_at: string
  order_id?: string
  customer_id?: string
  product_id?: string
  recurrence?: ReminderRecurrence
  recurrence_until?: string | null
  email_enabled?: boolean
  category?: ReminderCategory
}

export interface UpdateReminderData {
  title?: string
  notes?: string
  remind_at?: string
  recurrence?: ReminderRecurrence
  recurrence_until?: string | null
  email_enabled?: boolean
}

/** Advance a timestamp by one recurrence interval. Returns null when 'none'. */
export function nextOccurrence(remindAt: string, recurrence: ReminderRecurrence): string | null {
  if (recurrence === 'none') return null
  const d = new Date(remindAt)
  if (recurrence === 'daily') d.setDate(d.getDate() + 1)
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

// Fetch all reminders for current user (active + dismissed within last 24h)
export async function fetchReminders(): Promise<Reminder[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user?.id) return []

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get active reminders OR dismissed within last 24 hours
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userData.user.id)
    .or(`is_dismissed.eq.false,updated_at.gte.${oneDayAgo}`)
    .order('remind_at', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch due reminders (remind_at <= now and not dismissed)
export async function fetchDueReminders(): Promise<Reminder[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user?.id) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('is_dismissed', false)
    .eq('is_read', false)
    .lte('remind_at', now)
    .order('remind_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Get unread count
export async function getUnreadCount(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user?.id) return 0

  const now = new Date().toISOString()

  const { count, error } = await supabase
    .from('reminders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id)
    .eq('is_dismissed', false)
    .eq('is_read', false)
    .lte('remind_at', now)

  if (error) throw error
  return count || 0
}

// Create a reminder
export async function createReminder(data: CreateReminderData): Promise<Reminder> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user?.id) throw new Error('Not authenticated')

  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userData.user.id,
      title: data.title,
      notes: data.notes || null,
      remind_at: data.remind_at,
      order_id: data.order_id || null,
      customer_id: data.customer_id || null,
      product_id: data.product_id || null,
      recurrence: data.recurrence ?? 'none',
      recurrence_until: data.recurrence_until ?? null,
      email_enabled: data.email_enabled ?? false,
      category: data.category ?? 'generic',
    })
    .select()
    .single()

  if (error) throw error
  return reminder
}

// Update a reminder
export async function updateReminder(id: string, data: UpdateReminderData): Promise<Reminder> {
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.notes !== undefined) updateData.notes = data.notes || null
  if (data.recurrence !== undefined) updateData.recurrence = data.recurrence
  if (data.recurrence_until !== undefined) updateData.recurrence_until = data.recurrence_until
  if (data.email_enabled !== undefined) updateData.email_enabled = data.email_enabled
  if (data.remind_at !== undefined) {
    updateData.remind_at = data.remind_at
    updateData.is_read = false // Reset read status when time changes
    updateData.is_dismissed = false // Reactivate if dismissed
    updateData.email_sent_at = null // Allow the email nudge to fire again
  }

  const { data: reminder, error } = await supabase
    .from('reminders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return reminder
}

/**
 * For a recurring reminder, create the next occurrence (if still within
 * recurrence_until). Called when the current occurrence is read/dismissed.
 * No-op for non-recurring reminders.
 */
export async function maybeSpawnNextOccurrence(reminder: Reminder): Promise<void> {
  if (!reminder.recurrence || reminder.recurrence === 'none') return
  const next = nextOccurrence(reminder.remind_at, reminder.recurrence)
  if (!next) return
  if (reminder.recurrence_until && new Date(next) > new Date(reminder.recurrence_until)) return

  await createReminder({
    title: reminder.title,
    notes: reminder.notes,
    remind_at: next,
    order_id: reminder.order_id,
    customer_id: reminder.customer_id,
    product_id: reminder.product_id,
    recurrence: reminder.recurrence,
    recurrence_until: reminder.recurrence_until,
    email_enabled: reminder.email_enabled,
    category: reminder.category,
  })
}

// Mark reminder as read
export async function markReminderRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ is_read: true })
    .eq('id', id)

  if (error) throw error
}

// Dismiss reminder
export async function dismissReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ is_dismissed: true })
    .eq('id', id)

  if (error) throw error
}

// Snooze reminder (postpone by X minutes)
export async function snoozeReminder(id: string, minutes: number = 5): Promise<void> {
  const newTime = new Date(Date.now() + minutes * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('reminders')
    .update({ remind_at: newTime, is_read: false })
    .eq('id', id)

  if (error) throw error
}

// Delete reminder
export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)

  if (error) throw error
}
