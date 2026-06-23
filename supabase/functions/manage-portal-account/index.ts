// Edge function for admin management of CUSTOMER PORTAL auth accounts.
// Owner-gated. Uses the service role to perform auth.admin operations the browser
// must never do directly. Dispatches on `action`.
//
// SAFETY INVARIANT: never create/relink/delete/modify an auth user that has a
// `profiles` row (= an ADMIN account) or that already belongs to a DIFFERENT
// customer. The classify() guard enforces this before any mutation.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Action =
  | 'create' | 'invite_link' | 'reset_link'
  | 'set_password' | 'update_email' | 'relink' | 'delete'

interface ManageRequest {
  action: Action
  email?: string
  password?: string
  fullName?: string
  userId?: string
  customerId?: string
  redirectTo?: string
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const MIN_PASSWORD = 12

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1. Verify the caller is an authenticated OWNER (role read from DB, not client).
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser()
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401)

    const { data: callerProfile } = await userClient
      .from('profiles').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'owner') {
      return json({ error: 'Only owners can manage portal accounts' }, 403)
    }

    // 2. Service-role client (built only after authz passes).
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body: ManageRequest = await req.json()
    const { action } = body
    const redirectTo = body.redirectTo || undefined

    // --- helpers -------------------------------------------------------
    const findUserByEmail = async (email: string) => {
      const target = email.trim().toLowerCase()
      let page = 1
      // listUsers is paginated; scan until found or exhausted.
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        const hit = data.users.find((u) => (u.email || '').toLowerCase() === target)
        if (hit) return hit
        if (data.users.length < 200) return null
        page++
      }
    }

    // Returns { kind: 'admin' | 'orphan' | 'self' | 'other' } for an auth user id.
    const classify = async (userId: string, customerId?: string) => {
      const { data: prof } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle()
      if (prof) return 'admin' as const
      const { data: acct } = await admin
        .from('customer_accounts').select('customer_id').eq('user_id', userId).maybeSingle()
      if (!acct) return 'orphan' as const
      if (customerId && acct.customer_id === customerId) return 'self' as const
      return 'other' as const
    }

    const requirePassword = (pw?: string) => {
      if (!pw || pw.length < MIN_PASSWORD) {
        return `Password must be at least ${MIN_PASSWORD} characters`
      }
      return null
    }

    // --- actions -------------------------------------------------------
    switch (action) {
      case 'create': {
        const { email, password, fullName } = body
        if (!email) return json({ error: 'email required' }, 400)
        const pwErr = requirePassword(password)
        if (pwErr) return json({ error: pwErr }, 400)

        // Guard: if the email already exists, never silently hijack it.
        const existing = await findUserByEmail(email)
        if (existing) {
          const kind = await classify(existing.id, body.customerId)
          if (kind === 'admin') return json({ error: 'is_admin_account', code: 'is_admin_account' }, 409)
          if (kind === 'other') return json({ error: 'email_belongs_to_other_customer', code: 'email_in_use' }, 409)
          return json({ error: 'email_exists', code: 'email_exists', user: { id: existing.id, email: existing.email } }, 409)
        }

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName || email },
        })
        if (error) return json({ error: error.message }, 400)
        return json({ success: true, user: { id: data.user.id, email: data.user.email } })
      }

      case 'relink': {
        // Reuse an existing orphan auth user (no profile, no other account).
        const { email } = body
        if (!email) return json({ error: 'email required' }, 400)
        const existing = await findUserByEmail(email)
        if (!existing) return json({ error: 'not_found', code: 'not_found' }, 404)
        const kind = await classify(existing.id, body.customerId)
        if (kind === 'admin') return json({ error: 'is_admin_account', code: 'is_admin_account' }, 409)
        if (kind === 'other') return json({ error: 'email_belongs_to_other_customer', code: 'email_in_use' }, 409)
        // optional password reset on relink
        if (body.password) {
          const pwErr = requirePassword(body.password)
          if (pwErr) return json({ error: pwErr }, 400)
          await admin.auth.admin.updateUserById(existing.id, { password: body.password })
        }
        return json({ success: true, user: { id: existing.id, email: existing.email } })
      }

      case 'invite_link':
      case 'reset_link': {
        const { email } = body
        if (!email) return json({ error: 'email required' }, 400)
        // For an existing auth user, ensure it's not an admin / other customer.
        const existing = await findUserByEmail(email)
        if (existing) {
          const kind = await classify(existing.id, body.customerId)
          if (kind === 'admin') return json({ error: 'is_admin_account', code: 'is_admin_account' }, 409)
          if (kind === 'other') return json({ error: 'email_belongs_to_other_customer', code: 'email_in_use' }, 409)
        }
        const linkType = action === 'invite_link' ? (existing ? 'recovery' : 'invite') : 'recovery'
        const { data, error } = await admin.auth.admin.generateLink({
          type: linkType as 'invite' | 'recovery',
          email,
          options: redirectTo ? { redirectTo } : undefined,
        })
        if (error) return json({ error: error.message }, 400)
        const actionLink = data.properties?.action_link
        const userId = data.user?.id
        return json({ success: true, actionLink, user: userId ? { id: userId, email } : undefined })
      }

      case 'set_password': {
        const { userId, password } = body
        if (!userId) return json({ error: 'userId required' }, 400)
        const pwErr = requirePassword(password)
        if (pwErr) return json({ error: pwErr }, 400)
        if ((await classify(userId)) === 'admin') return json({ error: 'is_admin_account', code: 'is_admin_account' }, 409)
        const { error } = await admin.auth.admin.updateUserById(userId, { password })
        if (error) return json({ error: error.message }, 400)
        return json({ success: true })
      }

      case 'update_email': {
        const { userId, email } = body
        if (!userId || !email) return json({ error: 'userId and email required' }, 400)
        if ((await classify(userId)) === 'admin') return json({ error: 'is_admin_account', code: 'is_admin_account' }, 409)
        const clash = await findUserByEmail(email)
        if (clash && clash.id !== userId) return json({ error: 'email_in_use', code: 'email_in_use' }, 409)
        const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true })
        if (error) return json({ error: error.message }, 400)
        return json({ success: true })
      }

      case 'delete': {
        const { userId } = body
        if (!userId) return json({ error: 'userId required' }, 400)
        const kind = await classify(userId)
        if (kind === 'admin') return json({ error: 'is_admin_account', code: 'is_admin_account' }, 409)
        const { error } = await admin.auth.admin.deleteUser(userId)
        // Treat "not found" as success (idempotent).
        if (error && !/not.*found/i.test(error.message)) return json({ error: error.message }, 400)
        return json({ success: true })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error) {
    console.error('manage-portal-account error:', error)
    return json({ error: 'Internal server error' }, 500)
  }
})
