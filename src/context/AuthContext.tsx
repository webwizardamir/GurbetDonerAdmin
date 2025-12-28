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
  // Role checks
  isOwner: boolean
  isShopManager: boolean
  isAdmin: boolean
  // Permission checks
  hasPermission: (resource: Resource, action: Action) => boolean
  canViewCost: boolean
  canViewAnalytics: boolean
  canAccessSettings: boolean
  // Session management
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auto-logout timeout (30 minutes of inactivity)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000

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

      if (error) throw error
      return data as UserProfile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [])

  // Fetch permissions for user's role
  const fetchPermissions = useCallback(async (role: string): Promise<Permission[]> => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role', role)

      if (error) throw error
      return (data || []) as Permission[]
    } catch (error) {
      console.error('Error fetching permissions:', error)
      return []
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setSession(session)
          setUser(session.user)

          const userProfile = await fetchProfile(session.user.id)
          if (userProfile) {
            setProfile(userProfile)
            const userPermissions = await fetchPermissions(userProfile.role)
            setPermissions(userPermissions)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id)
          if (userProfile) {
            setProfile(userProfile)
            const userPermissions = await fetchPermissions(userProfile.role)
            setPermissions(userPermissions)
          }
        } else {
          setProfile(null)
          setPermissions([])
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null)
          setPermissions([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, fetchPermissions])

  // Track user activity for auto-logout
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now())

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, updateActivity))

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity))
    }
  }, [])

  // Auto-logout on inactivity
  useEffect(() => {
    if (!session) return

    const checkInactivity = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        console.log('Auto-logout due to inactivity')
        signOut()
      }
    }, 60000) // Check every minute

    return () => clearInterval(checkInactivity)
  }, [session, lastActivity])

  // Sign in
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        const userProfile = await fetchProfile(data.user.id)

        if (!userProfile) {
          await supabase.auth.signOut()
          return { error: 'Unable to fetch user profile' }
        }

        if (!userProfile.is_active) {
          await supabase.auth.signOut()
          return { error: 'Your account has been deactivated' }
        }

        // Only allow owner, shop_manager, or admin roles
        if (!['owner', 'shop_manager', 'admin'].includes(userProfile.role)) {
          await supabase.auth.signOut()
          return { error: 'You do not have permission to access this application' }
        }

        setProfile(userProfile)
        const userPermissions = await fetchPermissions(userProfile.role)
        setPermissions(userPermissions)
      }

      return { error: null }
    } catch (err) {
      console.error('Sign in error:', err)
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
    const { data: { session } } = await supabase.auth.refreshSession()
    if (session) {
      setSession(session)
      setUser(session.user)
    }
  }

  // Role checks
  const isOwner = profile?.role === 'owner'
  const isShopManager = profile?.role === 'shop_manager'
  const isAdmin = profile?.role === 'owner' || profile?.role === 'shop_manager' || profile?.role === 'admin'

  // Permission check function
  const hasPermission = useCallback((resource: Resource, action: Action): boolean => {
    // Owner has all permissions
    if (isOwner) return true

    // Check permissions table
    const permission = permissions.find(
      p => p.resource === resource && p.action === action
    )
    return permission?.allowed ?? false
  }, [permissions, isOwner])

  // Convenience permission checks
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
