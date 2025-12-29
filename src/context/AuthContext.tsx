import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { UserProfile, Permission, Resource, Action } from '../types'

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
  const [lastActivity, setLastActivity] = useState(Date.now())

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

  // Initialize auth state - runs once on mount
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        console.log('Initializing auth...')
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!mounted) return

        if (currentSession?.user) {
          console.log('Session found, fetching profile...')
          setSession(currentSession)
          setUser(currentSession.user)

          const userProfile = await fetchProfile(currentSession.user.id)

          if (!mounted) return

          if (userProfile) {
            console.log('Profile loaded:', userProfile.role)
            setProfile(userProfile)
            const userPermissions = await fetchPermissions(userProfile.role)
            if (mounted) setPermissions(userPermissions)
          } else {
            console.log('No profile found, clearing session')
            // No profile - sign out
            await supabase.auth.signOut()
            setSession(null)
            setUser(null)
          }
        } else {
          console.log('No session found')
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          console.log('Auth init complete, setting loading=false')
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes (sign in/out only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _newSession) => {
      console.log('Auth state changed:', event)

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setProfile(null)
        setPermissions([])
      }

      // For SIGNED_IN, we handle it in signIn function directly
      // This prevents double-fetching and race conditions
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, fetchPermissions])

  // Track user activity
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now())
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, updateActivity))
    return () => events.forEach(event => window.removeEventListener(event, updateActivity))
  }, [])

  // Auto-logout on inactivity
  useEffect(() => {
    if (!session) return
    const checkInactivity = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        console.log('Auto-logout due to inactivity')
        signOut()
      }
    }, 60000)
    return () => clearInterval(checkInactivity)
  }, [session, lastActivity])

  // Sign in
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      console.log('SignIn: Starting sign in process...')
      setLoading(true)

      console.log('SignIn: Calling signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error('SignIn: Auth error:', error.message)
        setLoading(false)
        return { error: error.message }
      }

      console.log('SignIn: Auth successful, user:', data.user?.id)

      if (data.user) {
        console.log('SignIn: Setting session and user state...')
        setSession(data.session)
        setUser(data.user)

        console.log('SignIn: Fetching profile...')
        const userProfile = await fetchProfile(data.user.id)
        console.log('SignIn: Profile result:', userProfile)

        if (!userProfile) {
          console.error('SignIn: No profile found, signing out')
          await supabase.auth.signOut()
          setLoading(false)
          return { error: 'Unable to fetch user profile. Please contact support.' }
        }

        if (!userProfile.is_active) {
          console.log('SignIn: User is inactive, signing out')
          await supabase.auth.signOut()
          setLoading(false)
          return { error: 'Your account has been deactivated' }
        }

        if (!['owner', 'shop_manager', 'admin'].includes(userProfile.role)) {
          console.log('SignIn: User role not allowed:', userProfile.role)
          await supabase.auth.signOut()
          setLoading(false)
          return { error: 'You do not have permission to access this application' }
        }

        console.log('SignIn: Setting profile and fetching permissions...')
        setProfile(userProfile)
        const userPermissions = await fetchPermissions(userProfile.role)
        console.log('SignIn: Permissions loaded:', userPermissions.length)
        setPermissions(userPermissions)
      }

      console.log('SignIn: Complete, setting loading=false')
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

  // Refresh session
  const refreshSession = async () => {
    const { data: { session: newSession } } = await supabase.auth.refreshSession()
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

  const value: AuthContextType = {
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
