import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header />
        <main className="mt-16 px-6 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
