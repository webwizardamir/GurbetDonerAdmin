// Bundles the Vercel render function (api-src/render-invoice.tsx) into a
// self-contained api/render-invoice.mjs, inlining the local template graph.
// node_modules (@react-pdf, @supabase, react) are kept EXTERNAL — they resolve
// from the Lambda's node_modules at runtime (verified working). This exists
// because @vercel/node does not bundle relative .tsx imports itself.
//
// Runs in the app build (`npm run build`) so the deployed function is always
// rebuilt from the current templates — no drift. Also runnable standalone:
//   npm run build:api
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const OUTFILE = 'api/render-invoice.mjs'

await build({
  entryPoints: ['api-src/render-invoice.tsx'],
  outfile: OUTFILE,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  jsx: 'automatic',
  // Keep node_modules external (they resolve at runtime on Vercel); inline only
  // the local template/formatting/label source.
  external: [
    '@react-pdf/renderer',
    '@supabase/supabase-js',
    'react',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
  ],
  logLevel: 'info',
})


// ---------------------------------------------------------------------------
// Guards. This function has no UI: when it breaks, the only symptom is mail
// that quietly stops arriving. It happened — a template imported a helper from
// a *service* module, which dragged src/services/supabase.ts (and its
// module-scope `import.meta.env` + `window`) into the Lambda, so the bundle
// threw on load and the endpoint 500'd for every caller: the 24h invoice mail,
// the monthly Betaaloverzicht and the Klantactiviteit attachment, all silently.
// A build that produces such a bundle must fail here instead.
// ---------------------------------------------------------------------------
const bundled = await readFile(OUTFILE, 'utf8')

// Anything Vite-only that survived the `define` above. Node has no
// `import.meta.env`, so reading it at module scope is a load-time TypeError.
const browserOnly = [...bundled.matchAll(/import\.meta\.env(?:\.[A-Za-z_$][\w$]*)?/g)]
  .map(m => m[0])
if (browserOnly.length > 0) {
  console.error(`\n✗ ${OUTFILE} still references browser-only globals: ${[...new Set(browserOnly)].join(', ')}`)
  console.error('  Something in the template graph imports a src/services/* or src/config/tenant module.')
  console.error('  Move the helper it needs into a DB-free module (see src/utils/customerActivity.ts).')
  process.exit(1)
}

// Catch-all: actually load the bundle the way the Lambda will. Any throw at
// module scope (a missing global, a side effect needing a browser) fails the
// build here rather than at 08:00 on a Monday.
try {
  await import(pathToFileURL(resolve(OUTFILE)).href)
} catch (err) {
  console.error(`\n✗ ${OUTFILE} throws when Node loads it — the deployed function would 500 on every request:`)
  console.error(`  ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
}

console.log(`✓ built ${OUTFILE} (loads clean in Node)`)
