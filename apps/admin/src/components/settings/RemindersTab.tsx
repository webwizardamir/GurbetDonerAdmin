import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Plus, Trash2, Mail, AlertTriangle } from 'lucide-react'
import type {
  ClientReminderConfig,
  ClientReminderStep,
  DocumentSettings,
  EmailLang,
  LocalizedEmailTemplates,
  PaymentOverviewKey,
  ReminderStepKey,
  ReminderTone,
} from '../../types'
import {
  getTemplate,
  normalizeEmailTemplates,
  OVERVIEW_PLACEHOLDER_KEYS,
  REMINDER_PLACEHOLDER_KEYS,
} from '../../services/documentEmail'
import { DEFAULT_CLIENT_REMINDER_CONFIG } from '../../services/invoiceReminders'
import { normalizeInactiveAlert } from '../../services/customerActivity'
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from '../../constants/customerType'
import LangTabs from './LangTabs'

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
  onTemplatesChange: (templates: LocalizedEmailTemplates) => void
}

export default function RemindersTab({ formData, onConfigChange, onTemplatesChange }: RemindersTabProps) {
  const { t } = useTranslation()
  const [lang, setLang] = useState<EmailLang>('nl')
  const cfg: ClientReminderConfig = {
    ...DEFAULT_CLIENT_REMINDER_CONFIG,
    ...(formData.client_reminder_config ?? {}),
  }
  const localized = normalizeEmailTemplates(formData.email_templates)
  const templates = localized[lang]
  const placeholderChips = useMemo(() => REMINDER_PLACEHOLDER_KEYS.map(k => `{{${k}}}`), [])
  const overviewChips = useMemo(() => OVERVIEW_PLACEHOLDER_KEYS.map(k => `{{${k}}}`), [])

  const patch = (p: Partial<ClientReminderConfig>) => onConfigChange({ ...cfg, ...p })

  // Klantactiviteit lives one level down in the same JSONB blob, so it gets its
  // own patcher rather than spreading a nested object at every call site.
  const ia = normalizeInactiveAlert(cfg.inactive_alert)
  const patchIa = (p: Partial<typeof ia>) => patch({ inactive_alert: { ...ia, ...p } })

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

  const updateTemplate = (
    key: ReminderStepKey | PaymentOverviewKey,
    field: 'subject' | 'body',
    value: string,
  ) => {
    const existing = templates[key] ?? { subject: '', body: '' }
    const nextLang = { ...templates, [key]: { ...existing, [field]: value } }
    onTemplatesChange({ ...localized, [lang]: nextLang })
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

      {/* Initial invoice auto-send (24h after order creation) */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.reminders.autoInvoice.title')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.reminders.autoInvoice.subtitle')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.initial_invoice_send_enabled === true}
            onClick={() => patch({ initial_invoice_send_enabled: !(cfg.initial_invoice_send_enabled === true) })}
            className={toggleClass(cfg.initial_invoice_send_enabled === true)}
          >
            <span className={knobClass(cfg.initial_invoice_send_enabled === true)} />
          </button>
        </div>
      </div>

      {/* Monthly Betaaloverzicht (statement of account, 1st working day) —
          deliberately its OWN toggle, not folded under the dunning kill switch
          below: a statement also goes to customers who are entirely within
          terms, so it is not part of the escalation ladder. */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.reminders.monthlyOverview.title')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.reminders.monthlyOverview.subtitle')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.monthly_overview_enabled === true}
            onClick={() => patch({ monthly_overview_enabled: !(cfg.monthly_overview_enabled === true) })}
            className={toggleClass(cfg.monthly_overview_enabled === true)}
          >
            <span className={knobClass(cfg.monthly_overview_enabled === true)} />
          </button>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">{t('settings.reminders.monthlyOverview.note')}</p>
        </div>

        {/* Email copy — same LangTabs pattern as the escalation copy below. */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.reminders.monthlyOverview.copyTitle')}</h4>
            <LangTabs lang={lang} onChange={setLang} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.documents.email.placeholdersTitle')} {overviewChips.join(' ')}
          </p>
          <input
            type="text"
            value={templates.payment_overview?.subject ?? ''}
            placeholder={getTemplate(localized, 'payment_overview', lang).subject}
            onChange={e => updateTemplate('payment_overview', 'subject', e.target.value)}
            className={inputClass}
          />
          <textarea
            rows={7}
            value={templates.payment_overview?.body ?? ''}
            placeholder={getTemplate(localized, 'payment_overview', lang).body}
            onChange={e => updateTemplate('payment_overview', 'body', e.target.value)}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>
      </div>

      {/* Klantactiviteit — the daily "these customers stopped ordering" digest.
          The one card on this tab whose mail goes to the OWNER rather than to a
          customer, which is why it carries its own hour and its own recipients
          and sits outside the dunning kill switch below. */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.reminders.inactive.title')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.reminders.inactive.subtitle')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={ia.enabled}
            onClick={() => patchIa({ enabled: !ia.enabled })}
            className={toggleClass(ia.enabled)}
          >
            <span className={knobClass(ia.enabled)} />
          </button>
        </div>

        {ia.enabled && (
          <>
            {/* Frequency is the SEND rhythm; "herhalen" further down only thins
                a daily mail. Keeping them apart is what makes "one mail a week"
                expressible at all. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={t('settings.reminders.inactive.frequency')}>
                <select
                  value={ia.frequency}
                  onChange={e => patchIa({ frequency: e.target.value as typeof ia.frequency })}
                  className={inputClass}
                >
                  <option value="daily">{t('settings.reminders.inactive.freqDaily')}</option>
                  <option value="weekly">{t('settings.reminders.inactive.freqWeekly')}</option>
                  <option value="monthly">{t('settings.reminders.inactive.freqMonthly')}</option>
                </select>
              </Field>

              {ia.frequency === 'weekly' ? (
                <Field label={t('settings.reminders.inactive.weekday')}>
                  <select
                    value={ia.weekday}
                    onChange={e => patchIa({ weekday: +e.target.value })}
                    className={inputClass}
                  >
                    {/* Value order follows the cron's own convention (0 = Sunday),
                        but the list reads Monday first, like a Dutch calendar. */}
                    {[1, 2, 3, 4, 5, 6, 0].map(d => (
                      <option key={d} value={d}>{t(`settings.reminders.inactive.weekdays.${d}`)}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div />
              )}

              <Field label={t('settings.reminders.inactive.hour')}>
                <input
                  type="number" min={0} max={23}
                  value={ia.hour}
                  onChange={e => patchIa({ hour: clamp(+e.target.value, 0, 23) })}
                  className={inputClass}
                />
              </Field>
            </div>

            {/* A chosen weekday is the choice, so this only applies to a daily
                rhythm. Monthly keeps it: it decides whether a 1st that falls in
                the weekend rolls forward to the Monday. */}
            {ia.frequency !== 'weekly' && (
              <label className="flex items-center gap-3">
                <button
                  type="button" role="switch" aria-checked={ia.working_days_only}
                  onClick={() => patchIa({ working_days_only: !ia.working_days_only })}
                  className={toggleClass(ia.working_days_only)}
                >
                  <span className={knobClass(ia.working_days_only)} />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {ia.frequency === 'monthly'
                    ? t('settings.reminders.inactive.monthlyWorkingDay')
                    : t('settings.reminders.autoSend.workingDaysOnly')}
                </span>
              </label>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(`settings.reminders.inactive.freqHint.${ia.frequency}`, {
                day: t(`settings.reminders.inactive.weekdays.${ia.weekday}`),
                hour: String(ia.hour).padStart(2, '0'),
              })}
            </p>

            {/* Empty means the owner's own login address, so "default to the
                admin email" needs no stored value and never goes stale. */}
            <Field label={t('settings.reminders.inactive.recipients')}>
              <input
                type="text"
                value={ia.recipients.join(', ')}
                placeholder={t('settings.reminders.inactive.recipientsPlaceholder')}
                onChange={e => patchIa({
                  recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                })}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settings.reminders.inactive.recipientsHint')}</p>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Only meaningful for a daily rhythm: a weekly or monthly digest
                  always lists everyone who is currently quiet. */}
              {ia.frequency === 'daily' ? (
                <Field label={t('settings.reminders.inactive.repeat')}>
                  <select
                    value={ia.repeat_days}
                    onChange={e => patchIa({ repeat_days: +e.target.value })}
                    className={inputClass}
                  >
                    <option value={0}>{t('settings.reminders.inactive.repeatDaily')}</option>
                    <option value={7}>{t('settings.reminders.inactive.repeatWeekly')}</option>
                    <option value={14}>{t('settings.reminders.inactive.repeatBiweekly')}</option>
                  </select>
                </Field>
              ) : (
                <div />
              )}
              <label className="flex items-center gap-3 pt-7">
                <button
                  type="button" role="switch" aria-checked={ia.attach_pdf}
                  onClick={() => patchIa({ attach_pdf: !ia.attach_pdf })}
                  className={toggleClass(ia.attach_pdf)}
                >
                  <span className={knobClass(ia.attach_pdf)} />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('settings.reminders.inactive.attachPdf')}</span>
              </label>
            </div>

            {/* Per-type rules. The switch is what makes "not monitored"
                unambiguous: an empty number field reads as a mistake. */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.reminders.inactive.rulesTitle')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.reminders.inactive.rulesHint')}</p>
              {CUSTOMER_TYPES.map(ct => {
                const days = ia.by_type[ct]
                const on = days != null
                return (
                  <div key={ct} className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button" role="switch" aria-checked={on}
                      aria-label={CUSTOMER_TYPE_LABELS[ct]}
                      onClick={() => patchIa({ by_type: { ...ia.by_type, [ct]: on ? null : 30 } })}
                      className={toggleClass(on)}
                    >
                      <span className={knobClass(on)} />
                    </button>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{CUSTOMER_TYPE_LABELS[ct]}</span>
                    {on ? (
                      <>
                        <input
                          type="number" min={1} max={3650}
                          value={days ?? 30}
                          onChange={e => patchIa({ by_type: { ...ia.by_type, [ct]: clamp(+e.target.value, 1, 3650) } })}
                          className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-28">
                          {t('settings.reminders.inactive.daysSuffix')} · {friendlyDays(days ?? 30, t)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.reminders.inactive.notMonitored')}</span>
                    )}
                  </div>
                )
              })}

              {/* Untagged customers get their own line rather than silently
                  falling into "Overig", which is a real customer type here. */}
              <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button" role="switch" aria-checked={ia.default_days != null}
                  aria-label={t('settings.reminders.inactive.untagged')}
                  onClick={() => patchIa({ default_days: ia.default_days != null ? null : 30 })}
                  className={toggleClass(ia.default_days != null)}
                >
                  <span className={knobClass(ia.default_days != null)} />
                </button>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{t('settings.reminders.inactive.untagged')}</span>
                {ia.default_days != null ? (
                  <>
                    <input
                      type="number" min={1} max={3650}
                      value={ia.default_days}
                      onChange={e => patchIa({ default_days: clamp(+e.target.value, 1, 3650) })}
                      className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-28">
                      {t('settings.reminders.inactive.daysSuffix')} · {friendlyDays(ia.default_days, t)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.reminders.inactive.notMonitored')}</span>
                )}
              </div>
            </div>

            {/* 133 of 251 live customers have no order at all (import leftovers).
                Including them buries the customers who actually stopped. */}
            <label className="flex items-start gap-3">
              <button
                type="button" role="switch" aria-checked={ia.include_never_ordered}
                onClick={() => patchIa({ include_never_ordered: !ia.include_never_ordered })}
                className={`${toggleClass(ia.include_never_ordered)} mt-0.5 shrink-0`}
              >
                <span className={knobClass(ia.include_never_ordered)} />
              </button>
              <span>
                <span className="block text-sm text-slate-700 dark:text-slate-300">{t('settings.reminders.inactive.includeNever')}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{t('settings.reminders.inactive.includeNeverHint')}</span>
              </span>
            </label>
          </>
        )}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.reminders.copy.title')}</h3>
          </div>
          <LangTabs lang={lang} onChange={setLang} />
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
          const effective = getTemplate(localized, key, lang)
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

/** "30 dagen" is the stored truth; "1 maand" is how the owner thinks about it,
 *  so the input shows both rather than making him translate. */
function friendlyDays(days: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (days % 30 === 0 && days >= 30) return t('settings.reminders.inactive.months', { count: days / 30 })
  if (days % 7 === 0) return t('settings.reminders.inactive.weeks', { count: days / 7 })
  return t('settings.reminders.inactive.days', { count: days })
}

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
