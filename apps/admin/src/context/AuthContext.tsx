import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { UserProfile, Permission, Resource, Action } from '../types'

// Debug logging - only in development
const DEBUG = import.meta.env.DEV
const log = (...args: unknown[]): void => { if (DEBUG) console.log('[Auth]', ...args) }

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  permissions: Permission[]
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isOwner: boolean
  isShopManager: boolean
  isAdmin: boolean
  hasPermission: (resource: Resource, action: Action) => boolean
  canViewCost: boolean
  canViewAnalytics: boolean
  canAccessSettings: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
// Hard ceiling on the initial auth handshake before the app is rendered anyway.
const INIT_TIMEOUT = 10 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  // lastActivity is read by the inactivity timer and written by user-input
  // events. Keep it in a ref so scroll/keypress don't re-render every consumer.
  const lastActivityRef = useRef(Date.now())
  // Single-flight guard so two callers of the public refreshSession() don't
  // race-rotate the refresh token.
  const refreshInFlightRef = useRef<Promise<Session | null> | null>(null)

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Profile fetch error:', error)
        return null
      }
      return data as UserProfile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [])

  // Fetch permissions with timeout
  const fetchPermissions = useCallback(async (role: string): Promise<Permission[]> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role', role)
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (error) {
        console.error('Permissions fetch error:', error)
        return []
      }
      return (data || []) as Permission[]
    } catch (error) {
      console.error('Error fetching permissions:', error)
      return []
    }
  }, [])

  // Single-flight refresh helper backing the public `refreshSession()` API.
  // Returns the refreshed session, or null on failure.
  // ⚠️ Must never be called from inside an onAuthStateChange callback — see the
  // deadlock note on that listener below.
  const tryRefreshSession = useCallback(async (): Promise<Session | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current
    const promise = (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession()
        if (error || !data.session) return null
        return data.session
      } catch (err) {
        console.error('Session refresh failed:', err)
        return null
      } finally {
        refreshInFlightRef.current = null
      }
    })()
    refreshInFlightRef.current = promise
    return promise
  }, [])

  // Initialize auth state - runs once on mount
  useEffect(() => {
    let mounted = true

    // Watchdog: `loading` gates the entire app behind a full-screen spinner
    // (components/auth/ProtectedRoute.tsx). Every await below is a network call
    // that can, in principle, stall — so guarantee the gate opens either way.
    // Without a session the app simply renders /login, which is the correct
    // outcome for an unreachable backend.
    const watchdog = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Initialization timed out, releasing the loading gate')
        setLoading(false)
      }
    }, INIT_TIMEOUT)

    const initAuth = async () => {
      try {
        log('Initializing auth...')
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!mounted) return

        if (currentSession?.user) {
          log('Session found, fetching profile...')
          setSession(currentSession)
          setUser(currentSession.user)

          const userProfile = await fetchProfile(currentSession.user.id)

          if (!mounted) return

          if (userProfile) {
            log('Profile loaded:', userProfile.role)
            setProfile(userProfile)
            const userPermissions = await fetchPermissions(userProfile.role)
            if (mounted) setPermissions(userPermissions)
          } else {
            log('No profile found, clearing session')
            // Local-only: a non-admin (e.g. a portal customer) authenticating here
            // must not have their tokens revoked globally — that would kill their
            // legitimate portal session. Just drop the admin-side session.
            await supabase.auth.signOut({ scope: 'local' })
            setSession(null)
            setUser(null)
          }
        } else {
          log('No session found')
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          log('Auth init complete, setting loading=false')
          clearTimeout(watchdog)
          setLoading(false)
        }
      }
    }

    initAuth()

    // ⚠️ NEVER `await` a Supabase call inside this callback, and never make it
    // `async`. Supabase emits these events from INSIDE its auth lock and awaits
    // every subscriber before releasing it (auth-js `_notifyAllSubscribers`), so
    // calling back into `refreshSession()` / `getSession()` / `getUser()` here
    // deadlocks the lock permanently. Because supabase-js calls `getSession()`
    // on every PostgREST request, that freezes EVERY query in the app (and, since
    // Web Locks are origin-scoped, in every other tab too) until a hard reload.
    // That was the "stuck on the loading spinner until I refresh" bug.
    // If async work is ever needed here, defer it with `setTimeout(fn, 0)` so it
    // runs after the lock is released.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      log('Auth state changed:', event)

      if (event === 'SIGNED_OUT') {
        // No recovery attempt: by the time this fires, auth-js has already wiped
        // the stored refresh token, so a refresh here could only ever fail — and
        // trying deadlocked the lock (see above). Session gone = signed out.
        setSession(null)
        setUser(null)
        setProfile(null)
        setPermissions([])
        return
      }

      if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession)
        setUser(newSession.user)
      }
    })

    return () => {
      mounted = false
      clearTimeout(watchdog)
      subscription.unsubscribe()
    }
  }, [fetchProfile, fetchPermissions])

  // Track user activity. Only real input counts — visibility/focus do NOT,
  // because tab switching is not the same as the user actively working.
  useEffect(() => {
    const updateActivity = () => { lastActivityRef.current = Date.now() }
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, updateActivity))
    return () => events.forEach(event => window.removeEventListener(event, updateActivity))
  }, [])

  // Auto-logout on inactivity. Skip while the tab is hidden (the timer is
  // throttled and unreliable then) — re-evaluate on visibility return.
  //
  // There is deliberately NO session refresh here. auth-js already refreshes on
  // tab return itself (`_onVisibilityChanged` → `_recoverAndRefresh`); the
  // hand-rolled refresh this file used to run raced it — two rotations of the
  // same refresh token, the loser getting a 400 → SIGNED_OUT → the deadlock
  // documented on the onAuthStateChange listener above. Let the library do it.
  useEffect(() => {
    if (!session) return

    const evaluateInactivity = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT) {
        log('Auto-logout due to inactivity')
        signOut()
      }
    }

    const interval = setInterval(evaluateInactivity, 60000)
    // Also check the moment the tab comes back — the interval is throttled while
    // hidden, so after a long absence this is what actually fires the logout.
    document.addEventListener('visibilitychange', evaluateInactivity)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', evaluateInactivity)
    }
  }, [session])

  // Sign in
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      log('SignIn: Starting sign in process...')
      setLoading(true)

      log('SignIn: Calling signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error('SignIn: Auth error:', error.message)
        setLoading(false)
        return { error: error.message }
      }

      log('SignIn: Auth successful, user:', data.user?.id)

      if (data.user) {
        log('SignIn: Setting session and user state...')
        setSession(data.session)
        setUser(data.user)

        log('SignIn: Fetching profile...')
        const userProfile = await fetchProfile(data.user.id)
        log('SignIn: Profile result:', userProfile)

        // Reject paths use scope:'local' so authenticating a non-admin account
        // here (e.g. a portal customer who entered their credentials on the admin
        // login) only clears THIS client's session — it must never globally revoke
        // the user's tokens, which would also kill their valid portal session.
        if (!userProfile) {
          console.error('SignIn: No profile found, signing out')
          await supabase.auth.signOut({ scope: 'local' })
          setLoading(false)
          return { error: 'Unable to fetch user profile. Please contact support.' }
        }

        if (!userProfile.is_active) {
          log('SignIn: User is inactive, signing out')
          await supabase.auth.signOut({ scope: 'local' })
          setLoading(false)
          return { error: 'Your account has been deactivated' }
        }

        if (!['owner', 'shop_manager', 'admin'].includes(userProfile.role)) {
          log('SignIn: User role not allowed:', userProfile.role)
          await supabase.auth.signOut({ scope: 'local' })
          setLoading(false)
          return { error: 'You do not have permission to access this application. If you are a customer, please use the customer portal login.' }
        }

        log('SignIn: Setting profile and fetching permissions...')
        setProfile(userProfile)
        const userPermissions = await fetchPermissions(userProfile.role)
        log('SignIn: Permissions loaded:', userPermissions.length)
        setPermissions(userPermissions)
      }

      log('SignIn: Complete, setting loading=false')
      setLoading(false)
      return { error: null }
    } catch (err) {
      console.error('SignIn: Unexpected error:', err)
      setLoading(false)
      return { error: 'An unexpected error occurred' }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setUser(null)
      setProfile(null)
      setSession(null)
      setPermissions([])
    }
  }

  // Refresh session (public API for callers that need it)
  const refreshSession = async () => {
    const newSession = await tryRefreshSession()
    if (newSession) {
      setSession(newSession)
      setUser(newSession.user)
    }
  }

  // Role checks
  const isOwner = profile?.role === 'owner'
  const isShopManager = profile?.role === 'shop_manager'
  const isAdmin = ['owner', 'shop_manager', 'admin'].includes(profile?.role || '')

  // Permission check
  const hasPermission = useCallback((resource: Resource, action: Action): boolean => {
    if (isOwner) return true
    const permission = permissions.find(p => p.resource === resource && p.action === action)
    return permission?.allowed ?? false
  }, [permissions, isOwner])

  const canViewCost = hasPermission('products', 'view_cost') || hasPermission('inventory', 'view_cost')
  const canViewAnalytics = hasPermission('analytics', 'view')
  const canAccessSettings = hasPermission('settings', 'view')

  const value: AuthContextType = useMemo(() => ({
    user,
    profile,
    session,
    permissions,
    loading,
    signIn,
    signOut,
    isOwner,
    isShopManager,
    isAdmin,
    hasPermission,
    canViewCost,
    canViewAnalytics,
    canAccessSettings,
    refreshSession,
  }), [user, profile, session, permissions, loading, isOwner, isShopManager, isAdmin, hasPermission, canViewCost, canViewAnalytics, canAccessSettings])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
