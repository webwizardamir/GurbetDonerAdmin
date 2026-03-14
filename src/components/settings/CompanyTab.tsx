// Company information tab for document settings.
// Handles company name, address, legal registration, and logo upload.

import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Upload, Trash2 } from 'lucide-react'
import { supabase } from '../../services/supabase'
import type { DocumentSettings } from '../../types'

export interface CompanyTabProps {
  formData: Partial<DocumentSettings>
  onChange: (field: keyof DocumentSettings, value: string | number) => void
}

export default function CompanyTab({ formData, onChange }: CompanyTabProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setUploadError(t('settings.documents.company.uploadError'))
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(t('settings.documents.company.fileSizeError'))
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
          {t('settings.documents.company.title')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.documents.company.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.company.companyNameLabel')}
          </label>
          <input
            type="text"
            value={formData.company_name || ''}
            onChange={e => onChange('company_name', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.company.companyNamePlaceholder')}
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.company.streetAddress')}
          </label>
          <input
            type="text"
            value={formData.company_address || ''}
            onChange={e => onChange('company_address', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.company.streetPlaceholder')}
          />
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.company.postalCode')}
          </label>
          <input
            type="text"
            value={formData.company_postal_code || ''}
            onChange={e => onChange('company_postal_code', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.company.postalCodePlaceholder')}
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.company.city')}
          </label>
          <input
            type="text"
            value={formData.company_city || ''}
            onChange={e => onChange('company_city', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.company.cityPlaceholder')}
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.company.country')}
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
            {t('settings.documents.company.phone')}
          </label>
          <input
            type="tel"
            value={formData.company_phone || ''}
            onChange={e => onChange('company_phone', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.company.phonePlaceholder')}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.company.email')}
          </label>
          <input
            type="email"
            value={formData.company_email || ''}
            onChange={e => onChange('company_email', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.company.emailPlaceholder')}
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('settings.documents.company.website')}
          </label>
          <input
            type="url"
            value={formData.company_website || ''}
            onChange={e => onChange('company_website', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t('settings.documents.company.websitePlaceholder')}
          />
        </div>
      </div>

      {/* Legal Registration */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
          {t('settings.documents.company.legalRegistration')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VAT Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.documents.company.vatNumber')}
            </label>
            <input
              type="text"
              value={formData.company_vat_number || ''}
              onChange={e => onChange('company_vat_number', e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder={t('settings.documents.company.vatPlaceholder')}
            />
          </div>

          {/* KVK Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.documents.company.kvkNumber')}
            </label>
            <input
              type="text"
              value={formData.company_kvk_number || ''}
              onChange={e => onChange('company_kvk_number', e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder={t('settings.documents.company.kvkPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">
          {t('settings.documents.company.companyLogo')}
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
                  {t('settings.documents.company.uploading')}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {t('settings.documents.company.uploadLogo')}
                </>
              )}
            </label>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('settings.documents.company.logoHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
