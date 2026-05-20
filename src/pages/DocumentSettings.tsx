import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Save,
  Loader2,
  Building2,
  CreditCard,
  FileText,
  Tag,
  Mail,
  Settings,
  X,
} from 'lucide-react'
import { useDocumentSettings } from '../hooks/useDocumentSettings'
import type { DocumentSettings, EmailTemplateMap } from '../types'
import CompanyTab from '../components/settings/CompanyTab'
import BankPaymentTab from '../components/settings/BankPaymentTab'
import NumberingTab from '../components/settings/NumberingTab'
import LabelsTab from '../components/settings/LabelsTab'
import EmailTab from '../components/settings/EmailTab'

type TabId = 'company' | 'bank' | 'numbering' | 'labels' | 'email'

interface TabConfig {
  id: TabId
  labelKey: string
  icon: React.ReactNode
}

const tabs: TabConfig[] = [
  { id: 'company', labelKey: 'settings.documents.tabs.company', icon: <Building2 className="w-4 h-4" /> },
  { id: 'bank', labelKey: 'settings.documents.tabs.bank', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'numbering', labelKey: 'settings.documents.tabs.numbering', icon: <FileText className="w-4 h-4" /> },
  { id: 'labels', labelKey: 'settings.documents.tabs.labels', icon: <Tag className="w-4 h-4" /> },
  { id: 'email', labelKey: 'settings.documents.tabs.email', icon: <Mail className="w-4 h-4" /> },
]

export default function DocumentSettingsPage() {
  const { t } = useTranslation()
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

  const handleTemplatesChange = (templates: EmailTemplateMap) => {
    setFormData(prev => ({ ...prev, email_templates: templates }))
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
              {t('settings.documents.title')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('settings.documents.configureDescription')}
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
          {saving ? t('common.saving') : t('settings.documents.saveChanges')}
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
          <p className="text-sm text-green-700 dark:text-green-300">{t('settings.documents.savedSuccess')}</p>
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
              {t(tab.labelKey)}
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
          <BankPaymentTab formData={formData} onChange={handleChange} />
        )}
        {activeTab === 'numbering' && (
          <NumberingTab formData={formData} onChange={handleChange} />
        )}
        {activeTab === 'labels' && (
          <LabelsTab formData={formData} onChange={handleChange} />
        )}
        {activeTab === 'email' && (
          <EmailTab formData={formData} onChange={handleChange} onTemplatesChange={handleTemplatesChange} />
        )}
      </div>
    </div>
  )
}
