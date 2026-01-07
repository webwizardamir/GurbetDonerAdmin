import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PortalAuthProvider, usePortalAuth } from './context/PortalAuthContext'
import { ProtectedRoute, OwnerRoute, PublicRoute } from './components/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/layout/Layout'
import ReminderAlert from './components/ReminderAlert'

// Admin Pages
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Unauthorized from './pages/Unauthorized'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Products from './pages/Products'
import Orders from './pages/Orders'
import AuditLog from './pages/AuditLog'
import Users from './pages/Users'
import DocumentSettings from './pages/DocumentSettings'
import Invoices from './pages/Invoices'
import Analytics from './pages/Analytics'
import SoldProducts from './pages/SoldProducts'
import TestConnection from './pages/TestConnection'

// Portal Pages
import PortalLogin from './portal/PortalLogin'
import PortalLayout from './portal/PortalLayout'
import PortalHome from './portal/PortalHome'
import PortalOrders from './portal/PortalOrders'
import PortalOrderDetail from './portal/PortalOrderDetail'
import PortalDocuments from './portal/PortalDocuments'
import PortalAccount from './portal/PortalAccount'

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
    </PortalAuthProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
            <ReminderAlert />
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

                {/* Test Connection (temporary) */}
                <Route path="test-connection" element={<TestConnection />} />

                {/* Customers */}
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetail />} />

                {/* Products */}
                <Route path="products" element={<Products />} />
                <Route path="sold-products" element={<SoldProducts />} />

                {/* Orders */}
                <Route path="orders" element={<Orders />} />
                <Route path="invoices" element={<Invoices />} />
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
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
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
