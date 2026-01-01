import { useState, useEffect, useRef } from 'react'
import {
  Save,
  Loader2,
  Building2,
  CreditCard,
  FileText,
  Tag,
  Settings,
  Upload,
  X,
  Trash2,
} from 'lucide-react'
import { useDocumentSettings } from '../hooks/useDocumentSettings'
import { supabase } from '../services/supabase'
import type { DocumentSettings } from '../types'

type TabId = 'company' | 'bank' | 'numbering' | 'labels'

interface TabConfig {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: TabConfig[] = [
  { id: 'company', label: 'Company', icon: <Building2 className="w-4 h-4" /> },
  { id: 'bank', label: 'Bank & Payment', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'numbering', label: 'Numbering', icon: <FileText className="w-4 h-4" /> },
  { id: 'labels', label: 'Labels', icon: <Tag className="w-4 h-4" /> },
]

export default function DocumentSettingsPage() {
  const { settings, loading, saving, error, save } = useDocumentSettings()
  const [activeTab, setActiveTab] = useState<TabId>('company')
  const [formData, setFormData] = useState<Partial<DocumentSettings>>({})
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const handleChange = (field: keyof DocumentSettings, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    try {
      await save(formData)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Error handled by hook
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Document Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure invoice, proforma, and other document settings
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <X className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">Settings saved successfully!</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        {activeTab === 'company' && (
          <CompanyTab formData={formData} onChange={handleChange} />
        )}
        {activeTab === 'bank' && (
          <BankTab formData={formData} onChange={handleChange} />
        )}
        {activeTab === 'numbering' && (
          <NumberingTab formData={formData} onChange={handleChange} />
        )}
        {activeTab === 'labels' && (
          <LabelsTab formData={formData} onChange={handleChange} />
        )}
      </div>
    </div>
  )
}

// =====================================================
// Company Tab
// =====================================================

interface TabProps {
  formData: Partial<DocumentSettings>
  onChange: (field: keyof DocumentSettings, value: string | number) => void
}

function CompanyTab({ formData, onChange }: TabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a PNG, JPEG, GIF, WebP, or SVG image')
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size must be less than 2MB')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop()
      const filename = `logo-${Date.now()}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filename, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filename)

      // Update form
      onChange('company_logo_url', publicUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload logo')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = async () => {
    if (!formData.company_logo_url) return

    try {
      // Extract filename from URL
      const url = new URL(formData.company_logo_url)
      const pathParts = url.pathname.split('/')
      const filename = pathParts[pathParts.length - 1]

      // Delete from storage
      await supabase.storage
        .from('company-assets')
        .remove([filename])

      // Clear from form
      onChange('company_logo_url', '')
    } catch {
      // Just clear from form even if delete fails
      onChange('company_logo_url', '')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Company Information
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          This information will appear on all generated documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Company Name *
          </label>
          <input
            type="text"
            value={formData.company_name || ''}
            onChange={e => onChange('company_name', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Your Company Name"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Street Address
          </label>
          <input
            type="text"
            value={formData.company_address || ''}
            onChange={e => onChange('company_address', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Street Name 123"
          />
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Postal Code
          </label>
          <input
            type="text"
            value={formData.company_postal_code || ''}
            onChange={e => onChange('company_postal_code', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="1234 AB"
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            City
          </label>
          <input
            type="text"
            value={formData.company_city || ''}
            onChange={e => onChange('company_city', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Amsterdam"
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Country
          </label>
          <input
            type="text"
            value={formData.company_country || 'Netherlands'}
            onChange={e => onChange('company_country', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.company_phone || ''}
            onChange={e => onChange('company_phone', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="+31 20 123 4567"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.company_email || ''}
            onChange={e => onChange('company_email', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="info@company.com"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Website
          </label>
          <input
            type="url"
            value={formData.company_website || ''}
            onChange={e => onChange('company_website', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="www.company.com"
          />
        </div>
      </div>

      {/* Legal Registration */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
          Legal Registration
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VAT Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              VAT Number (BTW)
            </label>
            <input
              type="text"
              value={formData.company_vat_number || ''}
              onChange={e => onChange('company_vat_number', e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="NL123456789B01"
            />
          </div>

          {/* KVK Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Chamber of Commerce (KVK)
            </label>
            <input
              type="text"
              value={formData.company_kvk_number || ''}
              onChange={e => onChange('company_kvk_number', e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="12345678"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
          Company Logo
        </h4>

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
          </div>
        )}

        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div className="relative">
            <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center overflow-hidden">
              {formData.company_logo_url ? (
                <img
                  src={formData.company_logo_url}
                  alt="Company logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Upload className="w-8 h-8 text-slate-400" />
              )}
            </div>
            {formData.company_logo_url && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Remove logo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className={`inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl cursor-pointer transition-colors ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </>
              )}
            </label>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              PNG, JPEG, GIF, WebP, or SVG. Max 2MB. Recommended: 200x60 pixels.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Bank Tab
