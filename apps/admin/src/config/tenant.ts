import logoMelek from '../assets/images/logo-melek.png'
import logoGurbet from '../assets/images/Gurbet-Doner-Logo.png'

/**
 * Multi-tenant config.
 *
 * The same `apps/admin` source is deployed twice (one Vercel project each,
 * pointing at its OWN Supabase project -- no shared data). Everything that
 * differs between the two lives here, driven by `VITE_TENANT`. Do NOT branch on
 * the tenant inside components: add a field here instead, otherwise we recreate
 * the double-maintenance problem this whole setup exists to avoid.
 *
 * See SECOND-TENANT-PLAN.md.
 */

export type TenantId = 'melek' | 'father'

export interface TenantConfig {
  id: TenantId
  /** Product name shown in the UI + browser tab. */
  name: string
  /** Sidebar / login logo. */
  logo: string
  /** `alt` text for the logo. */
  logoAlt: string
  /**
   * Feature switches. These are UX-level only -- every one of them is ALSO
   * enforced server-side (analytics cost/profit columns are gated behind
   * `is_owner()` in the RPCs), so flipping one here never grants access.
   */
  features: {
    analytics: boolean
  }
}

const TENANTS: Record<TenantId, TenantConfig> = {
  melek: {
    id: 'melek',
    name: 'Melek Halal Food',
    logo: logoMelek,
    logoAlt: 'Melek Halal Food',
    features: {
      analytics: true,
    },
  },
  father: {
    id: 'father',
    name: 'Gurbet Doner',
    logo: logoGurbet,
    logoAlt: 'Gurbet Doner',
    features: {
      // Hidden at launch by client request. Owner-gated server-side regardless.
      analytics: false,
    },
  },
}

function resolveTenantId(): TenantId {
  const raw = import.meta.env.VITE_TENANT
  return raw === 'father' ? 'father' : 'melek' // unset/unknown => Melek, never a broken build
}

export const tenant: TenantConfig = TENANTS[resolveTenantId()]

/** Convenience: `isFeatureEnabled('analytics')`. */
export function isFeatureEnabled(feature: keyof TenantConfig['features']): boolean {
  return tenant.features[feature]
}

/**
 * Stamps the tenant onto <html> so the CSS in index.css can repaint the brand
 * palette, and sets the tab title. Called once from main.tsx, before render.
 */
export function applyTenant(): void {
  document.documentElement.setAttribute('data-tenant', tenant.id)
  document.title = tenant.name
}
