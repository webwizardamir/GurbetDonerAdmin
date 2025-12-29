import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, OwnerRoute, PublicRoute } from './components/auth'
import Layout from './components/layout/Layout'

// Pages
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Unauthorized from './pages/Unauthorized'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Products from './pages/Products'
import AuditLog from './pages/AuditLog'
import Users from './pages/Users'
import TestConnection from './pages/TestConnection'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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

            {/* Products */}
            <Route path="products" element={<Products />} />

            {/* Placeholder routes for future phases */}
            <Route path="orders" element={<ComingSoon title="Orders" />} />
            <Route path="invoices" element={<ComingSoon title="Invoices" />} />
            <Route
              path="analytics"
              element={
                <OwnerRoute>
                  <ComingSoon title="Analytics" />
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
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Temporary coming soon component
function ComingSoon({ title: _title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <span className="text-2xl">🚧</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          This feature is coming soon.
        </p>
      </div>
    </div>
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
