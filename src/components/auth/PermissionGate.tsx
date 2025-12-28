import { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Resource, Action, UserRole } from '../../types'
import { ShieldX } from 'lucide-react'

interface PermissionGateProps {
  children: ReactNode
  /** Resource to check permission for */
  resource?: Resource
  /** Action to check permission for */
  action?: Action
  /** Required role(s) - user must have one of these roles */
  roles?: UserRole[]
  /** If true, show nothing when permission denied. Default shows access denied message */
  silent?: boolean
  /** Custom fallback component when permission denied */
  fallback?: ReactNode
}

/**
 * Conditionally renders children based on user permissions
 *
 * @example
 * // Check specific permission
 * <PermissionGate resource="analytics" action="view">
 *   <AnalyticsDashboard />
 * </PermissionGate>
 *
 * @example
 * // Check role
 * <PermissionGate roles={['owner']}>
 *   <AdminSettings />
 * </PermissionGate>
 *
 * @example
 * // Silent mode - just hide if no permission
 * <PermissionGate resource="products" action="view_cost" silent>
 *   <CostColumn />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  resource,
  action,
  roles,
  silent = false,
  fallback,
}: PermissionGateProps) {
  const { hasPermission, profile, loading } = useAuth()

  // Still loading - show nothing
  if (loading) {
    return null
  }

  // No user - deny access
  if (!profile) {
    if (silent) return null
    return fallback ? <>{fallback}</> : <AccessDenied />
  }

  // Check role requirement
  if (roles && roles.length > 0) {
    const hasRole = roles.includes(profile.role)
    if (!hasRole) {
      if (silent) return null
      return fallback ? <>{fallback}</> : <AccessDenied />
    }
  }

  // Check permission requirement
  if (resource && action) {
    const hasPermissionAccess = hasPermission(resource, action)
    if (!hasPermissionAccess) {
      if (silent) return null
      return fallback ? <>{fallback}</> : <AccessDenied />
    }
  }

  return <>{children}</>
}

/**
 * Default access denied component
 */
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
        <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Access Denied
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        You don't have permission to view this content.
      </p>
    </div>
  )
}

/**
 * Higher-order component for permission checking
 *
 * @example
 * const ProtectedAnalytics = withPermission(Analytics, { resource: 'analytics', action: 'view' })
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    resource?: Resource
    action?: Action
    roles?: UserRole[]
    silent?: boolean
    fallback?: ReactNode
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGate {...options}>
        <Component {...props} />
      </PermissionGate>
    )
  }
}

/**
 * Owner-only gate - shorthand for roles={['owner']}
 */
export function OwnerOnly({
  children,
  silent = false,
  fallback,
}: {
  children: ReactNode
  silent?: boolean
  fallback?: ReactNode
}) {
  return (
    <PermissionGate roles={['owner']} silent={silent} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Admin-only gate - shorthand for owner or shop_manager
 */
export function AdminOnly({
  children,
  silent = false,
  fallback,
}: {
  children: ReactNode
  silent?: boolean
  fallback?: ReactNode
}) {
  return (
    <PermissionGate roles={['owner', 'shop_manager', 'admin']} silent={silent} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}
