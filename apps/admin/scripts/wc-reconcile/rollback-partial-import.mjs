// Emergency rollback: delete the orphan orders created during a failed import.
// Reads sb_order_id from the latest import audit CSV and deletes each.
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy && !proxy.startsWith('socks')) setGlobalDispatcher(new ProxyAgent(proxy))

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const auditFile = process.argv[2] || resolve('migration-data', 'import-missing-orders-2026-04-20.csv')
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

const ids = lines.map(parseRow).map(r => r[idx('sb_order_id')]).filter(Boolean)
console.log(`Deleting ${ids.length} orphan orders ...`)
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100)
  const { error, count } = await sb.from('orders').delete().in('id', batch).select('id', { count: 'exact' })
  if (error) { console.error(error); process.exit(1) }
  process.stdout.write(`  deleted so far: ${Math.min(i + 100, ids.length)}\r`)
}
console.log(`\nDone.`)
