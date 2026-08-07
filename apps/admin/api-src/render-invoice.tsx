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
import { PaymentOverviewTemplate } from '../src/components/documents/PaymentOverviewTemplate'
import { CustomerActivityTemplate } from '../src/components/documents/CustomerActivityTemplate'
import type { InvoiceData } from '../src/services/documents'
import type { PaymentOverviewData, CustomerActivityRow } from '../src/types'

// Three request shapes, discriminated by `type` (absent = invoice, for backward
// compatibility with the deployed cron):
//   { orderId }                                -> the order's invoice
//   { type: 'payment_overview', overviewId }   -> a monthly Betaaloverzicht
//   { type: 'customer_activity', digestId }    -> the daily Klantactiviteit digest
// All three render from a STORED SNAPSHOT, never from live data, so the PDF the
// cron attaches is byte-identical to the one the admin previews from the row.
//
// One handler rather than a second entry point: auth, the Supabase client and
// the error handling are shared, and scripts/build-api.mjs needs no change.

// Minimal structural types for the Vercel Node handler. @vercel/node is not a
// dependency here (the file is pre-bundled by scripts/build-api.mjs), so its
// VercelRequest/VercelResponse are unavailable — these cover what we use.
type ReqLike = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type ResLike = {
  status: (code: number) => ResLike
  json: (body: unknown) => void
  send: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const secret = process.env.RENDER_SECRET
  if (!secret || req.headers['x-render-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
    const type = String(body.type ?? 'invoice')

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({ error: 'supabase env not configured (need SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL/VITE_SUPABASE_URL)' })
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    if (type === 'payment_overview') {
      const overviewId = String(body.overviewId ?? '')
      if (!overviewId) return res.status(400).json({ error: 'missing overviewId' })

      const { data: row, error } = await admin
        .from('payment_overviews')
        .select('snapshot, period')
        .eq('id', overviewId)
        .maybeSingle()

      if (error) return res.status(500).json({ error: `db: ${error.message}` })
      if (!row?.snapshot) return res.status(404).json({ error: 'no snapshot for overview' })

      const data = row.snapshot as PaymentOverviewData
      const buffer = await renderToBuffer(
        (<PaymentOverviewTemplate data={data} />) as never
      )
      const pdf_base64 = Buffer.from(buffer).toString('base64')
      const safeName = (data.customer?.companyName ?? 'klant').replace(/[^\w-]+/g, '-')
      const filename = `Betaaloverzicht-${safeName}-${row.period}.pdf`
      return res.status(200).json({ pdf_base64, filename })
    }

    if (type === 'customer_activity') {
      const digestId = String(body.digestId ?? '')
      if (!digestId) return res.status(400).json({ error: 'missing digestId' })

      const { data: row, error } = await admin
        .from('customer_inactivity_digests')
        .select('snapshot, run_date')
        .eq('id', digestId)
        .maybeSingle()

      if (error) return res.status(500).json({ error: `db: ${error.message}` })
      if (!row?.snapshot) return res.status(404).json({ error: 'no snapshot for digest' })

      const buffer = await renderToBuffer(
        (<CustomerActivityTemplate data={{
          rows: row.snapshot as CustomerActivityRow[],
          runDate: String(row.run_date),
        }} />) as never
      )
      const pdf_base64 = Buffer.from(buffer).toString('base64')
      return res.status(200).json({ pdf_base64, filename: `Klantactiviteit-${row.run_date}.pdf` })
    }

    const orderId = String(body.orderId ?? '')
    if (!orderId) return res.status(400).json({ error: 'missing orderId' })

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
