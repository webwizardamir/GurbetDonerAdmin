// SOURCE for the Vercel render function. This file is NOT deployed directly —
// scripts/build-api.mjs esbuild-bundles it into `api/render-invoice.mjs` (the
// actual deployed function).
//
// Why the build step: Vercel's @vercel/node compiles only the entry file and
// leaves relative imports as runtime ESM resolution. Our templates live in
// ../src as uncompiled .tsx, so a direct import fails at runtime
// (ERR_MODULE_NOT_FOUND). Pre-bundling inlines the local template graph while
// keeping node_modules (@react-pdf, @supabase, react) external — those resolve
// fine from the Lambda's node_modules at runtime.
//
// It renders the invoice PDF from the order's stored snapshot (the same
// InvoiceData the browser renders from), so the output is identical to a manual
// download. Stateless: no DB writes, no email.
//
// Auth: X-Render-Secret header === env RENDER_SECRET.
// Env (Vercel): RENDER_SECRET, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_URL
// (falls back to the app's existing VITE_SUPABASE_URL).

import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { getDocumentTemplate } from '../src/components/documents/getDocumentTemplate'
import type { InvoiceData } from '../src/services/documents'

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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
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

    const element = getDocumentTemplate('invoice', doc.snapshot as InvoiceData)
    const buffer = await renderToBuffer(element as never)
    const pdf_base64 = Buffer.from(buffer).toString('base64')
    const filename = `Factuur-${doc.document_number ?? orderId}.pdf`
    return res.status(200).json({ pdf_base64, filename })
  } catch (e) {
    // Never return the stack to the caller — it leaks bundle paths and internals
    // over a public HTTPS endpoint. Log it instead; Vercel captures the output.
    const err = e as Error
    console.error('render-invoice failed:', err?.stack ?? err)
    return res.status(500).json({ error: `render failed: ${err?.message ?? String(e)}` })
  }
}
