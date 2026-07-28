/**
 * Which tenant this build is, and nothing else.
 *
 * Split out of `config/tenant.ts` because that module imports the two logo PNGs,
 * which only a bundler with an asset loader can resolve. The PDF templates need
 * the tenant for their brand palette, and `InvoiceTemplate` is ALSO bundled into
 * the Vercel Node function (`api-src/render-invoice.tsx` -> `api/render-invoice.mjs`,
 * see `scripts/build-api.mjs`) that renders the invoice for the 24h auto-send.
 * Importing the full config there would pull in the PNGs and break the build.
 *
 * `import.meta.env.VITE_TENANT` is written out literally on purpose — it has to be
 * a plain member expression for BOTH substitutions to fire:
 *   - Vite replaces it in the browser build.
 *   - esbuild replaces it via `define` in the Node function build.
 * Optional chaining (`import.meta?.env?.VITE_TENANT`) would match neither pattern
 * and blow up at runtime in Node, where `import.meta.env` does not exist.
 */

export type TenantId = 'melek' | 'father'

function resolveTenantId(): TenantId {
  const raw = import.meta.env.VITE_TENANT
  return raw === 'father' ? 'father' : 'melek' // unset/unknown => Melek, never a broken build
}

export const tenantId: TenantId = resolveTenantId()