// =====================================================

function BankTab({ formData, onChange }: TabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Bank & Payment Details
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Bank information for customer payments and invoice footer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Bank Name
          </label>
          <input
            type="text"
            value={formData.bank_name || ''}
            onChange={e => onChange('bank_name', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="ING Bank"
          />
        </div>

        {/* Account Holder */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Account Holder Name
          </label>
          <input
            type="text"
            value={formData.bank_account_holder || ''}
            onChange={e => onChange('bank_account_holder', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Your Company B.V."
          />
        </div>

        {/* IBAN */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            IBAN
          </label>
          <input
            type="text"
            value={formData.bank_iban || ''}
            onChange={e => onChange('bank_iban', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
            placeholder="NL00 INGB 0000 0000 00"
          />
        </div>

        {/* BIC */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            BIC / SWIFT
          </label>
          <input
            type="text"
            value={formData.bank_bic || ''}
            onChange={e => onChange('bank_bic', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
            placeholder="INGBNL2A"
          />
        </div>
      </div>

      {/* Payment Terms */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
          Payment Terms
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Days */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Payment Due (Days)
            </label>
            <input
              type="number"
              min="0"
              value={formData.payment_terms_days || 14}
              onChange={e => onChange('payment_terms_days', parseInt(e.target.value) || 14)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Due date will be calculated from invoice date
            </p>
          </div>

          {/* Terms Text */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Payment Terms Text
            </label>
            <textarea
              value={formData.payment_terms_text || ''}
              onChange={e => onChange('payment_terms_text', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Payment due within 14 days of invoice date."
            />
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
          Document Footer
        </h4>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Footer Text (appears at bottom of all documents)
          </label>
          <textarea
            value={formData.footer_text || ''}
            onChange={e => onChange('footer_text', e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            placeholder="Thank you for your business! For questions, please contact us."
          />
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Numbering Tab
// =====================================================

function NumberingTab({ formData, onChange }: TabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Document Numbering
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Configure prefix and starting numbers for each document type. Numbers are automatically incremented.
        </p>
      </div>

      <div className="space-y-6">
        {/* Invoice */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
            Invoice
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prefix
              </label>
              <input
                type="text"
                value={formData.invoice_prefix || 'INV-'}
                onChange={e => onChange('invoice_prefix', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Next Number
              </label>
              <input
                type="number"
                min="1"
                value={formData.invoice_next_number || 1}
                onChange={e => onChange('invoice_next_number', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Next invoice: <span className="font-mono font-medium">{formData.invoice_prefix || 'INV-'}{String(formData.invoice_next_number || 1).padStart(5, '0')}</span>
          </p>
        </div>

        {/* Proforma */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
            Proforma
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prefix
              </label>
              <input
                type="text"
                value={formData.proforma_prefix || 'PRO-'}
                onChange={e => onChange('proforma_prefix', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Next Number
              </label>
              <input
                type="number"
                min="1"
                value={formData.proforma_next_number || 1}
                onChange={e => onChange('proforma_next_number', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Next proforma: <span className="font-mono font-medium">{formData.proforma_prefix || 'PRO-'}{String(formData.proforma_next_number || 1).padStart(5, '0')}</span>
          </p>
        </div>

        {/* Credit Note */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
            Credit Note
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prefix
              </label>
              <input
                type="text"
                value={formData.credit_note_prefix || 'CN-'}
                onChange={e => onChange('credit_note_prefix', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Next Number
              </label>
              <input
                type="number"
                min="1"
                value={formData.credit_note_next_number || 1}
                onChange={e => onChange('credit_note_next_number', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Next credit note: <span className="font-mono font-medium">{formData.credit_note_prefix || 'CN-'}{String(formData.credit_note_next_number || 1).padStart(5, '0')}</span>
          </p>
        </div>

        {/* Packing Slip */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
            Packing Slip (Pakbon)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prefix
              </label>
              <input
                type="text"
                value={formData.packing_slip_prefix || 'PS-'}
                onChange={e => onChange('packing_slip_prefix', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Next Number
              </label>
              <input
                type="number"
                min="1"
                value={formData.packing_slip_next_number || 1}
                onChange={e => onChange('packing_slip_next_number', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Next packing slip: <span className="font-mono font-medium">{formData.packing_slip_prefix || 'PS-'}{String(formData.packing_slip_next_number || 1).padStart(5, '0')}</span>
          </p>
        </div>

        {/* Order Confirmation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
            Order Confirmation (Orderbevestiging)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prefix
              </label>
              <input
                type="text"
                value={formData.order_confirmation_prefix || 'OB-'}
                onChange={e => onChange('order_confirmation_prefix', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Next Number
              </label>
              <input
                type="number"
                min="1"
                value={formData.order_confirmation_next_number || 1}
                onChange={e => onChange('order_confirmation_next_number', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Next order confirmation: <span className="font-mono font-medium">{formData.order_confirmation_prefix || 'OB-'}{String(formData.order_confirmation_next_number || 1).padStart(5, '0')}</span>
          </p>
        </div>

        {/* Payment Reminder */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
            Payment Reminder (Betalingsherinnering)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prefix
              </label>
              <input
                type="text"
                value={formData.payment_reminder_prefix || 'HR-'}
                onChange={e => onChange('payment_reminder_prefix', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Next Number
              </label>
              <input
                type="number"
                min="1"
                value={formData.payment_reminder_next_number || 1}
                onChange={e => onChange('payment_reminder_next_number', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Next payment reminder: <span className="font-mono font-medium">{formData.payment_reminder_prefix || 'HR-'}{String(formData.payment_reminder_next_number || 1).padStart(5, '0')}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Labels Tab
// =====================================================

function LabelsTab({ formData, onChange }: TabProps) {
  const labelGroups = [
    {
      title: 'Document Titles',
      fields: [
        { key: 'label_invoice', label: 'Invoice Title', default: 'FACTUUR' },
        { key: 'label_proforma', label: 'Proforma Title', default: 'PROFORMA' },
        { key: 'label_credit_note', label: 'Credit Note Title', default: 'CREDITNOTA' },
        { key: 'label_packing_slip', label: 'Packing Slip Title', default: 'PAKBON' },
        { key: 'label_order_confirmation', label: 'Order Confirmation Title', default: 'ORDERBEVESTIGING' },
        { key: 'label_payment_reminder', label: 'Payment Reminder Title', default: 'BETALINGSHERINNERING' },
      ],
    },
    {
      title: 'Header Labels',
      fields: [
        { key: 'label_invoice_address', label: 'Invoice Address Label', default: 'FACTUURADRES' },
        { key: 'label_date', label: 'Date Label', default: 'Datum' },
        { key: 'label_customer_number', label: 'Customer Number Label', default: 'Klantnummer' },
        { key: 'label_due_date', label: 'Due Date Label', default: 'Vervaldatum' },
      ],
    },
    {
      title: 'Table Headers',
      fields: [
        { key: 'label_description', label: 'Description', default: 'Omschrijving' },
        { key: 'label_quantity', label: 'Quantity', default: 'Aantal' },
        { key: 'label_unit', label: 'Unit', default: 'Eenheid' },
        { key: 'label_unit_price', label: 'Unit Price', default: 'Prijs' },
        { key: 'label_vat', label: 'VAT', default: 'BTW' },
        { key: 'label_total', label: 'Total', default: 'Totaal' },
      ],
    },
    {
      title: 'Totals',
      fields: [
        { key: 'label_subtotal', label: 'Subtotal', default: 'Subtotaal' },
        { key: 'label_grand_total', label: 'Grand Total', default: 'Totaal te betalen' },
      ],
    },
    {
      title: 'Payment Section',
      fields: [
        { key: 'label_payment_method', label: 'Payment Method Header', default: 'BETAALWIJZE (AANKRUISEN)' },
        { key: 'label_cash', label: 'Cash Option', default: 'Contant' },
        { key: 'label_bank', label: 'Bank Option', default: 'Bank' },
        { key: 'label_on_account', label: 'On Account Option', default: 'Op rekening' },
      ],
    },
    {
      title: 'Approval Section',
      fields: [
        { key: 'label_for_approval', label: 'Approval Header', default: 'VOOR AKKOORD' },
        { key: 'label_name', label: 'Name Field', default: 'Naam' },
        { key: 'label_signature', label: 'Signature Field', default: 'Handtekening' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Document Labels
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Customize all text labels that appear on your documents. Default values are in Dutch.
        </p>
      </div>

      {labelGroups.map(group => (
        <div key={group.title} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
            {group.title}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={(formData as Record<string, unknown>)[field.key] as string || field.default}
                  onChange={e => onChange(field.key as keyof DocumentSettings, e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={field.default}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
