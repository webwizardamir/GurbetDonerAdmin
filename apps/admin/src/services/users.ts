import { supabase } from './supabase'
import { UserProfile } from '../types'

export interface CreateUserData {
  email: string
  fullName: string
  role: 'owner' | 'shop_manager'
  password: string
}

export interface UpdateUserData {
  fullName?: string
  role?: 'owner' | 'shop_manager'
  isActive?: boolean
  phone?: string
}

// Fetch all staff profiles (owners and shop managers) using RPC function
export async function fetchStaffProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.rpc('get_all_staff')

  if (error) throw error
  return (data || []) as UserProfile[]
}

// Update a user's profile using RPC function (bypasses RLS for owners)
export async function updateUserProfile(
  userId: string,
  updates: UpdateUserData
): Promise<boolean> {
  const { error } = await supabase.rpc('update_staff_profile', {
    p_user_id: userId,
    p_full_name: updates.fullName || null,
    p_role: updates.role || null,
    p_is_active: updates.isActive ?? null
  })

  if (error) throw error
  return true
}

// Create user via Edge Function (has admin privileges to create auth users)
export async function inviteUser(data: CreateUserData): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    // Call the Edge Function
    const { data: result, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
      },
    })

    if (error) {
      console.error('Edge function error:', error)
      return { success: false, error: error.message }
    }

    if (result?.error) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error creating user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    }
  }
}

// Deactivate a user (soft delete)
export async function deactivateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)

  if (error) throw error
}

// Reactivate a user
export async function reactivateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', userId)

  if (error) throw error
}
