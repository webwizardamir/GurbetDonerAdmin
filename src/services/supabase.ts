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

// Portal client - uses separate storage key to avoid session conflicts
export const portalSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storageKey: 'sb-portal-auth-token', // Different key than admin
      autoRefreshToken: true,
      persistSession: true,
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
