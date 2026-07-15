// Supabase Edge Function: sync-email-status
//
// WHY: when we send via Resend (send-document-email / process-invoice-reminders)
// the API returns 200 + a message id synchronously, so document_sends.status is
// written as 'sent'. The REAL outcome — delivered, bounced, complained, or
// account-level *suppressed* — only happens afterwards and is never reflected.
// This job polls Resend's GET /emails/{id} for recent 'sent' rows and writes the
// true delivery status (+ a human reason) back into document_sends.
//
// AUTH (verify_jwt=false — deploy with --no-verify-jwt):
//   - Cron calls it with the X-Reminder-Cron-Secret header (reuses the existing
//     REMINDER_CRON_SECRET — no new secret to configure), OR
//   - An admin user calls it from the Outbox "Refresh status" button with their
//     JWT (verified in-code, owner/shop_manager only).
//
// READ KEY (required — the one thing to configure): the normal RESEND_API_KEY is
// typically "sending access" only and CANNOT read delivery status (GET /emails
// returns 401 restricted_api_key). Create a Resend "Full access" key and set it
// as the RESEND_READ_API_KEY edge secret. We use it only for the status reads;
// the send-only key keeps sending. If it's missing we fall back to
// RESEND_API_KEY and report readKeyRestricted so the UI can prompt the owner.
//
// BODY (optional): { days?: number, limit?: number }
//   days  — how far back to look (default 7, max 180). A wide value backfills.
//   limit — max rows to check per run (default 200, max 500).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-reminder-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Resend's `last_event` → our document_sends.status.
// Anything not listed (sent/queued/scheduled/delivery_delayed) stays 'sent' and
// gets re-checked next run.
function mapEvent(lastEvent: string): { status: string; reason: string | null } | null {
  switch (lastEvent) {
    case 'delivered':
    case 'opened':
    case 'clicked':
      return { status: 'delivered', reason: null }
    case 'bounced':
      return { status: 'bounced', reason: 'Bounced: the mail server rejected delivery.' }
    case 'complained':
      return { status: 'complained', reason: 'Marked as spam by the recipient.' }
    case 'suppressed':
      return { status: 'suppressed', reason: 'On the Resend account-level suppression list (prior bounce/complaint) — not delivered.' }
    case 'failed':
    case 'canceled':
      return { status: 'failed', reason: `Resend reported the email as ${lastEvent}.` }
    default:
      return null // sent / queued / scheduled / delivery_delayed → leave as-is
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY secret is not set' }, 500)
    // Full-access key for status reads; falls back to the send key (which will
    // 401 if it's send-only — reported as readKeyRestricted below).
    const READ_KEY = Deno.env.get('RESEND_READ_API_KEY') || RESEND_API_KEY

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const CRON_SECRET = Deno.env.get('REMINDER_CRON_SECRET')

    // --- Authorize: cron secret OR admin JWT ---
    const cronHeader = req.headers.get('X-Reminder-Cron-Secret')
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET
    if (!isCron) {
      const authHeader = req.headers.get('Authorization') ?? ''
      if (!authHeader) return json({ error: 'unauthorized' }, 401)
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (!user) return json({ error: 'unauthorized' }, 401)
      const { data: profile } = await userClient
        .from('profiles').select('role').eq('id', user.id).single()
      if (!profile || (profile.role !== 'owner' && profile.role !== 'shop_manager')) {
        return json({ error: 'forbidden: admin only' }, 403)
      }
    }

    // --- Params ---
    let body: { days?: number; limit?: number } = {}
    try { body = await req.json() } catch { /* empty body from cron */ }
    const days = Math.min(Math.max(Number(body.days) || 7, 1), 180)
    const limit = Math.min(Math.max(Number(body.limit) || 200, 1), 500)
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Only rows that were accepted but not yet resolved, and that carry a Resend id.
    const { data: rows, error: qErr } = await admin
      .from('document_sends')
      .select('id, resend_message_id, status')
      .eq('status', 'sent')
      .not('resend_message_id', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (qErr) return json({ error: `query failed: ${qErr.message}` }, 500)

    const targets = rows ?? []
    let updated = 0
    let readKeyRestricted = false
    const byStatus: Record<string, number> = {}

    // Poll Resend with small concurrency to respect rate limits.
    const CONCURRENCY = 5
    for (let i = 0; i < targets.length && !readKeyRestricted; i += CONCURRENCY) {
      const chunk = targets.slice(i, i + CONCURRENCY)
      await Promise.all(chunk.map(async (row) => {
        try {
          const r = await fetch(`https://api.resend.com/emails/${row.resend_message_id}`, {
            headers: { 'Authorization': `Bearer ${READ_KEY}` },
          })
          if (r.status === 401 || r.status === 403) {
            // The key can't read email status — configure RESEND_READ_API_KEY.
            readKeyRestricted = true
            return
          }
          if (!r.ok) return
          const data = await r.json() as { last_event?: string }
          const lastEvent = data.last_event ?? ''
          const mapped = mapEvent(lastEvent)
          if (!mapped || mapped.status === row.status) return
          const { error: uErr } = await admin
            .from('document_sends')
            .update({ status: mapped.status, error_message: mapped.reason })
            .eq('id', row.id)
          if (!uErr) {
            updated++
            byStatus[mapped.status] = (byStatus[mapped.status] ?? 0) + 1
          }
        } catch { /* transient — retried next run */ }
      }))
    }

    return json({ checked: targets.length, updated, byStatus, readKeyRestricted, days, limit }, 200)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
