import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Warn in development but don't crash - let the error boundary handle failures
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.error('Missing Supabase environment variables. Please check your .env file.')
  }
}

// Admin client - uses default storage key
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Portal "remember me" storage.
// When remember = true (default) the portal session is persisted in
// localStorage, so it survives a browser restart. When false it lives in
// sessionStorage and is cleared when the tab/window closes. The choice itself
// is a small preference kept in localStorage and read by the storage adapter on
// every token write. Call setPortalRemember() BEFORE signInWithPassword so the
// token lands in the right store.
const PORTAL_REMEMBER_KEY = 'sb-portal-remember'

export function setPortalRemember(remember: boolean): void {
  try {
    window.localStorage.setItem(PORTAL_REMEMBER_KEY, remember ? 'true' : 'false')
  } catch { /* storage unavailable — ignore */ }
}

const portalAuthStorage = {
  getItem: (key: string): string | null =>
    // The token may live in either store depending on the last remember choice.
    window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key),
  setItem: (key: string, value: string): void => {
    // Default to session-only (dies on tab close) — safer on shared shop devices.
    // Only persist to localStorage when the customer explicitly ticks "remember me".
    const remember = window.localStorage.getItem(PORTAL_REMEMBER_KEY) === 'true'
    if (remember) {
      window.localStorage.setItem(key, value)
      window.sessionStorage.removeItem(key)
    } else {
      window.sessionStorage.setItem(key, value)
      window.localStorage.removeItem(key)
    }
  },
  removeItem: (key: string): void => {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

// Portal client - uses separate storage key to avoid session conflicts
export const portalSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storageKey: 'sb-portal-auth-token', // Different key than admin
      autoRefreshToken: true,
      persistSession: true,
      storage: portalAuthStorage,
    }
  }
)

// Prevent direct database access from browser console in production
if (import.meta.env.PROD) {
  Object.defineProperty(window, 'supabase', {
    get: () => undefined,
    set: () => {},
    configurable: false,
  })
  Object.defineProperty(window, 'portalSupabase', {
    get: () => undefined,
    set: () => {},
    configurable: false,
  })
}
