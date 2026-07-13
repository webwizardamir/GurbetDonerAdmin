// PUBLIC edge function: self-service portal login code request.
// A customer enters their email; if it matches an ACTIVE customer we auto-provision
// their portal account (once) and email them a 6/8-digit OTP (branded, via Resend).
// The client then calls portalSupabase.auth.verifyOtp({email, token, type:'email'}).
//
// Deploy with: supabase functions deploy portal-request-code --no-verify-jwt
// Env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY,
//      RESEND_FROM_ADDRESS, ALLOWED_ORIGIN.
//
// SECURITY (see plan / two code reviews):
//  - Enumeration-safe: constant-time generic 200 + background provision/send.
//  - portal_login_resolve (migration 00083) does the customer lookup atomically &
//    injection-safely (auth.users email index, staff guard, ACTIVE-link-first so a
//    customer whose portal email != customers.email still logs in). No ilike, no
//    O(n) listUsers scan.
//  - Rate limit: portal_login_can_send (per-email) up front; portal_login_consume_global
//    (whole-endpoint daily cap) consumed ONLY on a real send, so probes can't lock
//    real customers out.
//  - INSERT-ONLY on customer_accounts (status 'revoked' from resolve stops a revoked
//    account being re-activated). Sets the email column (owner reset links need it).
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
const SENT_MSG = 'Als dit e-mailadres bij ons bekend is, hebben we een inlogcode gestuurd.'
const RATE_MSG = 'U heeft recent een code aangevraagd. Wacht een moment en probeer het opnieuw.'

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const started = Date.now()
  const floored = async (payload: Record<string, unknown>) => {
    const elapsed = Date.now() - started
    if (elapsed < RESPONSE_FLOOR_MS) await sleep(RESPONSE_FLOOR_MS - elapsed)
    return json(payload, 200)
  }

  let email = ''
  try {
    const body = await req.json().catch(() => ({})) as { email?: string }
    email = normalizeEmail(body.email ?? '')
  } catch { /* fallthrough */ }

  if (!isValidEmail(email)) return floored({ ok: true, message: SENT_MSG })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })

  // Per-email rate limit (keyed on the normalized email; same for customer & non).
  const { data: allowed, error: rlErr } = await admin.rpc('portal_login_can_send', { p_email: email })
  if (rlErr) return floored({ ok: true, message: SENT_MSG })
  // Rate-limited signal reflects ONLY the per-email limit (not customer existence),
  // so surfacing it is enumeration-safe and prevents a false "code sent" on resends.
  if (allowed !== true) return floored({ ok: true, rateLimited: true, message: RATE_MSG })

  const work = provisionAndSend(admin, email).catch((e) => {
    console.error('[portal-request-code] background error:', (e as Error)?.message ?? 'unknown')
  })
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work)
  else void work

  return floored({ ok: true, message: SENT_MSG })
})

// deno-lint-ignore no-explicit-any
async function provisionAndSend(admin: any, email: string): Promise<void> {
  // One atomic, injection-safe resolve: who (if anyone) may get a code.
  const { data: rows } = await admin.rpc('portal_login_resolve', { p_email: email })
  const r = (Array.isArray(rows) ? rows[0] : rows) as
    | { status: string; customer_id: string; company_name: string; billing_country: string | null; auth_user_id: string | null; needs_provision: boolean }
    | undefined
  if (!r || r.status !== 'ok') return // 'none' | 'staff' | 'revoked'

  const customerId = r.customer_id
  let userId: string | null = r.auth_user_id

  if (r.needs_provision) {
    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: r.company_name || email },
      })
      if (createErr || !created?.user) {
        // Race: user created concurrently — re-resolve to pick up the id.
        const { data: rows2 } = await admin.rpc('portal_login_resolve', { p_email: email })
        const r2 = (Array.isArray(rows2) ? rows2[0] : rows2) as typeof r
        if (!r2 || r2.status !== 'ok' || !r2.auth_user_id) return
        userId = r2.auth_user_id
      } else {
        userId = created.user.id
      }
    }
    if (!userId) return
    // INSERT the active link (email set — owner reset/relink reads it). A dup on the
    // unique(customer_id/user_id) constraint means a concurrent run won the race; the
    // link exists, so continue to send.
    const { error: linkErr } = await admin
      .from('customer_accounts')
      .insert({ customer_id: customerId, user_id: userId, email, is_active: true })
    if (!linkErr) {
      await admin.from('audit_logs').insert({
        user_email: email,
        action: 'portal_self_provision',
        entity_type: 'customer_accounts',
        entity_id: customerId,
        new_values: { customer_id: customerId, user_id: userId },
      })
    }
  }
  if (!userId) return

  // Consume the global daily send budget ONLY now that we're actually emailing a
  // real customer (probes never reach here, so they can't trip the breaker).
  const { data: gOk } = await admin.rpc('portal_login_consume_global')
  if (gOk !== true) return

  const { data: linkData, error: linkGenErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const otp = linkData?.properties?.email_otp as string | undefined
  if (linkGenErr || !otp) return

  await sendCodeEmail(admin, email, r.company_name ?? '', r.billing_country ?? null, otp)
}

// deno-lint-ignore no-explicit-any
async function sendCodeEmail(admin: any, recipient: string, companyName: string, billingCountry: string | null, code: string): Promise<void> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') || 'debiteuren@melekhalalfood.nl'
  if (!RESEND_API_KEY) return

  const { data: settings } = await admin
    .from('document_settings')
    .select('company_name, company_logo_url, company_address, company_postal_code, company_city, company_country, company_phone, company_email, company_website, company_vat_number, company_kvk_number, bank_iban, bank_account_holder')
    .limit(1).maybeSingle()
  const brand = (settings ?? {}) as Record<string, unknown>
  const company = String(brand.company_name || '').trim() || 'Melek Halal Food'

  const lang = resolveLang(billingCountry)
  const name = companyName || ''
  const subject = lang === 'nl' ? 'Uw inlogcode voor het klantenportaal' : 'Your customer portal login code'
  const body = lang === 'nl'
    ? `Beste ${name},\n\nUw inlogcode voor het klantenportaal is:\n\n${code}\n\nVoer deze code in op de inlogpagina. De code is enkele minuten geldig en kan één keer worden gebruikt. Heeft u deze niet aangevraagd? Dan kunt u deze e-mail negeren.\n\nMet vriendelijke groet,\n${company}`
    : `Dear ${name},\n\nYour login code for the customer portal is:\n\n${code}\n\nEnter this code on the login page. It is valid for a few minutes and can be used once. Didn't request it? You can ignore this email.\n\nKind regards,\n${company}`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [recipient], subject, html: buildBrandedEmailHtml(body, brand) }),
    })
  } catch (e) {
    console.error('[portal-request-code] resend error:', (e as Error)?.message ?? 'unknown')
  }
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
