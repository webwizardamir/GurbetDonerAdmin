import { Link } from 'react-router-dom'
import { ShieldX, ArrowLeft, Home } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
          <ShieldX className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Access Denied
        </h1>

        <p className="text-slate-600 dark:text-slate-400 mb-8">
          You don't have permission to access this page. If you believe this is an error,
          please contact your administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
