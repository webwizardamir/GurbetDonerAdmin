import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { portalSupabase } from '../services/supabase'
import { getPortalUser, portalSignIn, portalSignOut, portalRequestCode, portalVerifyCode, type PortalUser } from '../services/portalAuth'

// Debug logging - only in development
const DEBUG = import.meta.env.DEV
const log = (...args: unknown[]): void => { if (DEBUG) console.log('[PortalAuth]', ...args) }

interface PortalAuthContextType {
  user: PortalUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>
  /** Passwordless step 1 — email a login code (enumeration-safe; never throws on unknown email).
   *  Returns { rateLimited } so the UI can distinguish "sent" from "throttled". */
  requestCode: (email: string) => Promise<{ rateLimited: boolean }>
  /** Passwordless step 2 — verify the code and open a session. */
  verifyCode: (email: string, code: string, remember?: boolean) => Promise<void>
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

    // Listen for auth state changes AFTER initialization (use portal client).
    //
    // ⚠️ This callback is SYNCHRONOUS on purpose. Supabase emits these events
    // from inside its auth lock and awaits every subscriber before releasing it,
    // so awaiting any Supabase call here (refreshSession/getSession/getUser, or
    // any .from()/.rpc() — those fetch the access token via getSession too)
    // deadlocks that lock forever and freezes every portal query until a hard
    // reload. Async follow-up work must be deferred with setTimeout(fn, 0), which
    // runs after the lock is released. See the same note in AuthContext.tsx.
    const { data: { subscription } } = portalSupabase.auth.onAuthStateChange((event, _session) => {
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
        // No recovery refresh: auth-js has already wiped the stored refresh token
        // by the time this fires, so it could only fail — and attempting it here
        // deadlocked the lock (see above). Session gone = signed out.
        setUser(null)
      } else if (event === 'SIGNED_IN') {
        // Deferred out of the callback so the auth lock is released first.
        setTimeout(() => {
          getPortalUser()
            .then(portalUser => { if (mounted) setUser(portalUser) })
            .catch(err => console.error('Error checking portal user on sign in:', err))
        }, 0)
      }
    })

    // No custom visibilitychange refresh here: auth-js already recovers the
    // session itself when the tab becomes visible. The hand-rolled one raced it
    // and could rotate the refresh token twice, producing a spurious SIGNED_OUT.

    return () => {
      mounted = false
      subscription.unsubscribe()
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

  const requestCode = useCallback(async (email: string) => {
    setError(null)
    return portalRequestCode(email)
  }, [])

  const verifyCode = useCallback(async (email: string, code: string, remember = true) => {
    setLoading(true)
    setError(null)
    try {
      const portalUser = await portalVerifyCode(email, code, remember)
      setUser(portalUser)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verificatie mislukt')
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
    () => ({ user, loading, error, signIn, requestCode, verifyCode, signOut, clearError }),
    [user, loading, error, signIn, requestCode, verifyCode, signOut, clearError],
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
