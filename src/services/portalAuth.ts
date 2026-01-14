import { supabase, portalSupabase } from './supabase'
import type { Customer } from '../types'

export interface CustomerAccount {
  id: string
  customer_id: string
  user_id: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
  customer?: Customer
  email?: string // Portal user email (from auth.users via edge function)
}

export interface PortalUser {
  id: string
  email: string
  customer: Customer
  account: CustomerAccount
}

/**
 * Sign in a customer to the portal
 */
export async function portalSignIn(email: string, password: string): Promise<PortalUser> {
  // Sign in with Portal Supabase client (separate session from admin)
  const { data: authData, error: authError } = await portalSupabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('Login failed')

  // Check if this user has a customer account
  const { data: account, error: accountError } = await portalSupabase
    .from('customer_accounts')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .single()

  if (accountError || !account) {
    // Sign out if not a valid customer
    await portalSupabase.auth.signOut()
    throw new Error('No active portal account found for this email')
  }

  // Update last login
  await portalSupabase
    .from('customer_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', account.id)

  return {
    id: authData.user.id,
    email: authData.user.email || '',
    customer: account.customer,
    account: account,
  }
}

/**
 * Sign out from portal
 */
export async function portalSignOut(): Promise<void> {
  await portalSupabase.auth.signOut()
}

/**
 * Get current portal user (if logged in)
 * Returns null quickly if no session exists
 */
export async function getPortalUser(): Promise<PortalUser | null> {
  try {
    console.log('[Portal] Checking for user session...')

    // First check if there's a session at all - use portal client
    const { data: { session }, error: sessionError } = await portalSupabase.auth.getSession()

    if (sessionError) {
      console.error('[Portal] Session error:', sessionError)
      return null
    }

    if (!session) {
      console.log('[Portal] No session found')
      return null
    }

    console.log('[Portal] Session found for user:', session.user.id, 'checking customer account...')

    // Check if this user has a customer account
    // Use maybeSingle() instead of single() to avoid errors when no rows match
    const { data: account, error } = await portalSupabase
      .from('customer_accounts')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[Portal] Error fetching portal account:', error)
      return null
    }

    if (!account) {
      console.log('[Portal] No customer account found for this user')
      return null
    }

    console.log('[Portal] Customer account found:', account.customer?.company_name)

    return {
      id: session.user.id,
      email: session.user.email || '',
      customer: account.customer,
      account: account,
    }
  } catch (err) {
    console.error('[Portal] Error in getPortalUser:', err)
    return null
  }
}

/**
 * Request password reset for portal user
 */
export async function portalResetPassword(email: string): Promise<void> {
  const { error } = await portalSupabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/portal/reset-password`,
  })
  if (error) throw error
}

/**
 * Update password for portal user
 */
export async function portalUpdatePassword(newPassword: string): Promise<void> {
  const { error } = await portalSupabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
}

// =====================================================
// Admin functions for managing customer portal access
// =====================================================

/**
 * Enable portal access for a customer (creates auth user + customer_account)
 */
export async function enablePortalAccess(
  customerId: string,
  email: string,
  password: string
): Promise<CustomerAccount> {
  // First check if customer already has an account
  const { data: existing } = await supabase
    .from('customer_accounts')
    .select('id')
    .eq('customer_id', customerId)
    .maybeSingle()

  if (existing) {
    throw new Error('Customer already has portal access')
  }

  // Create auth user via Edge Function (same as admin user creation)
  const { data: { session } } = await supabase.auth.getSession()

  // Get the customer name to use as fullName
  const { data: customer } = await supabase
    .from('customers')
    .select('company_name, contact_person')
    .eq('id', customerId)
    .single()

  const fullName = customer?.contact_person || customer?.company_name || email

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        email,
        password,
        fullName, // Use customer name
        role: 'customer',
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create portal user')
  }

  const { user } = await response.json()

  // Create customer_account linking the auth user to the customer
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .insert({
      customer_id: customerId,
      user_id: user.id,
      email: email, // Store the portal email
      is_active: true,
    })
    .select()
    .single()

  if (accountError) {
    // Try to clean up the auth user if account creation fails
    console.error('Failed to create customer account:', accountError)
    throw accountError
  }

  return account
}

/**
 * Disable portal access for a customer
 */
export async function disablePortalAccess(customerId: string): Promise<void> {
  const { error } = await supabase
    .from('customer_accounts')
    .update({ is_active: false })
    .eq('customer_id', customerId)

  if (error) throw error
}

/**
 * Re-enable portal access for a customer
 */
export async function reEnablePortalAccess(customerId: string): Promise<void> {
  const { error } = await supabase
    .from('customer_accounts')
    .update({ is_active: true })
    .eq('customer_id', customerId)

  if (error) throw error
}

/**
 * Get portal account status for a customer
 */
export async function getPortalAccountStatus(customerId: string): Promise<CustomerAccount | null> {
  const { data, error } = await supabase
    .from('customer_accounts')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle()

  if (error) return null
  return data
}

/**
 * Get all customers with their portal status
 */
export async function getCustomersWithPortalStatus(): Promise<(Customer & { portal_account?: CustomerAccount })[]> {
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('*')
    .order('company_name')

  if (customersError) throw customersError

  const { data: accounts } = await supabase
    .from('customer_accounts')
    .select('*')

  const accountMap = new Map(accounts?.map(a => [a.customer_id, a]) || [])

  return customers.map(customer => ({
    ...customer,
    portal_account: accountMap.get(customer.id),
  }))
}

/**
 * Send password reset link for a customer's portal account (admin action)
 */
export async function sendPortalPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/portal/reset-password`,
  })
  if (error) throw error
}
