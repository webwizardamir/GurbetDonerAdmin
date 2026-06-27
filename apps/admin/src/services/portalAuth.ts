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

  // Check if this user has an active customer account (the access gate).
  const { data: account, error: accountError } = await portalSupabase
    .from('customer_accounts')
    .select('*')
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .single()

  if (accountError || !account) {
    // Not a valid customer (e.g. a staff member mistyped here) — sign out the
    // PORTAL session only (scope:'local'), never globally revoke their admin session.
    await portalSupabase.auth.signOut({ scope: 'local' })
    throw new Error('No active portal account found for this email')
  }

  await portalSupabase.rpc('touch_portal_last_login')

  // Safe customer profile (no cost/internal columns) via the portal RPC.
  const { data: customer, error: customerError } = await portalSupabase.rpc('get_portal_customer')
  if (customerError || !customer) {
    await portalSupabase.auth.signOut({ scope: 'local' })
    throw new Error('No active portal account found for this email')
  }

  return {
    id: authData.user.id,
    email: authData.user.email || '',
    customer: customer as Customer,
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
    if (import.meta.env.DEV) console.log('[Portal] Checking for user session...')

    // First check if there's a session at all - use portal client
    const { data: { session }, error: sessionError } = await portalSupabase.auth.getSession()

    if (sessionError) {
      console.error('[Portal] Session error:', sessionError)
      return null
    }

    if (!session) {
      if (import.meta.env.DEV) console.log('[Portal] No session found')
      return null
    }

    if (import.meta.env.DEV) console.log('[Portal] Session found for user:', session.user.id, 'checking customer account...')

    // Check if this user has an active customer account (own row; the access gate).
    const { data: account, error } = await portalSupabase
      .from('customer_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[Portal] Error fetching portal account:', error)
      return null
    }

    if (!account) {
      if (import.meta.env.DEV) console.log('[Portal] No customer account found for this user')
      return null
    }

    // Safe customer profile via the portal RPC (no cost/internal columns).
    const { data: customer, error: customerError } = await portalSupabase.rpc('get_portal_customer')
    if (customerError || !customer) {
      console.error('[Portal] Error fetching portal customer:', customerError)
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      customer: customer as Customer,
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

/** Error code thrown when an email is already an ADMIN login (cannot be a portal account). */
export const PORTAL_EMAIL_IS_ADMIN = 'is_admin_account'
/** Error code thrown when an email already belongs to a different customer. */
export const PORTAL_EMAIL_IN_USE = 'email_in_use'

interface ManagePortalResponse {
  success?: boolean
  user?: { id: string; email: string }
  actionLink?: string
  error?: string
  code?: string
}

/**
 * Call the owner-gated `manage-portal-account` edge function. Throws an Error
 * whose `.message` is the server `code` (when present) so callers can branch on
 * PORTAL_EMAIL_IS_ADMIN / PORTAL_EMAIL_IN_USE / 'email_exists'.
 */
async function callManagePortal(body: Record<string, unknown>): Promise<ManagePortalResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-portal-account`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    }
  )
  const json: ManagePortalResponse = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json.code || json.error || 'Portal request failed')
  }
  return json
}

async function getCustomerFullName(customerId: string, fallback: string): Promise<string> {
  const { data } = await supabase
    .from('customers')
    .select('company_name, contact_person')
    .eq('id', customerId)
    .single()
  return data?.contact_person || data?.company_name || fallback
}

/** Upsert the customer_accounts row linking an auth user to a customer (idempotent). */
async function upsertCustomerAccount(customerId: string, userId: string, email: string): Promise<CustomerAccount> {
  const { data, error } = await supabase
    .from('customer_accounts')
    .upsert(
      { customer_id: customerId, user_id: userId, email, is_active: true },
      { onConflict: 'customer_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Enable portal access by setting a password. Idempotent and self-healing:
 * - reactivates an existing inactive account
 * - if the email already exists as an ORPHAN auth user, relinks instead of failing
 * - rejects emails that belong to an admin or another customer (clear error code)
 */
export async function enablePortalAccess(
  customerId: string,
  email: string,
  password: string
): Promise<CustomerAccount> {
  const { data: existing } = await supabase
    .from('customer_accounts')
    .select('id, is_active')
    .eq('customer_id', customerId)
    .maybeSingle()

  if (existing?.is_active) throw new Error('Customer already has portal access')

  const fullName = await getCustomerFullName(customerId, email)

  let userId: string
  try {
    const res = await callManagePortal({ action: 'create', email, password, fullName, customerId })
    userId = res.user!.id
  } catch (err) {
    // Existing orphan auth user for this email → relink (and set the new password).
    if (err instanceof Error && err.message === 'email_exists') {
      const relink = await callManagePortal({ action: 'relink', email, password, customerId })
      userId = relink.user!.id
    } else {
      throw err
    }
  }

  return upsertCustomerAccount(customerId, userId, email)
}

/**
 * Enable portal access via a shareable invite link (customer sets their own
 * password). Returns the actionLink to copy/share. Creates/links the auth user
 * and the customer_accounts row.
 */
export async function createPortalInvite(
  customerId: string,
  email: string
): Promise<{ account: CustomerAccount; actionLink: string }> {
  const { data: existing } = await supabase
    .from('customer_accounts')
    .select('id, is_active')
    .eq('customer_id', customerId)
    .maybeSingle()
  if (existing?.is_active) throw new Error('Customer already has portal access')

  const redirectTo = `${window.location.origin}/portal/reset-password`
  const res = await callManagePortal({ action: 'invite_link', email, customerId, redirectTo })
  if (!res.user?.id || !res.actionLink) throw new Error('Invite link could not be generated')

  const account = await upsertCustomerAccount(customerId, res.user.id, email)
  return { account, actionLink: res.actionLink }
}

/**
 * Generate a shareable password-reset link for a customer's portal account.
 */
export async function getPortalResetLink(customerId: string): Promise<string> {
  const { data: account } = await supabase
    .from('customer_accounts')
    .select('email')
    .eq('customer_id', customerId)
    .maybeSingle()
  if (!account?.email) throw new Error('No portal account email on file')

  const redirectTo = `${window.location.origin}/portal/reset-password`
  const res = await callManagePortal({ action: 'reset_link', email: account.email, customerId, redirectTo })
  if (!res.actionLink) throw new Error('Reset link could not be generated')
  return res.actionLink
}

/**
 * Delete a customer's portal account entirely: removes the orphaned auth user
 * (server refuses if it's an admin) AND the customer_accounts row.
 */
export async function deletePortalAccount(customerId: string): Promise<void> {
  const { data: account } = await supabase
    .from('customer_accounts')
    .select('id, user_id')
    .eq('customer_id', customerId)
    .maybeSingle()
  if (!account) return

  if (account.user_id) {
    await callManagePortal({ action: 'delete', userId: account.user_id })
  }
  const { error } = await supabase
    .from('customer_accounts')
    .delete()
    .eq('customer_id', customerId)
  if (error) throw error
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
