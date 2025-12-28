import { useAuth } from '../context/AuthContext'
import { Resource, Action } from '../types'

/**
 * Hook to check user permissions
 *
 * @example
 * const { can, canView, canEdit, canDelete } = usePermission('customers')
 *
 * if (can('create')) { ... }
 * if (canView) { ... }
 */
export function usePermission(resource: Resource) {
  const { hasPermission, isOwner, isShopManager, profile } = useAuth()

  // Check specific action
  const can = (action: Action): boolean => {
    return hasPermission(resource, action)
  }

  // Common permission checks
  const canView = hasPermission(resource, 'view')
  const canCreate = hasPermission(resource, 'create')
  const canEdit = hasPermission(resource, 'edit')
  const canDelete = hasPermission(resource, 'delete')

  // Special permissions
  const canViewCost = hasPermission(resource, 'view_cost')
  const canExport = hasPermission(resource, 'export')
  const canGenerate = hasPermission(resource, 'generate')
  const canDownload = hasPermission(resource, 'download')
  const canAdjust = hasPermission(resource, 'adjust')
  const canRefund = hasPermission(resource, 'refund')

  return {
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canViewCost,
    canExport,
    canGenerate,
    canDownload,
    canAdjust,
    canRefund,
    isOwner,
    isShopManager,
    role: profile?.role,
  }
}

/**
 * Hook to check multiple resources at once
 *
 * @example
 * const permissions = usePermissions()
 * if (permissions.customers.canView) { ... }
 * if (permissions.analytics.canView) { ... }
 */
export function usePermissions() {
  const { hasPermission, isOwner, isShopManager, profile } = useAuth()

  const createResourcePermissions = (resource: Resource) => ({
    canView: hasPermission(resource, 'view'),
    canCreate: hasPermission(resource, 'create'),
    canEdit: hasPermission(resource, 'edit'),
    canDelete: hasPermission(resource, 'delete'),
    canViewCost: hasPermission(resource, 'view_cost'),
    canExport: hasPermission(resource, 'export'),
    canGenerate: hasPermission(resource, 'generate'),
    canDownload: hasPermission(resource, 'download'),
    canAdjust: hasPermission(resource, 'adjust'),
    canRefund: hasPermission(resource, 'refund'),
  })

  return {
    customers: createResourcePermissions('customers'),
    products: createResourcePermissions('products'),
    orders: createResourcePermissions('orders'),
    documents: createResourcePermissions('documents'),
    inventory: createResourcePermissions('inventory'),
    analytics: createResourcePermissions('analytics'),
    settings: createResourcePermissions('settings'),
    audit_log: createResourcePermissions('audit_log'),
    isOwner,
    isShopManager,
    role: profile?.role,
  }
}
