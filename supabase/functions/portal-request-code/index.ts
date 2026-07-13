// PUBLIC edge function: self-service portal login code request.
// A customer enters their email; if it matches an ACTIVE customer we auto-provision
// their portal account (once) and email them a 6/8-digit OTP (branded, via Resend).
// The client then calls portalSupabase.auth.verifyOtp({email, token, type:'email'}).
//
// Deploy with: supabase functions deploy portal-request-code --no-verify-jwt
// Env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY,
//      RESEND_FROM_ADDRESS, ALLOWED_ORIGIN.
//
// SECURITY (see plan / security review):
//  - Enumeration-safe: ALWAYS returns the same generic 200; the customer lookup +
//    provision + send run in a BACKGROUND task after a fixed-time response, so a
//    customer vs non-customer email is indistinguishable by latency/behaviour.
//  - Rate limited atomically (portal_login_can_send RPC): per-email + global/day.
//  - INSERT-ONLY on customer_accounts: never re-activates a revoked (is_active=false)
//    account — revocation stays owner-only in manage-portal-account.
//  - classify()-before-mutate: never links a portal account over a STAFF or
//    other-customer auth user.
//  - Never logs/emails the OTP, action_link, or token_hash.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const RESPONSE_FLOOR_MS = 350
const GENERIC = { ok: true, message: 'Als dit e-mailadres bij ons bekend is, hebben we een inlogcode gestuurd.' }

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const started = Date.now()
  const respond = async () => {
    const elapsed = Date.now() - started
    if (elapsed < RESPONSE_FLOOR_MS) await sleep(RESPONSE_FLOOR_MS - elapsed)
    return json(GENERIC, 200)
  }

  let email = ''
  try {
    const body = await req.json().catch(() => ({})) as { email?: string }
    email = normalizeEmail(body.email ?? '')
  } catch { /* fallthrough to generic */ }

  // Invalid format → generic (do not reveal). No DB work.
  if (!isValidEmail(email)) return respond()

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Atomic rate-limit (keyed on the normalized email; same for customers & non).
  const { data: allowed, error: rlErr } = await admin.rpc('portal_login_can_send', { p_email: email })
  if (rlErr || allowed !== true) return respond()

  // Everything sensitive runs in the background so the response stays constant-time.
  const work = provisionAndSend(admin, email).catch((e) => {
    console.error('[portal-request-code] background error:', (e as Error)?.message ?? 'unknown')
  })
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work)
  else void work

  return respond()
})

// deno-lint-ignore no-explicit-any
async function provisionAndSend(admin: any, email: string): Promise<void> {
  // 1. Must map to exactly ONE active customer (0 or >1 → stop; no leak).
  const { data: customers } = await admin
    .from('customers')
    .select('id, company_name, email, billing_country, is_active')
    .ilike('email', email)
    .eq('is_active', true)
  const matches = (customers ?? []).filter((c: Record<string, unknown>) =>
    normalizeEmail(String(c.email ?? '')) === email)
  if (matches.length !== 1) return
  const customer = matches[0] as { id: string; company_name: string; email: string; billing_country: string | null }

  // 2. Ensure an ACTIVE portal link — INSERT-ONLY. Never reactivate a revoked one.
  const { data: existingLink } = await admin
    .from('customer_accounts')
    .select('user_id, is_active')
    .eq('customer_id', customer.id)
    .maybeSingle()

  let userId: string
  if (existingLink) {
    if (existingLink.is_active !== true) return // revoked → stop (owner-only reactivation)
    userId = existingLink.user_id as string
  } else {
    // No link yet. Find or create the auth user, guarding staff/other-customer.
    const existingUser = await findUserByEmail(admin, email)
    if (existingUser) {
      const kind = await classify(admin, existingUser.id, customer.id)
      if (kind === 'admin' || kind === 'other') return // never link over staff/other
      userId = existingUser.id
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: customer.company_name || email },
      })
      if (createErr || !created?.user) {
        // Race: user was created concurrently. Re-fetch and re-guard.
        const again = await findUserByEmail(admin, email)
        if (!again) return
        const kind = await classify(admin, again.id, customer.id)
        if (kind === 'admin' || kind === 'other') return
        userId = again.id
      } else {
        userId = created.user.id
      }
    }
    // INSERT the active link (unique on customer_id/user_id; ignore a race dup).
    const { error: linkErr } = await admin
      .from('customer_accounts')
      .insert({ customer_id: customer.id, user_id: userId, is_active: true })
    if (linkErr) {
      // Concurrent insert won the race — re-read and continue only if active.
      const { data: reread } = await admin
        .from('customer_accounts').select('is_active').eq('customer_id', customer.id).maybeSingle()
      if (!reread || reread.is_active !== true) return
    } else {
      await admin.from('audit_logs').insert({
        user_email: email,
        action: 'portal_self_provision',
        entity_type: 'customer_accounts',
        entity_id: customer.id,
        new_values: { customer_id: customer.id, user_id: userId },
      })
    }
  }

  // 3. Generate the OTP and email it (branded). Only ever send email_otp.
  const { data: linkData, error: linkGenErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const otp = linkData?.properties?.email_otp as string | undefined
  if (linkGenErr || !otp) return

  await sendCodeEmail(admin, customer, otp)
}

