// Finish the 12 dedup failures: reassign order_refund_items.product_id → primary,
// then delete the loser SB product.
// Reads the failure rows from the dedup audit CSV.

import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const auditFile = process.argv[2] || resolve('migration-data', 'dedup-products-2026-04-20.csv')
const raw = readFileSync(auditFile, 'utf8')
const [h, ...lines] = raw.trim().split('\n')
const cols = h.split(',')
const idx = (n) => cols.indexOf(n)
function parseRow(s) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < s.length; i++) { const c = s[i]
    if (q) { if (c === '"' && s[i+1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = '' } else cur += c }
  }
  out.push(cur); return out
}

const failures = lines.map(parseRow).filter(r => r[idx('action')] === 'merge_failed')
console.log(`Failures to finish: ${failures.length}`)

let done = 0, failed = 0
for (const r of failures) {
  const loserId = r[idx('sb_id')]
  const primaryId = r[idx('target_id')]

  // Reassign order_refund_items
  const { error: e1 } = await sb.from('order_refund_items').update({ product_id: primaryId }).eq('product_id', loserId)
  if (e1) { failed++; console.error(`  ${loserId}: refund_items update: ${e1.message}`); continue }

  // Now delete the loser
  const { error: e2 } = await sb.from('products').delete().eq('id', loserId)
  if (e2) { failed++; console.error(`  ${loserId}: delete: ${e2.message}`); continue }
  done++
  console.log(`  ✓ ${r[idx('sb_name')]} → ${r[idx('target_name')]}`)
}
console.log(`\nFinished: ${done}  still_failed: ${failed}`)
