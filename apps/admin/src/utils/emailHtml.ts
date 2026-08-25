// Branded HTML email shell.
//
// Wraps a plain-text email body (the {{placeholder}}-rendered message stored in
// document_sends.body) in a professional, email-client-safe HTML layout: a
// green header bar with the company logo, the typeset message, and a company /
// contact / IBAN footer.
//
// IMPORTANT — this builder is DUPLICATED, verbatim in behaviour, inside the two
// edge functions that actually send mail (they run on Deno and cannot import
// from the app):
//   - supabase/functions/send-document-email/index.ts
//   - supabase/functions/process-invoice-reminders/index.ts
// The app copy is used only to PREVIEW a sent message in the Outbox. If you
// change the markup here, mirror it in both edge functions so the preview keeps
// matching what customers actually received.

export interface EmailBrandSettings {
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

const BRAND = '#16a34a'
const BRAND_DARK = '#166534'
const INK = '#1e293b'
const MUTED = '#64748b'
const LINE = '#e2e8f0'
const CANVAS = '#f1f5f9'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Plain-text body → safe HTML: escape, then newlines become <br>. */
function bodyToHtml(body: string): string {
  return escapeHtml(body).replace(/\r?\n/g, '<br>')
}

/** Join non-empty parts with a separator. */
function join(parts: Array<string | null | undefined>, sep: string): string {
  return parts.filter((p) => p && String(p).trim()).join(sep)
}

export function buildBrandedEmailHtml(body: string, s: EmailBrandSettings = {}): string {
  const company = (s.company_name || '').trim() || 'Gurbet Doner'

  // Header: logo if we have one, otherwise the company name in white.
  //
  // Sizing is HEIGHT-first, capped on both axes — the same reasoning as the PDF
  // header (see components/documents/logoMetrics.ts). It used to be `width="150"`
  // alone, which is a WIDE slot: a square logo (Gurbet's is 720x682) rendered
  // 150x142 and turned the header band into a giant tile. With `max-height:70px`
  // + `max-width:150px` the browser shrinks to satisfy BOTH while preserving the
  // aspect ratio, so a wide logo is unchanged (Melek 500x232 -> 150x70, exactly
  // what it was) and a square one lands at ~74x70.
  //
  // The `height` ATTRIBUTE is there for Outlook desktop, whose Word engine
  // ignores max-width/max-height; given one dimension it scales the other
  // proportionally. Do NOT re-add a `width` attribute next to it — two fixed
  // attributes is how a non-wide logo gets stretched there.
  const header = s.company_logo_url
    ? `<img src="${escapeHtml(s.company_logo_url)}" alt="${escapeHtml(company)}" height="70" style="display:block;height:auto;max-height:70px;width:auto;max-width:150px;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(company)}</span>`

  // Footer lines.
  const addressLine = join(
    [s.company_address, join([join([s.company_postal_code, s.company_city], ' '), s.company_country], ', ')],
    ', ',
  )
  const contactLine = join(
    [
      s.company_phone ? `Tel: ${escapeHtml(s.company_phone)}` : '',
      s.company_email ? escapeHtml(s.company_email) : '',
      s.company_website ? escapeHtml(s.company_website.replace(/^https?:\/\//, '')) : '',
    ],
    ' &nbsp;•&nbsp; ',
  )
  const legalLine = join(
    [
      s.company_vat_number ? `BTW: ${escapeHtml(s.company_vat_number)}` : '',
      s.company_kvk_number ? `KvK: ${escapeHtml(s.company_kvk_number)}` : '',
    ],
    ' &nbsp;•&nbsp; ',
  )
  const ibanLine = s.bank_iban
    ? `IBAN: ${escapeHtml(s.bank_iban)}${s.bank_account_holder ? ` &nbsp;•&nbsp; t.n.v. ${escapeHtml(s.bank_account_holder)}` : ''}`
    : ''

  const footerRows = [addressLine, contactLine, legalLine, ibanLine]
    .filter(Boolean)
    .map(
      (line) =>
        `<tr><td style="padding:1px 0;font-size:11px;line-height:1.5;color:${MUTED};">${line}</td></tr>`,
    )
    .join('')

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
<!-- Header bar -->
<tr>
<td style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});background-color:${BRAND};padding:22px 28px;">
${header}
</td>
</tr>
<!-- Body -->
<tr>
<td style="padding:28px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${INK};">
${bodyToHtml(body)}
</td>
</tr>
<!-- Divider -->
<tr>
<td style="padding:20px 28px 0 28px;">
<div style="height:1px;background-color:${LINE};line-height:1px;font-size:0;">&nbsp;</div>
</td>
</tr>
<!-- Footer -->
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
