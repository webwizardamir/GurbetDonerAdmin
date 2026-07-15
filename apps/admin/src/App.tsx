import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazyWithReload as lazy } from './utils/lazyWithReload'
import { AuthProvider } from './context/AuthContext'
import { PortalAuthProvider, usePortalAuth } from './context/PortalAuthContext'
import { ProtectedRoute, OwnerRoute, PublicRoute } from './components/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/layout/Layout'
import ReminderAlert from './components/ReminderAlert'

// Pages are lazy-loaded so each becomes its own chunk. This keeps the initial
// load (and especially the /login and /portal/login screens) tiny — the heavy
// admin pages, PDF engine, Excel and charts are only fetched when their route
// is actually visited. Do NOT convert these back to static imports.

// Admin Pages
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Unauthorized = lazy(() => import('./pages/Unauthorized'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'))
const Products = lazy(() => import('./pages/Products'))
const PriceLists = lazy(() => import('./pages/PriceLists'))
const PriceListDetail = lazy(() => import('./pages/PriceListDetail'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderEditor = lazy(() => import('./pages/OrderEditor'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const Users = lazy(() => import('./pages/Users'))
const DocumentSettings = lazy(() => import('./pages/DocumentSettings'))
const PortalManagement = lazy(() => import('./pages/PortalManagement'))
const Invoices = lazy(() => import('./pages/Invoices'))
const OverdueInvoices = lazy(() => import('./pages/OverdueInvoices'))
const Outbox = lazy(() => import('./pages/Outbox'))
const Analytics = lazy(() => import('./pages/Analytics'))
const SoldProducts = lazy(() => import('./pages/SoldProducts'))

// Portal Pages (their own chunks — a customer never downloads the admin app)
const PortalLogin = lazy(() => import('./portal/PortalLogin'))
const PortalLayout = lazy(() => import('./portal/PortalLayout'))
const PortalHome = lazy(() => import('./portal/PortalHome'))
const PortalOrders = lazy(() => import('./portal/PortalOrders'))
const PortalOrderDetail = lazy(() => import('./portal/PortalOrderDetail'))
const PortalDocuments = lazy(() => import('./portal/PortalDocuments'))
const PortalAccount = lazy(() => import('./portal/PortalAccount'))

// Full-screen fallback while a lazy route chunk loads.
function ScreenLoader() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Portal Protected Route
function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePortalAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/portal/login" replace />
  }

  return <>{children}</>
}

// Portal Public Route (redirect to portal home if logged in)
function PortalPublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePortalAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/portal" replace />
  }

  return <>{children}</>
}

// Wrapper component for portal routes with its own auth provider
function PortalRoutes() {
  return (
    <PortalAuthProvider>
      <Suspense fallback={<ScreenLoader />}>
      <Routes>
        <Route
          path="login"
          element={
            <PortalPublicRoute>
              <PortalLogin />
            </PortalPublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <PortalProtectedRoute>
              <PortalLayout />
            </PortalProtectedRoute>
          }
        >
          <Route index element={<PortalHome />} />
          <Route path="orders" element={<PortalOrders />} />
          <Route path="orders/:id" element={<PortalOrderDetail />} />
          <Route path="documents" element={<PortalDocuments />} />
          <Route path="account" element={<PortalAccount />} />
        </Route>
      </Routes>
      </Suspense>
    </PortalAuthProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
            <ReminderAlert />
            <Suspense fallback={<ScreenLoader />}>
            <Routes>
              {/* ======================== */}
              {/* CUSTOMER PORTAL ROUTES */}
              {/* ======================== */}
              <Route path="/portal/*" element={<PortalRoutes />} />

              {/* ======================== */}
              {/* ADMIN ROUTES */}
              {/* ======================== */}
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <ResetPassword />
                }
              />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Routes - wrapped in Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route index element={<Dashboard />} />

                {/* Customers */}
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetail />} />

                {/* Products */}
                <Route path="products" element={<Products />} />
                <Route
                  path="price-lists"
                  element={
                    <OwnerRoute>
                      <PriceLists />
                    </OwnerRoute>
                  }
                />
                <Route
                  path="price-lists/:id"
                  element={
                    <OwnerRoute>
                      <PriceListDetail />
                    </OwnerRoute>
                  }
                />
                <Route path="sold-products" element={<SoldProducts />} />

                {/* Orders */}
                <Route path="orders" element={<Orders />} />
                <Route path="orders/new" element={<OrderEditor mode="new" />} />
                <Route path="orders/:id/edit" element={<OrderEditor mode="edit" />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="overdue" element={<OverdueInvoices />} />
                <Route
                  path="outbox"
                  element={
                    <OwnerRoute>
                      <Outbox />
                    </OwnerRoute>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <OwnerRoute>
                      <Analytics />
                    </OwnerRoute>
                  }
                />

                {/* Settings Routes (Owner Only) */}
                <Route
                  path="settings/users"
                  element={
                    <OwnerRoute>
                      <Users />
                    </OwnerRoute>
                  }
                />
                <Route
                  path="settings/audit-log"
                  element={
                    <OwnerRoute>
                      <AuditLog />
                    </OwnerRoute>
                  }
                />
                <Route
                  path="settings/documents"
                  element={
                    <OwnerRoute>
                      <DocumentSettings />
                    </OwnerRoute>
                  }
                />
                <Route
                  path="settings/portal"
                  element={
                    <OwnerRoute>
                      <PortalManagement />
                    </OwnerRoute>
                  }
                />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

// 404 Not Found component
function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-300 dark:text-slate-700 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Page Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}

export default App
