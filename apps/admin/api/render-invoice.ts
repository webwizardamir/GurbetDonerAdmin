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
// Env (set on Vercel): RENDER_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// NB: only apps/admin/src is type-checked by the app build (tsconfig include:
// ["src"]); this file is built by Vercel's function pipeline, which provides
// @vercel/node and bundles the imported templates (all Node-safe — they import
// only @react-pdf, pure label maps and Intl-based formatters).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { getDocumentTemplate } from '../src/components/documents/getDocumentTemplate'
import type { InvoiceData } from '../src/services/documents'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const secret = process.env.RENDER_SECRET
  if (!secret || req.headers['x-render-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const orderId = (req.body?.orderId ?? '') as string
  if (!orderId) return res.status(400).json({ error: 'missing orderId' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'supabase env not configured' })
  }

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

  if (error) return res.status(500).json({ error: error.message })
  if (!doc?.snapshot) return res.status(404).json({ error: 'no invoice snapshot for order' })

  try {
    const element = getDocumentTemplate('invoice', doc.snapshot as InvoiceData)
    const buffer = await renderToBuffer(element)
    const pdf_base64 = Buffer.from(buffer).toString('base64')
    const filename = `Factuur-${doc.document_number ?? orderId}.pdf`
    return res.status(200).json({ pdf_base64, filename })
  } catch (e) {
    return res.status(500).json({ error: `render failed: ${(e as Error).message}` })
  }
}
