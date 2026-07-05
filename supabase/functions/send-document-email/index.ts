// Supabase Edge Function: send-document-email
// Sends a document PDF (attached) via the Resend API and records the result
// in document_sends.
//
// Auth model:
//  - Caller authenticates with their normal user JWT (passed via Authorization
//    header). The function verifies the user is admin and inserts the audit
//    row under that user's identity (sent_by).
//  - The Resend API key is read from Deno.env.get('RESEND_API_KEY') — set it
//    once in Supabase Studio → Edge Functions → secrets. It never enters the
//    DB or client bundle.
//
// Payload shape:
//   {
//     order_id: UUID,
//     document_id: UUID | null,    // null = no documents row yet (rare)
//     document_type: 'invoice' | 'proforma' | 'credit_note' | 'packing_slip'
//                    | 'order_confirmation' | 'payment_reminder',
//     recipient_email: string,
//     bcc_email: string | null,
//     subject: string,
//     body: string,                 // plain text; rendered via simple <p> wrap
//     pdf_base64: string,           // base64-encoded PDF generated client-side
//     pdf_filename: string
//   }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SendRequest {
  order_id: string
  document_id: string | null
  document_type: string
  recipient_email: string
  bcc_email: string | null
  subject: string
  body: string
  pdf_base64: string
  pdf_filename: string
}

interface ResendResponse {
  id?: string
  message?: string
  name?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY secret is not set on this edge function' }, 500)
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') ||
      'info@melekhalalfood.nl'  // set the real sender as a secret on the function

    // 1. Verify caller identity using their user JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return json({ error: 'unauthorized' }, 401)
    }

    // 2. Check admin role
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || (profile.role !== 'owner' && profile.role !== 'shop_manager')) {
      return json({ error: 'forbidden: admin only' }, 403)
    }

    // 3. Validate payload
    const payload = await req.json() as SendRequest
    const required: (keyof SendRequest)[] = [
      'order_id', 'document_type', 'recipient_email', 'subject', 'body',
      'pdf_base64', 'pdf_filename',
    ]
    for (const f of required) {
      if (!payload[f]) return json({ error: `missing field: ${f}` }, 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient_email)) {
      return json({ error: 'invalid recipient_email' }, 400)
    }

    // 4. Insert pending audit row first — so we have a record even if Resend errors
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    // Company branding for the email shell (logo + footer). Non-fatal: a missing
    // row just yields a name-only header.
    const { data: brand } = await admin
      .from('document_settings')
      .select('company_name, company_logo_url, company_address, company_postal_code, company_city, company_country, company_phone, company_email, company_website, company_vat_number, company_kvk_number, bank_iban, bank_account_holder')
      .limit(1)
      .maybeSingle()
    const { data: sendRow, error: insertErr } = await admin
      .from('document_sends')
      .insert({
        document_id: payload.document_id,
        order_id: payload.order_id,
        document_type: payload.document_type,
        recipient_email: payload.recipient_email,
        bcc_email: payload.bcc_email,
        subject: payload.subject,
        body: payload.body,
        status: 'pending',
        sent_by: user.id,
      })
      .select('id')
      .single()

    if (insertErr || !sendRow) {
      return json({ error: `failed to log send: ${insertErr?.message ?? 'unknown'}` }, 500)
    }
    const sendId = sendRow.id

    // 5. Call Resend
    const resendBody: Record<string, unknown> = {
      from: FROM_ADDRESS,
      to: [payload.recipient_email],
      subject: payload.subject,
      // Branded, email-client-safe HTML shell (logo header + company footer).
      html: buildBrandedEmailHtml(payload.body, brand ?? {}),
      attachments: [{
        filename: payload.pdf_filename,
        content: payload.pdf_base64,
      }],
    }
    if (payload.bcc_email) resendBody.bcc = [payload.bcc_email]

    let resendData: ResendResponse | null = null
    let resendErr: string | null = null
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendBody),
      })
      resendData = await r.json() as ResendResponse
      if (!r.ok) {
        resendErr = resendData.message || resendData.name || `Resend returned ${r.status}`
      }
    } catch (e) {
      resendErr = (e as Error).message
    }

    // 6. Update the audit row with the outcome
    const updatePayload = resendErr
      ? { status: 'failed', error_message: resendErr }
      : { status: 'sent', resend_message_id: resendData?.id ?? null, sent_at: new Date().toISOString() }

    await admin.from('document_sends').update(updatePayload).eq('id', sendId)

    if (resendErr) {
      return json({ error: resendErr, send_id: sendId }, 502)
    }
    return json({ send_id: sendId, resend_message_id: resendData?.id ?? null }, 200)
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

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// ===========================================================================
// Branded HTML email shell.
// DUPLICATED (kept in sync) with apps/admin/src/utils/emailHtml.ts and
// supabase/functions/process-invoice-reminders/index.ts. Change all three
// together so the Outbox preview matches what customers receive.
// ===========================================================================

