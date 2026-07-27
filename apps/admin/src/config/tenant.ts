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

/** Every locale that ships in the bundle (`i18n/locales/*.json`). */
export type AppLanguage = 'nl' | 'en' | 'tr'

/**
 * The customer portal is CUSTOMER-facing and stays NL/EN for both tenants, so it
 * does not follow `TenantConfig.languages` -- Turkish was requested for the admin
 * dashboard only. Pass `scope="portal"` to LanguageSelector to get this list.
 *
 * Caveat worth knowing: i18next's active language is global to the origin. Staff
 * who pick Turkish in the admin and then open the portal in the SAME browser see
 * Turkish there too (the keys are translated). Real customers have their own
 * browser, so they only ever get what this list offers.
 */
export const PORTAL_LANGUAGES: readonly AppLanguage[] = ['nl', 'en']

export interface TenantConfig {
  id: TenantId
  /** Product name shown in the UI + browser tab. */
  name: string
  /** Sidebar / login logo. */
  logo: string
  /** `alt` text for the logo. */
  logoAlt: string
  /** Path to the favicon in /public. Swapped onto <link rel="icon"> at runtime. */
  favicon: string
  /**
   * Support address on the admin login screen. Optional: when a tenant has no
   * support mailbox we render plain text instead of a mailto, rather than
   * pointing their staff at ANOTHER tenant's inbox.
   */
  supportEmail?: string
  /** Same idea for the customer portal's "no account?" contact line. */
  portalContactEmail?: string
  /** Phone shown next to portalContactEmail. Omitted when unset. */
  portalContactPhone?: string
  /**
   * Dial string for portalContactPhone's tel: link. Kept separate because the
   * displayed national format ("071 200 1287") is not dialable internationally
   * -- stripping its spaces would drop the country code.
   */
  portalContactPhoneHref?: string
  /**
   * Languages offered in the ADMIN language switcher, in menu order. The first
   * entry is NOT a default -- `i18n` falls back to `nl` and the detector only
   * ever picks a language from this list, so a Turkish-language BROWSER on Melek
   * still gets Dutch. Staff opt in via the switcher, and it is remembered.
   */
  languages: readonly AppLanguage[]
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
    favicon: '/favicon.png',
    supportEmail: 'support@melekhalalfood.com',
    portalContactEmail: 'info@melekhalalfood.nl',
    portalContactPhone: '071 200 1287',
    portalContactPhoneHref: '+31712001287',
    languages: ['nl', 'en'],
    features: {
      analytics: true,
    },
  },
  father: {
    id: 'father',
    name: 'Gurbet Doner',
    logo: logoGurbet,
    logoAlt: 'Gurbet Doner',
    favicon: '/favicon-father.png',
    // No support/contact mailbox yet -- deliberately left unset so the UI omits
    // the link rather than sending his people to Melek's inbox. Fill in when he
    // has a business address.
    // Turkish is offered here ONLY. Documents and emails are unaffected: those
    // pick their language from the CUSTOMER's country (resolveDocumentLang), not
    // from the app language, so a Turkish admin session still invoices in NL/EN.
    languages: ['nl', 'en', 'tr'],
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

  // index.html is shared by both builds, so the favicon is swapped here rather
  // than in the markup. Covers the apple-touch-icon too.
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => {
      link.href = tenant.favicon
    })
}
