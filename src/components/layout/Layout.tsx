import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 ml-72">
        <Header />
        <main className="pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