interface EmailBrandSettings {
  company_name?: string | null
  company_logo_url?: string | null
  company_address?: string | null
  company_postal_code?: string | null
  company_city?: string | null
  company_country?: string | null
  company_phone?: string | null
  company_email?: string | null
  company_website?: string | null
  company_vat_number?: string | null
  company_kvk_number?: string | null
  bank_iban?: string | null
  bank_account_holder?: string | null
}

function joinParts(parts: Array<string | null | undefined>, sep: string): string {
  return parts.filter((p) => p && String(p).trim()).join(sep)
}

function buildBrandedEmailHtml(body: string, s: EmailBrandSettings = {}): string {
  const BRAND = '#16a34a', BRAND_DARK = '#166534', INK = '#1e293b', MUTED = '#64748b', LINE = '#e2e8f0', CANVAS = '#f1f5f9'
  const company = (s.company_name || '').trim() || 'Melek Halal Food'

  const header = s.company_logo_url
    ? `<img src="${escapeHtml(s.company_logo_url)}" alt="${escapeHtml(company)}" width="150" style="display:block;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(company)}</span>`

  const addressLine = joinParts([s.company_address, joinParts([joinParts([s.company_postal_code, s.company_city], ' '), s.company_country], ', ')], ', ')
  const contactLine = joinParts([
    s.company_phone ? `Tel: ${escapeHtml(s.company_phone)}` : '',
    s.company_email ? escapeHtml(s.company_email) : '',
    s.company_website ? escapeHtml(s.company_website.replace(/^https?:\/\//, '')) : '',
  ], ' &nbsp;•&nbsp; ')
  const legalLine = joinParts([
    s.company_vat_number ? `BTW: ${escapeHtml(s.company_vat_number)}` : '',
    s.company_kvk_number ? `KvK: ${escapeHtml(s.company_kvk_number)}` : '',
  ], ' &nbsp;•&nbsp; ')
  const ibanLine = s.bank_iban
    ? `IBAN: ${escapeHtml(s.bank_iban)}${s.bank_account_holder ? ` &nbsp;•&nbsp; t.n.v. ${escapeHtml(s.bank_account_holder)}` : ''}`
    : ''

  const footerRows = [addressLine, contactLine, legalLine, ibanLine]
    .filter(Boolean)
    .map((line) => `<tr><td style="padding:1px 0;font-size:11px;line-height:1.5;color:${MUTED};">${line}</td></tr>`)
    .join('')

  const bodyHtml = escapeHtml(body).replace(/\r?\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(company)}</title>
</head>
<body style="margin:0;padding:0;background-color:${CANVAS};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE};">
<tr>
<td style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});background-color:${BRAND};padding:22px 28px;">
${header}
</td>
</tr>
<tr>
<td style="padding:28px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${INK};">
${bodyHtml}
</td>
</tr>
<tr>
<td style="padding:20px 28px 0 28px;">
<div style="height:1px;background-color:${LINE};line-height:1px;font-size:0;">&nbsp;</div>
</td>
</tr>
<tr>
<td style="padding:14px 28px 24px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 0 4px 0;font-size:13px;font-weight:700;color:${INK};">${escapeHtml(company)}</td></tr>
${footerRows}
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`
}
