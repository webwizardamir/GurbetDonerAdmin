import logo from '../assets/images/Gurbet-Doner-Logo.png'

/**
 * App identity and feature switches for Gurbet Doner.
 *
 * This file used to be a two-tenant map keyed on `VITE_TENANT`, because the same
 * `apps/admin` source was deployed twice (Melek Halal Food and Gurbet Doner) from
 * one repo. The two were split into separate repositories on 2026-08-26, so this
 * is now a plain config object. The shape was kept identical on purpose: every
 * call site (`tenant.name`, `tenant.logo`, `isFeatureEnabled(...)`) still reads
 * exactly as it did, so the split touched no components.
 *
 * The brand blue is applied by redefining Tailwind's `green` ramp in index.css,
 * and the PDF templates read their colours from `components/documents/brandPalette.ts`
 * (@react-pdf never sees a stylesheet, so the CSS remap cannot reach them).
 */

/** Every locale that ships in the bundle (`i18n/locales/*.json`). */
export type AppLanguage = 'nl' | 'en' | 'tr'

/**
 * The customer portal is CUSTOMER-facing and stays NL/EN, so it does not follow
 * `tenant.languages` -- Turkish was requested for the admin dashboard only. Pass
 * `scope="portal"` to LanguageSelector to get this list.
 *
 * Caveat worth knowing: i18next's active language is global to the origin. Staff
 * who pick Turkish in the admin and then open the portal in the SAME browser see
 * Turkish there too (the keys are translated). Real customers have their own
 * browser, so they only ever get what this list offers.
 */
export const PORTAL_LANGUAGES: readonly AppLanguage[] = ['nl', 'en']

export interface TenantConfig {
  /** Product name shown in the UI + browser tab. */
  name: string
  /** Sidebar / login logo. */
  logo: string
  /** `alt` text for the logo. */
  logoAlt: string
  /**
   * Support address on the admin login screen. Optional: with no support mailbox
   * we render plain text instead of a mailto.
   */
  supportEmail?: string
  /** Same idea for the customer portal's "no account?" contact line. */
  portalContactEmail?: string
  /** Phone shown next to portalContactEmail. Omitted when unset. */
  portalContactPhone?: string
  /**
   * Dial string for portalContactPhone's tel: link. Kept separate because a
   * displayed national format is not dialable internationally -- stripping its
   * spaces would drop the country code.
   */
  portalContactPhoneHref?: string
  /**
   * Languages offered in the ADMIN language switcher, in menu order. The first
   * entry is NOT a default -- `i18n` falls back to `nl` and the detector only
   * ever picks a language from this list. Staff opt in via the switcher, and it
   * is remembered.
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

export const tenant: TenantConfig = {
  name: 'Gurbet Doner',
  logo,
  logoAlt: 'Gurbet Doner',
  // No support/contact mailbox yet -- deliberately unset so the UI omits the
  // link rather than showing a dead address. Fill in when there is one.
  languages: ['nl', 'en', 'tr'],
  features: {
    // Hidden at launch by client request. Owner-gated server-side regardless.
    analytics: false,
  },
}

/** Convenience: `isFeatureEnabled('analytics')`. */
export function isFeatureEnabled(feature: keyof TenantConfig['features']): boolean {
  return tenant.features[feature]
}

/** Sets the tab title. Called once from main.tsx, before render. */
export function applyTenant(): void {
  document.title = tenant.name
}
