// Vercel Node serverless function — renders an order's invoice PDF from its
// stored snapshot and returns it as base64. STATELESS: no DB writes, no email.
//
// Why this exists: the manual "Send" button attaches a PDF because the browser
// renders it with @react-pdf. The automated sends (24h initial invoice + the
// overdue reminders) run on Supabase's Deno cron, which CANNOT run @react-pdf.
// This Node function is the "PDF engine" the edge function calls to attach the
// real invoice PDF. It reads the invoice document's snapshot (the same
// InvoiceData the browser renders from, kept in sync on every save) and renders
// the exact same template, so the output is identical to a manual download.
//
// Auth: shared secret header `X-Render-Secret` === env RENDER_SECRET.
// Env (set on Vercel): RENDER_SECRET, SUPABASE_SERVICE_ROLE_KEY, and (optional)
// SUPABASE_URL — falls back to the app's existing VITE_SUPABASE_URL.
//
// Implementation note: ALL heavy deps (@supabase, @react-pdf, the templates) are
// imported DYNAMICALLY inside a try/catch so that any module-load or render error
// surfaces as a readable JSON 500 instead of an opaque Vercel
// FUNCTION_INVOCATION_FAILED. Types are kept loose to avoid a build-time
// @vercel/node dependency (this file is built by Vercel's function pipeline, not
// the app's tsc — tsconfig include is ["src"]).

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const secret = process.env.RENDER_SECRET
  if (!secret || req.headers['x-render-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
    const orderId = String(body.orderId ?? '')
    if (!orderId) return res.status(400).json({ error: 'missing orderId' })

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({ error: 'supabase env not configured (need SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL/VITE_SUPABASE_URL)' })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Latest invoice document for the order — its snapshot is the current invoice
    // (refreshOrderDocumentSnapshots keeps it in sync with edits).
    const { data: doc, error } = await admin
      .from('documents')
      .select('document_number, snapshot')
      .eq('order_id', orderId)
      .eq('document_type', 'invoice')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return res.status(500).json({ error: `db: ${error.message}` })
    if (!doc?.snapshot) return res.status(404).json({ error: 'no invoice snapshot for order' })

    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { getDocumentTemplate } = await import('../src/components/documents/getDocumentTemplate')

    const element = getDocumentTemplate('invoice', doc.snapshot as never)
    const buffer = await renderToBuffer(element as never)
    const pdf_base64 = Buffer.from(buffer).toString('base64')
    const filename = `Factuur-${doc.document_number ?? orderId}.pdf`
    return res.status(200).json({ pdf_base64, filename })
  } catch (e) {
    // Surface the real cause (module-load or render failure) so it can be
    // diagnosed from the HTTP response instead of an opaque 500.
    const err = e as Error
    return res.status(500).json({ error: `render failed: ${err?.message ?? String(e)}`, stack: err?.stack ?? null })
  }
}
