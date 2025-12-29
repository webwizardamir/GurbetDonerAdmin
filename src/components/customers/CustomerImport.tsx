import { useState, useRef } from 'react'
import { X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../services/supabase'

interface CustomerImportProps {
  onClose: () => void
  onComplete: () => void
}

interface ImportResult {
  success: number
  skipped: number
  errors: string[]
}

export default function CustomerImport({ onClose, onComplete }: CustomerImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    // Parse header - handle both comma and semicolon separators
    const separator = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''))

    return lines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/"/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((header, i) => {
        row[header] = values[i] || ''
      })
      return row
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      let success = 0
      let skipped = 0
      const errors: string[] = []

      // Process in batches of 50
      const batchSize = 50
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)

        const customersToInsert = batch
          .map(row => {
            // Map WooCommerce columns to our schema
            const name = row['Gebruikersnaam']?.trim()
            const email = row['E-mail']?.trim()
            const city = row['Plaats']?.trim()
            const postalCode = row['Postcode']?.trim()

            // Skip if no email (can't create without identifier)
            if (!email) {
              skipped++
              return null
            }

            // Use email as company name if name is empty
            const companyName = name || email.split('@')[0]

            return {
              company_name: companyName,
              email: email,
              billing_city: city || null,
              billing_postal_code: postalCode || null,
              billing_country: 'NL',
              shipping_same_as_billing: true,
              created_by: userId,
            }
          })
          .filter(Boolean)

        if (customersToInsert.length > 0) {
          const { error } = await supabase
            .from('customers')
            .insert(customersToInsert)

          if (error) {
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
          } else {
            success += customersToInsert.length
          }
        }
      }

      setResult({ success, skipped, errors })
      if (success > 0) {
        onComplete()
      }
    } catch (err) {
      setResult({
        success: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Failed to parse CSV'],
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Import Customers
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Upload a CSV file with columns: Gebruikersnaam, E-mail, Plaats, Postcode
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:border-green-500 hover:text-green-600 transition-colors"
              >
                <Upload className="w-5 h-5" />
                {file ? file.name : 'Select CSV file'}
              </button>

              {file && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Import Customers
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {result.success > 0 && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-300">
                    {result.success} customers imported successfully
                  </span>
                </div>
              )}

              {result.skipped > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-amber-800 dark:text-amber-300">
                    {result.skipped} rows skipped (no email)
                  </span>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    Errors:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
