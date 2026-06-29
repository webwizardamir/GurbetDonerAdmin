// Supabase Edge Function to permanently delete a staff user (service_role).
// Owner-gated. Mirrors create-user. Refuses to delete: yourself, a portal
// customer account, the last active owner, or a user who authored records
// (RESTRICT FKs) — those should be deactivated instead to preserve history.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the caller is an authenticated owner
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser()
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401)

    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()
    if (profileError || callerProfile?.role !== 'owner') {
      return json({ error: 'Only owners can delete users' }, 403)
    }

    const { userId } = await req.json()
    if (!userId) return json({ error: 'Missing required field: userId' }, 400)
    if (userId === caller.id) return json({ error: 'You cannot delete your own account' }, 400)

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Target must exist and be a staff account (portal customers are managed elsewhere)
    const { data: target, error: targetErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (targetErr || !target) return json({ error: 'User not found' }, 404)
    if (target.role === 'customer') {
      return json({ error: 'This is a customer/portal account — manage it from Portal Management.' }, 400)
    }

    // Never delete the last active owner
    if (target.role === 'owner') {
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'owner')
        .eq('is_active', true)
        .neq('id', userId)
      if (!count) return json({ error: 'Cannot delete the last owner.' }, 400)
    }

    // Refuse (with a clear message) when the user authored records
    const { data: blockers, error: blockErr } = await adminClient
      .rpc('staff_delete_blockers', { p_user_id: userId })
    if (blockErr) {
      console.error('blocker check failed:', blockErr)
      return json({ error: 'Could not verify whether this user can be deleted.' }, 500)
    }
    if (Array.isArray(blockers) && blockers.length > 0) {
      return json({
        error: `This user created records (${blockers.join(', ')}) and cannot be deleted. Deactivate the account instead to preserve history.`,
      }, 409)
    }

    // Deletes the auth user; cascades to the profiles row
    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId)
    if (delErr) {
      console.error('deleteUser failed:', delErr)
      return json({ error: delErr.message }, 400)
    }

    return json({ success: true }, 200)
  } catch (error) {
    console.error('Unexpected error:', error)
    return json({ error: 'Internal server error' }, 500)
  }
})
