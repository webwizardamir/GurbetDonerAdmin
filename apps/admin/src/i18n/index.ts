import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import nl from './locales/nl.json'
import en from './locales/en.json'

import { tenant, type AppLanguage } from '../config/tenant'

// Read BEFORE init: the detector's `caches: ['localStorage']` writes whatever it
// detected straight back, so after init there is no way left to tell an explicit
// choice from a browser-inferred one. Needed by the opt-in guard below.
const explicitChoice = (() => {
  try {
    return localStorage.getItem('i18nextLng')?.split('-')[0] ?? null
  } catch {
    return null // private mode / storage blocked
  }
})()

// nl/en are in every build. `tr` is NOT imported statically: it is ~84 KB of JSON
// (~20 KB gzip) that Melek can never display, and this app deliberately keeps its
// entry chunk small (see the code-splitting work in CHANGELOG). It is pulled in
// below, as its own chunk, only by a tenant that enables it.
const resources = {
  nl: { translation: nl },
  en: { translation: en },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'nl',
    // Gates the DETECTOR, not just the switcher. Without this, `navigator` alone
    // would hand a Turkish-language browser a Turkish UI on Melek too, purely
    // because the locale is in the bundle. Anything outside the list falls back
    // to Dutch, which also covers a stale `i18nextLng` in localStorage.
    supportedLngs: tenant.languages,
    // Normalises the region tags the detector reports ('nl-NL' -> 'nl'), which
    // otherwise never match supportedLngs.
    load: 'languageOnly',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

// Turkish is OPT-IN, by product decision: it must be picked in the switcher, and
// is then remembered. `navigator` stays in the detection chain (an English browser
// getting English is long-standing behaviour), so without this a Turkish-language
// browser would be handed a Turkish UI it never asked for.
if (i18n.language === 'tr' && explicitChoice !== 'tr') {
  void i18n.changeLanguage('nl')
}

/**
 * Registers a lazily-shipped locale, if it is one. Idempotent, and never rejects:
 * Turkish is a convenience, so a failed fetch must degrade to Dutch rather than
 * take the app down.
 */
export async function ensureLanguageLoaded(lng: AppLanguage): Promise<void> {
  if (lng !== 'tr' || i18n.hasResourceBundle('tr', 'translation')) return
  try {
    const m = await import('./locales/tr.json')
    i18n.addResourceBundle('tr', 'translation', m.default, true, true)
  } catch (err) {
    console.error('[i18n] Turkish locale failed to load', err)
  }
}

/**
 * Resolves once the ACTIVE language is displayable. `main.tsx` awaits it before
 * the first render so a Turkish session paints in Turkish rather than flashing
 * Dutch — react-i18next does not re-render on a late `addResourceBundle` unless
 * `bindI18nStore` is set, so without this gate a late arrival is never shown at
 * all. Resolves in one microtask for anyone using the built-in nl/en, which is
 * everyone on Melek and every Dutch-speaking user on Gurbet.
 */
export const i18nReady: Promise<void> = ensureLanguageLoaded(i18n.language as AppLanguage)

export default i18n
