import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { portalSupabase } from '../services/supabase'
import { getPortalUser, portalSignIn, portalSignOut, type PortalUser } from '../services/portalAuth'

// Debug logging - only in development
const DEBUG = import.meta.env.DEV
const log = (...args: unknown[]): void => { if (DEBUG) console.log('[PortalAuth]', ...args) }

interface PortalAuthContextType {
  user: PortalUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined)

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false) // Track if initial check completed

  // Check for existing session on mount
  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      // Skip if already initialized (React Strict Mode)
      if (initializedRef.current) {
        log(' Already initialized, skipping')
        return
      }

      log(' Starting session check...')
      try {
        const portalUser = await getPortalUser()
        log(' Session check complete, user:', portalUser ? 'found' : 'null')
        if (mounted) {
          setUser(portalUser)
          initializedRef.current = true
        }
      } catch (err) {
        console.error('[PortalAuth] Error checking portal session:', err)
        initializedRef.current = true // Mark as initialized even on error
      } finally {
        if (mounted) {
          log(' Setting loading to false')
          setLoading(false)
        }
      }
    }

    checkSession()

    // Listen for auth state changes AFTER initialization (use portal client)
    const { data: { subscription } } = portalSupabase.auth.onAuthStateChange(async (event, _session) => {
      if (!mounted) return

      // Only handle SIGNED_IN and SIGNED_OUT
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
        log(' Ignoring auth event:', event)
        return
      }

      // Ignore SIGNED_IN events that fire before initialization completes
      // (Supabase fires SIGNED_IN on subscription if session exists)
      if (event === 'SIGNED_IN' && !initializedRef.current) {
        log(' Ignoring early SIGNED_IN event (still initializing)')
        return
      }

      log(' Auth state changed:', event)

      if (event === 'SIGNED_OUT') {
        // Backgrounded tabs miss the autoRefreshToken window and Supabase
        // can fire SIGNED_OUT even when the refresh token is still valid.
        // Try to recover before nuking the user.
        try {
          const { data, error } = await portalSupabase.auth.refreshSession()
          if (!error && data.session) {
            log(' SIGNED_OUT recovered via refresh — keeping user')
            return
          }
        } catch (err) {
          console.error('[PortalAuth] Refresh on SIGNED_OUT failed:', err)
        }
        if (mounted) setUser(null)
      } else if (event === 'SIGNED_IN') {
        // Re-check portal user status
        try {
          const portalUser = await getPortalUser()
          if (mounted) {
            setUser(portalUser)
          }
        } catch (err) {
          console.error('Error checking portal user on sign in:', err)
        }
      }
    })

    // On tab return, proactively refresh the session before any UI render
    // can decide to redirect.
    let refreshing = false
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      if (refreshing) return
      refreshing = true
      try {
        await portalSupabase.auth.refreshSession()
      } catch (err) {
        console.error('[PortalAuth] Visibility refresh failed:', err)
      } finally {
        refreshing = false
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      mounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string, remember = true) => {
    setLoading(true)
    setError(null)
    try {
      const portalUser = await portalSignIn(email, password, remember)
      setUser(portalUser)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await portalSignOut()
      setUser(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut, clearError }),
    [user, loading, error, signIn, signOut, clearError],
  )

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  )
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext)
  if (context === undefined) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider')
  }
  return context
}
