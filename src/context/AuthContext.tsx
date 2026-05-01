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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  // lastActivity is read by the inactivity timer and written by user-input
  // events. Keep it in a ref so scroll/keypress don't re-render every consumer.
  const lastActivityRef = useRef(Date.now())
  // Single-flight guard for the visibility-driven refresh, so two admin tabs
  // returning to focus simultaneously don't race-rotate the refresh token.
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

  // Single-flight refresh helper. Returns the recovered session, or null on
  // genuine failure. Used both on visibility return and as a fallback when
  // Supabase fires SIGNED_OUT after a backgrounded refresh window.
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
            await supabase.auth.signOut()
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
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes. The key change here vs. the old listener:
    // when SIGNED_OUT fires, attempt a refresh first. Backgrounded tabs
    // routinely miss their refresh window and Supabase emits SIGNED_OUT
    // even though the refresh token is still valid — clearing state in
    // that case logs the user out on every tab return. Only clear if a
    // proactive refresh genuinely fails (admin-revoked, password rotated).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      log('Auth state changed:', event)

      if (event === 'SIGNED_OUT') {
        const recovered = await tryRefreshSession()
        if (recovered) {
          log('SIGNED_OUT recovered via refresh — keeping session')
          setSession(recovered)
          setUser(recovered.user)
          return
        }
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
      subscription.unsubscribe()
    }
  }, [fetchProfile, fetchPermissions, tryRefreshSession])

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
  useEffect(() => {
    if (!session) return

    const evaluateInactivity = () => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT) {
        log('Auto-logout due to inactivity')
        signOut()
      }
    }

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      evaluateInactivity()
    }, 60000)

    return () => clearInterval(interval)
  }, [session])

  // On tab return: proactively refresh the session before any UI render
  // can decide to redirect. Also re-evaluate inactivity once we're back.
  useEffect(() => {
    if (!session) return

    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      const recovered = await tryRefreshSession()
      if (recovered) {
        setSession(recovered)
        setUser(recovered.user)
      }
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT) {
        log('Auto-logout on visibility — over inactivity threshold')
        signOut()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [session, tryRefreshSession])

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

        if (!userProfile) {
          console.error('SignIn: No profile found, signing out')
          await supabase.auth.signOut()
          setLoading(false)
          return { error: 'Unable to fetch user profile. Please contact support.' }
        }

        if (!userProfile.is_active) {
          log('SignIn: User is inactive, signing out')
          await supabase.auth.signOut()
          setLoading(false)
          return { error: 'Your account has been deactivated' }
        }

        if (!['owner', 'shop_manager', 'admin'].includes(userProfile.role)) {
          log('SignIn: User role not allowed:', userProfile.role)
          await supabase.auth.signOut()
          setLoading(false)
          return { error: 'You do not have permission to access this application' }
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
      setUser(null)
      setProfile(null)
      setSession(null)
      setPermissions([])
    } catch (error) {
      console.error('Sign out error:', error)
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
