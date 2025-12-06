import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function TestConnection() {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing')
  const [message, setMessage] = useState('Testing Supabase connection...')
  const [details, setDetails] = useState<string[]>([])

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    const results: string[] = []

    try {
      // Test 1: Check Supabase client initialization
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      results.push('✓ Supabase client initialized')

      // Test 2: Test database connection
      const { data: testData, error: testError } = await supabase
        .from('products')
        .select('count')
        .limit(1)

      if (testError) {
        // Table might not exist yet, but connection works
        if (testError.code === '42P01') {
          results.push('⚠ Database connected, but tables not created yet')
          results.push('→ Please run the SQL migrations from supabase/SETUP.md')
        } else {
          throw testError
        }
      } else {
        results.push('✓ Database connection successful')
        results.push('✓ Tables exist and are accessible')
      }

      // Test 3: Check auth
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        results.push(`✓ User authenticated: ${session.user.email}`)
      } else {
        results.push('ℹ No user currently authenticated')
      }

      setStatus('success')
      setMessage('Supabase connection successful! 🎉')
      setDetails(results)
    } catch (error: any) {
      console.error('Connection test failed:', error)
      setStatus('error')
      setMessage('Connection failed')
      setDetails([
        `Error: ${error.message}`,
        '',
        'Please check:',
        '1. Your .env file has correct credentials',
        '2. Supabase project is active',
        '3. Network connection is working',
      ])
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Supabase Connection Test
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            MelekHalalFood B2B Portal
          </p>
        </div>

        <div className="flex items-center justify-center mb-6">
          {status === 'testing' && (
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          )}
          {status === 'error' && (
            <XCircle className="w-16 h-16 text-red-600" />
          )}
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {message}
          </h2>
        </div>

        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
            Test Results:
          </h3>
          <ul className="space-y-2">
            {details.map((detail, index) => (
              <li
                key={index}
                className="text-sm text-slate-700 dark:text-slate-300 font-mono"
              >
                {detail}
              </li>
            ))}
          </ul>
        </div>

        {status === 'success' && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Next Steps:</strong>
            </p>
            <ol className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1 list-decimal list-inside">
              <li>Run the SQL migrations from <code className="bg-green-100 dark:bg-green-900 px-1 rounded">supabase/SETUP.md</code></li>
              <li>Create your first admin user</li>
              <li>Start building the application!</li>
            </ol>
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={testConnection}
            className="mt-6 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            Retry Connection
          </button>
        )}
      </div>
    </div>
  )
}
