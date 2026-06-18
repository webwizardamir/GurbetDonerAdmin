import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Plus, Trash2, Mail, AlertTriangle } from 'lucide-react'
import type {
  ClientReminderConfig,
  ClientReminderStep,
  DocumentSettings,
  EmailTemplateMap,
  ReminderStepKey,
  ReminderTone,
} from '../../types'
import { getTemplate, REMINDER_PLACEHOLDER_KEYS } from '../../services/documentEmail'
import { DEFAULT_CLIENT_REMINDER_CONFIG } from '../../services/invoiceReminders'

// One template per tone; the schedule references templates via tone.
const TONE_TEMPLATE: Record<ReminderTone, ReminderStepKey> = {
  gentle: 'payment_reminder_1',
  second: 'payment_reminder_2',
  final: 'payment_reminder_final',
}
const TONES: ReminderTone[] = ['gentle', 'second', 'final']

interface RemindersTabProps {
  formData: Partial<DocumentSettings>
  onConfigChange: (config: ClientReminderConfig) => void
  onTemplatesChange: (templates: EmailTemplateMap) => void
}

export default function RemindersTab({ formData, onConfigChange, onTemplatesChange }: RemindersTabProps) {
  const { t } = useTranslation()
  const cfg: ClientReminderConfig = {
    ...DEFAULT_CLIENT_REMINDER_CONFIG,
    ...(formData.client_reminder_config ?? {}),
  }
  const templates = (formData.email_templates ?? {}) as EmailTemplateMap
  const placeholderChips = useMemo(() => REMINDER_PLACEHOLDER_KEYS.map(k => `{{${k}}}`), [])

  const patch = (p: Partial<ClientReminderConfig>) => onConfigChange({ ...cfg, ...p })

  const updateStep = (idx: number, p: Partial<ClientReminderStep>) => {
    const steps = cfg.steps.map((s, i) => {
      if (i !== idx) return s
      const next = { ...s, ...p }
      if (p.tone) next.template_key = TONE_TEMPLATE[p.tone]
      return next
    })
    patch({ steps })
  }
  const addStep = () => {
    const last = cfg.steps[cfg.steps.length - 1]
    patch({
      steps: [...cfg.steps, {
        days_after_due: (last?.days_after_due ?? 0) + 7,
        tone: 'final',
        template_key: TONE_TEMPLATE.final,
      }],
    })
  }
  const removeStep = (idx: number) => patch({ steps: cfg.steps.filter((_, i) => i !== idx) })

  const updateTemplate = (key: ReminderStepKey, field: 'subject' | 'body', value: string) => {
    const existing = templates[key] ?? { subject: '', body: '' }
    onTemplatesChange({ ...templates, [key]: { ...existing, [field]: value } })
  }

  const toggleClass = (on: boolean) =>
    `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'}`
  const knobClass = (on: boolean) =>
    `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`

  return (
    <div className="space-y-6">
      {/* In-app queue note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">{t('settings.reminders.queueNote')}</p>
      </div>

      {/* Auto-send kill switch */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.reminders.autoSend.title')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.reminders.autoSend.subtitle')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.auto_send_enabled}
            onClick={() => patch({ auto_send_enabled: !cfg.auto_send_enabled })}
            className={toggleClass(cfg.auto_send_enabled)}
          >
            <span className={knobClass(cfg.auto_send_enabled)} />
          </button>
        </div>

        {cfg.auto_send_enabled && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">{t('settings.reminders.autoSend.warning')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('settings.reminders.autoSend.sendHour')}>
            <input
              type="number" min={0} max={23}
              value={cfg.send_hour}
              onChange={e => patch({ send_hour: clamp(+e.target.value, 0, 23) })}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-3 pt-7">
            <button
              type="button" role="switch" aria-checked={cfg.working_days_only}
              onClick={() => patch({ working_days_only: !cfg.working_days_only })}
              className={toggleClass(cfg.working_days_only)}
            >
              <span className={knobClass(cfg.working_days_only)} />
            </button>
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('settings.reminders.autoSend.workingDaysOnly')}</span>
          </label>
        </div>
      </div>

      {/* Escalation schedule */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.reminders.schedule.title')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.reminders.schedule.subtitle')}</p>
        </div>

        <div className="space-y-2">
          {cfg.steps.map((step, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
              <span className="text-sm font-semibold text-slate-400 w-6">{idx + 1}.</span>
              <Field label={t('settings.reminders.schedule.daysAfterDue')} className="w-32">
                <input
                  type="number" min={0}
                  value={step.days_after_due}
                  onChange={e => updateStep(idx, { days_after_due: clamp(+e.target.value, 0, 3650) })}
                  className={inputClass}
                />
              </Field>
              <Field label={t('settings.reminders.schedule.tone')} className="w-44">
                <select
                  value={step.tone}
                  onChange={e => updateStep(idx, { tone: e.target.value as ReminderTone })}
                  className={inputClass}
                >
                  {TONES.map(tone => (
                    <option key={tone} value={tone}>{t(`settings.reminders.tones.${tone}`)}</option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                onClick={() => removeStep(idx)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                title={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStep}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            {t('settings.reminders.schedule.addStep')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
          <Field label={t('settings.reminders.schedule.repeatInterval')} hint={t('settings.reminders.schedule.repeatHint')}>
            <input
              type="number" min={1}
              value={cfg.repeat_interval_days}
              onChange={e => patch({ repeat_interval_days: clamp(+e.target.value, 1, 365) })}
              className={inputClass}
            />
          </Field>
          <Field label={t('settings.reminders.schedule.maxCount')} hint={t('settings.reminders.schedule.maxHint')}>
            <input
              type="number" min={1}
              value={cfg.max_count}
              onChange={e => patch({ max_count: clamp(+e.target.value, 1, 20) })}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      {/* Per-tone email copy */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.reminders.copy.title')}</h3>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">{t('settings.documents.email.placeholdersTitle')}</p>
          <div className="flex flex-wrap gap-1">
            {placeholderChips.map(p => (
              <code key={p} className="px-2 py-0.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300">{p}</code>
            ))}
          </div>
        </div>

        {TONES.map(tone => {
          const key = TONE_TEMPLATE[tone]
          const effective = getTemplate(templates, key)
          const subject = templates[key]?.subject ?? ''
          const body = templates[key]?.body ?? ''
          const isDefault = !subject && !body
          return (
            <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900 dark:text-white">{t(`settings.reminders.tones.${tone}`)}</h4>
                {isDefault && <span className="text-xs text-slate-500 dark:text-slate-400 italic">{t('settings.documents.email.usingDefault')}</span>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('settings.documents.email.subjectLabel')}</label>
                <input
                  type="text" value={subject} placeholder={effective.subject}
                  onChange={e => updateTemplate(key, 'subject', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('settings.documents.email.bodyLabel')}</label>
                <textarea
                  value={body} placeholder={effective.body} rows={6}
                  onChange={e => updateTemplate(key, 'body', e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500'

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function Field({ label, hint, className = '', children }: {
  label: string; hint?: string; className?: string; children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}
