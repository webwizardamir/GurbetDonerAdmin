import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Resource, Action, UserRole } from '../../types'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  /** Required resource permission */
  resource?: Resource
  /** Required action permission */
  action?: Action
  /** Required role(s) - user must have one of these roles */
  roles?: UserRole[]
  /** Redirect path when not authenticated (default: /login) */
  redirectTo?: string
}

/**
 * Protects routes based on authentication and permissions
 *
 * @example
 * // Basic auth protection
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 *
 * @example
 * // With permission check
 * <Route path="/analytics" element={
 *   <ProtectedRoute resource="analytics" action="view">
 *     <Analytics />
 *   </ProtectedRoute>
 * } />
 *
 * @example
 * // With role check
 * <Route path="/settings" element={
 *   <ProtectedRoute roles={['owner']}>
 *     <Settings />
 *   </ProtectedRoute>
 * } />
 */
export function ProtectedRoute({
  children,
  resource,
  action,
  roles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { profile, loading, hasPermission } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!profile) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Check if account is active
  if (!profile.is_active) {
    return <Navigate to="/login" state={{ error: 'Account deactivated' }} replace />
  }

  // Check role requirement
  if (roles && roles.length > 0) {
    const hasRole = roles.includes(profile.role)
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  // Check permission requirement
  if (resource && action) {
    const hasPermissionAccess = hasPermission(resource, action)
    if (!hasPermissionAccess) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <>{children}</>
}

/**
 * Route guard for owner-only pages
 */
export function OwnerRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute roles={['owner']}>
      {children}
    </ProtectedRoute>
  )
}

/**
 * Route guard for admin pages (owner or shop_manager)
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute roles={['owner', 'shop_manager', 'admin']}>
      {children}
    </ProtectedRoute>
  )
}

/**
 * Public route that redirects authenticated users
 */
export function PublicRoute({
  children,
  redirectTo = '/',
}: {
  children: ReactNode
  redirectTo?: string
}) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
      </div>
    )
  }

  // Authenticated users go to dashboard
  if (profile) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
