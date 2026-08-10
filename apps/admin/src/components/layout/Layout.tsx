import { useState, useEffect, Fragment, Suspense } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const [searchParams] = useSearchParams()

  /**
   * Remount key for the global search.
   *
   * List pages parse the URL ONCE on mount (see hooks/useUrlListState) — that
   * one-directional contract is what keeps an inbound `?status=` link from
   * being stripped. The cost is that navigating to the page you are ALREADY on
   * only rewrites the address bar: searching an order from the Orders page, or
   * a product from the Products page, would silently do nothing.
   *
   * So the header search appends `?gs=<n>` when, and only when, the destination
   * pathname equals the current one, and the keyed Fragment below turns that
   * into a real remount. Nothing else ever writes `gs`, so paging, filtering
   * and searching within a page never remount.
   */
  const globalSearchNav = searchParams.get('gs') ?? ''

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // min-h-[100dvh], not min-h-screen: on mobile Safari 100vh is the *large*
  // viewport (URL bar hidden), so a 100vh container is taller than what's
  // actually visible and the bottom gets cut off. dvh tracks the live viewport.
  return (
    <div className="flex min-h-[100dvh] bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0 overflow-x-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="mt-16 px-4 py-4 lg:px-6 overflow-x-hidden">
          {/* Lazy-loaded pages resolve here; the sidebar/header stay put. */}
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          }>
            <Fragment key={globalSearchNav}>
              <Outlet />
            </Fragment>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
