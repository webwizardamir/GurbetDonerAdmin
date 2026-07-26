// Fails the build if dist/index.html contains an inline <script> whose sha256
// is not whitelisted in vercel.json's Content-Security-Policy.
//
// WHY THIS EXISTS: the CSP deliberately has no 'unsafe-inline' in script-src —
// that is a real XSS mitigation on an app that renders customer data and holds
// financial records, and it must not be weakened to make a script work. But
// index.html needs ONE inline script: the pre-paint theme bootstrap, which has
// to run before first paint (an external <script src> would cost a blocking
// request on every load, and a module script is deferred, so both defeat the
// point). CSP's answer to that is a hash.
//
// A hash is a two-file invariant, and two-file invariants drift. This one drifts
// SILENTLY-ISH: the page still works, the browser just logs a CSP violation and
// the dark-mode flash quietly comes back. That is exactly how it broke the first
// time. So the build asserts it instead of a comment asking someone to remember.
//
// Editing index.html's inline script? Run `npm run build`, copy the hash this
// prints, paste it into vercel.json. Nothing else to do.
//
// Reads dist/, not src/, because the built HTML is what actually ships and what
// the browser hashes — if a future Vite version rewrites inline scripts, this
// catches it.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))

const csp = vercel.headers
  ?.flatMap(h => h.headers ?? [])
  .find(h => h.key.toLowerCase() === 'content-security-policy')?.value

if (!csp) {
  console.error('✗ CSP check: no Content-Security-Policy header found in vercel.json.')
  process.exit(1)
}

// Inline == a <script> with no src attribute. Matches the browser's own rule for
// when a hash/nonce is required.
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
const missing = []

for (const [, body] of inline) {
  // Hashed over the exact bytes between the tags — no trimming. Whitespace is
  // part of the hash, which is why an innocent re-indent breaks it.
  const hash = `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`
  if (!csp.includes(hash)) missing.push({ hash, preview: body.trim().split('\n')[0].slice(0, 60) })
}

if (missing.length) {
  console.error(`\n✗ CSP check: ${missing.length} inline script(s) in dist/index.html are not whitelisted.`)
  console.error("  They will be BLOCKED in production. Add each hash to script-src in apps/admin/vercel.json:\n")
  for (const m of missing) console.error(`    '${m.hash}'   // ${m.preview}...`)
  console.error('')
  process.exit(1)
}

console.log(`✓ CSP check: ${inline.length} inline script(s) whitelisted`)
