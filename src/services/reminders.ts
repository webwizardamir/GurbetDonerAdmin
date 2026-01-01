import { supabase } from './supabase'

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
}

export interface UpdateReminderData {
  title?: string
  notes?: string
  remind_at?: string
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
  if (data.remind_at !== undefined) {
    updateData.remind_at = data.remind_at
    updateData.is_read = false // Reset read status when time changes
    updateData.is_dismissed = false // Reactivate if dismissed
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