// deno-lint-ignore no-explicit-any
async function sendCodeEmail(admin: any, customer: { company_name: string; email: string; billing_country: string | null }, code: string): Promise<void> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') || 'debiteuren@melekhalalfood.nl'
  if (!RESEND_API_KEY) return

  const { data: settings } = await admin
    .from('document_settings')
    .select('company_name, company_logo_url, company_address, company_postal_code, company_city, company_country, company_phone, company_email, company_website, company_vat_number, company_kvk_number, bank_iban, bank_account_holder')
    .limit(1).maybeSingle()
  const brand = (settings ?? {}) as Record<string, unknown>
  const company = String(brand.company_name || '').trim() || 'Melek Halal Food'

  const lang = resolveLang(customer.billing_country)
  const name = customer.company_name || ''
  const subject = lang === 'nl'
    ? 'Uw inlogcode voor het klantenportaal'
    : 'Your customer portal login code'
  const body = lang === 'nl'
    ? `Beste ${name},\n\nUw inlogcode voor het klantenportaal is:\n\n${code}\n\nVoer deze code in op de inlogpagina. De code is enkele minuten geldig en kan één keer worden gebruikt. Heeft u deze niet aangevraagd? Dan kunt u deze e-mail negeren.\n\nMet vriendelijke groet,\n${company}`
    : `Dear ${name},\n\nYour login code for the customer portal is:\n\n${code}\n\nEnter this code on the login page. It is valid for a few minutes and can be used once. Didn't request it? You can ignore this email.\n\nKind regards,\n${company}`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [customer.email],
        subject,
        html: buildBrandedEmailHtml(body, brand),
      }),
    })
  } catch (e) {
    console.error('[portal-request-code] resend error:', (e as Error)?.message ?? 'unknown')
  }
}

// deno-lint-ignore no-explicit-any
async function findUserByEmail(admin: any, email: string) {
  const target = email.toLowerCase()
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u: { email?: string }) => (u.email || '').toLowerCase() === target)
    if (hit) return hit
    if (data.users.length < 200) return null
    page++
  }
}

// deno-lint-ignore no-explicit-any
async function classify(admin: any, userId: string, customerId: string): Promise<'admin' | 'orphan' | 'self' | 'other'> {
  const { data: prof } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (prof && ['owner', 'shop_manager', 'admin'].includes(prof.role)) return 'admin'
  const { data: acct } = await admin.from('customer_accounts').select('customer_id').eq('user_id', userId).maybeSingle()
  if (!acct) return 'orphan'
  return acct.customer_id === customerId ? 'self' : 'other'
}

function normalizeEmail(s: string): string { return String(s ?? '').trim().toLowerCase() }
function isValidEmail(s: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254 }
function resolveLang(country: string | null | undefined): 'nl' | 'en' {
  const code = (country || 'NL').trim().toUpperCase()
  return code === 'NL' || code === 'BE' ? 'nl' : 'en'
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }
function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// ===========================================================================
// Branded HTML email shell — DUPLICATED (keep in sync) with
// apps/admin/src/utils/emailHtml.ts and the other edge functions.
// ===========================================================================
function joinParts(parts: Array<unknown>, sep: string): string {
  return parts.filter((p) => p && String(p).trim()).map(String).join(sep)
}
function buildBrandedEmailHtml(body: string, s: Record<string, unknown>): string {
  const BRAND = '#16a34a', BRAND_DARK = '#166534', INK = '#1e293b', MUTED = '#64748b', LINE = '#e2e8f0', CANVAS = '#f1f5f9'
  const company = String(s.company_name || '').trim() || 'Melek Halal Food'
  const header = s.company_logo_url
    ? `<img src="${escapeHtml(String(s.company_logo_url))}" alt="${escapeHtml(company)}" width="150" style="display:block;max-width:150px;height:auto;border:0;" />`
    : `<span style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(company)}</span>`
  const addressLine = joinParts([s.company_address, joinParts([joinParts([s.company_postal_code, s.company_city], ' '), s.company_country], ', ')], ', ')
  const contactLine = joinParts([
    s.company_phone ? `Tel: ${escapeHtml(String(s.company_phone))}` : '',
    s.company_email ? escapeHtml(String(s.company_email)) : '',
    s.company_website ? escapeHtml(String(s.company_website).replace(/^https?:\/\//, '')) : '',
  ], ' &nbsp;•&nbsp; ')
  const legalLine = joinParts([
    s.company_vat_number ? `BTW: ${escapeHtml(String(s.company_vat_number))}` : '',
    s.company_kvk_number ? `KvK: ${escapeHtml(String(s.company_kvk_number))}` : '',
  ], ' &nbsp;•&nbsp; ')
  const ibanLine = s.bank_iban ? `IBAN: ${escapeHtml(String(s.bank_iban))}${s.bank_account_holder ? ` &nbsp;•&nbsp; t.n.v. ${escapeHtml(String(s.bank_account_holder))}` : ''}` : ''
  const footerRows = [addressLine, contactLine, legalLine, ibanLine].filter(Boolean).map((line) => `<tr><td style="padding:1px 0;font-size:11px;line-height:1.5;color:${MUTED};">${line}</td></tr>`).join('')
  const bodyHtml = escapeHtml(body).replace(/\r?\n/g, '<br>')
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body style="margin:0;padding:0;background-color:${CANVAS};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE};"><tr><td style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});background-color:${BRAND};padding:22px 28px;">${header}</td></tr><tr><td style="padding:28px 28px 8px 28px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${INK};">${bodyHtml}</td></tr><tr><td style="padding:20px 28px 0 28px;"><div style="height:1px;background-color:${LINE};font-size:0;">&nbsp;</div></td></tr><tr><td style="padding:14px 28px 24px 28px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 0 4px 0;font-size:13px;font-weight:700;color:${INK};">${escapeHtml(company)}</td></tr>${footerRows}</table></td></tr></table></td></tr></table></body></html>`
}
function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}
