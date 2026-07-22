import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  UserCog,
  Package,
  PackageSearch,
  Tags,
  Mail,
  FileText,
  BellRing,
  BarChart3,
  Settings,
  LogOut,
  History,
  ChevronDown,
  Globe,
  X,
} from 'lucide-react'
import { tenant, isFeatureEnabled } from '../../config/tenant'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  labelKey: string
  href: string
  ownerOnly?: boolean
  /** Hidden when this tenant has the feature switched off (see config/tenant.ts). */
  feature?: 'analytics'
  children?: NavItem[]
}

interface NavSection {
  titleKey: string
  items: NavItem[]
}

// Grouped navigation. Sections render a small label header; items keep the
// existing active/dark-mode styling. A section whose items are all owner-only
// is hidden for non-owners (see visibleSections below).
const navSections: NavSection[] = [
  {
    titleKey: 'nav.sections.overview',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.dashboard', href: '/' },
    ],
  },
  {
    titleKey: 'nav.sections.sales',
    items: [
      { icon: ShoppingCart, labelKey: 'nav.orders', href: '/orders' },
      { icon: Users, labelKey: 'nav.customers', href: '/customers' },
      { icon: PackageSearch, labelKey: 'nav.soldProducts', href: '/sold-products' },
    ],
  },
  {
    titleKey: 'nav.sections.catalog',
    items: [
      { icon: Package, labelKey: 'nav.products', href: '/products' },
      { icon: Tags, labelKey: 'nav.priceLists', href: '/price-lists', ownerOnly: true },
    ],
  },
  {
    titleKey: 'nav.sections.documents',
    items: [
      { icon: FileText, labelKey: 'nav.invoices', href: '/invoices' },
      { icon: BellRing, labelKey: 'nav.overdueInvoices', href: '/overdue' },
      { icon: Mail, labelKey: 'nav.outbox', href: '/outbox', ownerOnly: true },
    ],
  },
  {
    titleKey: 'nav.sections.analysis',
    items: [
      { icon: BarChart3, labelKey: 'nav.analytics', href: '/analytics', ownerOnly: true, feature: 'analytics' },
    ],
  },
  {
    titleKey: 'nav.sections.admin',
    items: [
      {
        icon: Settings,
        labelKey: 'nav.settings',
        href: '/settings',
        ownerOnly: true,
        children: [
          { icon: FileText, labelKey: 'nav.documents', href: '/settings/documents', ownerOnly: true },
          { icon: Globe, labelKey: 'nav.portalManagement', href: '/settings/portal', ownerOnly: true },
          { icon: UserCog, labelKey: 'nav.users', href: '/settings/users', ownerOnly: true },
          { icon: History, labelKey: 'nav.auditLog', href: '/settings/audit-log', ownerOnly: true },
        ],
      },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const { profile, signOut, isOwner } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Auto-expand Settings if we're on a settings sub-page
    if (location.pathname.startsWith('/settings')) {
      return ['/settings']
    }
    return []
  })

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleExpand = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href]
    )
  }

  // Filter items by permission and by tenant feature switches, then drop any
  // section left with no items (e.g. "Analyse" disappears entirely for a tenant
  // with analytics off, since it holds only that one item).
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => (!item.ownerOnly || isOwner) && (!item.feature || isFeatureEnabled(item.feature))
      ),
    }))
    .filter((section) => section.items.length > 0)

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-64 border-r border-slate-200 dark:border-slate-800
        bg-white dark:bg-slate-900 flex flex-col z-40
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <NavLink to="/" className="flex items-center gap-3">
          <img
            src={tenant.logo}
            alt={tenant.logoAlt}
            className="h-10 w-auto"
          />
        </NavLink>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin">
        {visibleSections.map((section) => (
          <div key={section.titleKey} className="mb-2 last:mb-0">
            <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t(section.titleKey)}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const hasChildren = item.children && item.children.length > 0
                const isExpanded = expandedItems.includes(item.href)
                const isChildActive = hasChildren && item.children?.some(child => location.pathname === child.href)
                const isActive = location.pathname === item.href || isChildActive

                if (hasChildren) {
                  return (
                    <li key={item.href}>
                      <button
                        onClick={() => toggleExpand(item.href)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm
                          ${isActive
                            ? 'bg-green-50 dark:bg-green-600/10 text-green-700 dark:text-green-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{t(item.labelKey)}</span>
                        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-slate-200 dark:border-slate-700">
                          {item.children?.filter(child => !child.ownerOnly || isOwner).map((child) => {
                            const ChildIcon = child.icon
                            return (
                              <li key={child.href}>
                                <NavLink
                                  to={child.href}
                                  className={({ isActive }) => `
                                    flex items-center gap-2.5 px-3 py-1.5 ml-2 rounded-lg transition-all text-sm
                                    ${isActive
                                      ? 'bg-green-50 dark:bg-green-600/10 text-green-700 dark:text-green-400'
                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }
                                  `}
                                >
                                  <ChildIcon className="w-4 h-4" />
                                  <span className="font-medium">{t(child.labelKey)}</span>
                                </NavLink>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                }

                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.href === '/'}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm
                        ${isActive
                          ? 'bg-green-50 dark:bg-green-600/10 text-green-700 dark:text-green-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{t(item.labelKey)}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-medium text-sm shrink-0">
            {profile?.full_name ? getInitials(profile.full_name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {profile?.role === 'owner' ? t('settings.users.roles.owner') : profile?.role === 'shop_manager' ? t('settings.users.roles.shop_manager') : profile?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={t('nav.signOut')}
          >
            <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </aside>
  )
}
