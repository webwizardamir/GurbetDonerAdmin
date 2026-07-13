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

await build({
  entryPoints: ['api-src/render-invoice.tsx'],
  outfile: 'api/render-invoice.mjs',
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

console.log('✓ built api/render-invoice.mjs')
