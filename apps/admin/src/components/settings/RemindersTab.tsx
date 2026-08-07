import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Info, Plus, Trash2, Mail, AlertTriangle, ChevronDown, ChevronRight,
  Receipt, BellRing, CalendarDays, UserX, Clock,
} from 'lucide-react'
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

// ===========================================================================
// Reminders settings.
//
// FOUR unrelated mails are configured here, and the page used to present them
// as seven equal blocks in the order they were built, with the dunning system
// split across three of them (kill switch, ladder, copy) and the internal
// digest wedged in between. It is now grouped by WHO RECEIVES THE MAIL, which
// is the only distinction that changes how you reason about a setting:
//
//   Naar klanten   factuur bij aanmaak · betaalherinneringen · betaaloverzicht
//   Naar jezelf    klantactiviteit
//
// 🚨 A toggle here governs AUTOMATIC sending only. The escalation ladder and
// every email text are also used by the MANUAL send buttons on /overdue, so
// they stay visible and editable when a toggle is off. Hiding them behind the
// kill switch would hide settings that are still in force.
// ===========================================================================

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
  // One language selection for the whole tab: switching to EN in one editor and
  // finding another still on NL was its own small confusion.
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

  const autoInvoiceOn = cfg.initial_invoice_send_enabled === true
  const overviewOn = cfg.monthly_overview_enabled === true

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

  // "Is any text customised in this group?" drives the badge on the collapsed
  // copy editors, so a custom wording is never invisible behind a closed panel.
  const hasCustom = (keys: (ReminderStepKey | PaymentOverviewKey)[]) =>
    keys.some(k => (templates[k]?.subject || templates[k]?.body))

  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`

  return (
    <div className="space-y-8">
      {/* WHAT IS RUNNING — the question the old page could not answer without
          reading all seven blocks. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <SummaryChip on={autoInvoiceOn} icon={<Receipt className="w-4 h-4" />}
          label={t('settings.reminders.autoInvoice.title')}
          detail={autoInvoiceOn ? t('settings.reminders.summary.afterOrder') : t('settings.reminders.status.off')} />
        <SummaryChip on={cfg.auto_send_enabled} icon={<BellRing className="w-4 h-4" />}
          label={t('settings.reminders.autoSend.title')}
          detail={cfg.auto_send_enabled ? t('settings.reminders.summary.atHour', { hour: hh(cfg.send_hour) }) : t('settings.reminders.status.manualOnly')} />
        <SummaryChip on={overviewOn} icon={<CalendarDays className="w-4 h-4" />}
          label={t('settings.reminders.monthlyOverview.title')}
          detail={overviewOn ? t('settings.reminders.summary.firstWorkingDay') : t('settings.reminders.status.off')} />
        <SummaryChip on={ia.enabled} icon={<UserX className="w-4 h-4" />}
          label={t('settings.reminders.inactive.title')}
          detail={ia.enabled
            ? t(`settings.reminders.summary.freq.${ia.frequency}`, {
                day: t(`settings.reminders.inactive.weekdays.${ia.weekday}`), hour: hh(ia.hour),
              })
            : t('settings.reminders.status.off')} />
      </div>

      {/* ------------------------------------------------------------------ */}
      <Section title={t('settings.reminders.sections.toCustomers')} subtitle={t('settings.reminders.sections.toCustomersHint')}>

        {/* 🚨 ONE CLOCK FOR ALL THREE. send_hour / working_days_only gate steps
            4, 6 AND 7 of the cron (dunning, invoice-on-creation, statement), so
            they live above the cards rather than inside the dunning one. Inside
            it they read as a dunning setting and, worse, would disappear with
            that card's toggle while still governing the other two mails. */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
              <Clock className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.reminders.sendWindow.title')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.reminders.sendWindow.subtitle')}</p>
            </div>
          </div>
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

        {/* 1. Invoice on creation */}
        <SettingCard
          icon={<Receipt className="w-5 h-5" />}
          title={t('settings.reminders.autoInvoice.title')}
          subtitle={t('settings.reminders.autoInvoice.subtitle')}
          on={autoInvoiceOn}
          onToggle={() => patch({ initial_invoice_send_enabled: !autoInvoiceOn })}
        />

        {/* 2. The dunning system: one card, three parts. It used to be three
               separate blocks with an unrelated card between them. */}
        <SettingCard
          icon={<BellRing className="w-5 h-5" />}
          title={t('settings.reminders.autoSend.title')}
          subtitle={t('settings.reminders.autoSend.subtitle')}
          on={cfg.auto_send_enabled}
          onToggle={() => patch({ auto_send_enabled: !cfg.auto_send_enabled })}
        >
          {cfg.auto_send_enabled ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">{t('settings.reminders.autoSend.warning')}</p>
            </div>
          ) : (
            // 🚨 The ladder and the texts below still apply to the manual "Stuur
            // herinnering" buttons on /overdue, so say so rather than letting an
            // off toggle imply the whole card is inert.
            <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('settings.reminders.autoSend.offNote')}</p>
            </div>
          )}

          <SubHeading>{t('settings.reminders.groups.ladder')}</SubHeading>
          <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">{t('settings.reminders.schedule.subtitle')}</p>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Texts are rarely edited and take the most vertical space, so they
              collapse. The badge keeps a customised wording from hiding. */}
          <Collapsible
            label={t('settings.reminders.groups.copy')}
            badge={hasCustom([TONE_TEMPLATE.gentle, TONE_TEMPLATE.second, TONE_TEMPLATE.final]) ? t('settings.reminders.customised') : undefined}
            right={<LangTabs lang={lang} onChange={setLang} />}
          >
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
          </Collapsible>
        </SettingCard>

        {/* 3. Monthly statement. Its own toggle, not part of the ladder above:
               a statement also goes to customers who are entirely within terms. */}
        <SettingCard
          icon={<CalendarDays className="w-5 h-5" />}
          title={t('settings.reminders.monthlyOverview.title')}
          subtitle={t('settings.reminders.monthlyOverview.subtitle')}
          on={overviewOn}
          onToggle={() => patch({ monthly_overview_enabled: !overviewOn })}
        >
          {overviewOn && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-300">{t('settings.reminders.monthlyOverview.note')}</p>
            </div>
          )}

          {/* Kept available with the toggle off: the Betaaloverzicht tab can send
              one by hand, and it uses exactly this text. */}
          <Collapsible
            label={t('settings.reminders.monthlyOverview.copyTitle')}
            badge={hasCustom(['payment_overview']) ? t('settings.reminders.customised') : undefined}
            right={<LangTabs lang={lang} onChange={setLang} />}
          >
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
          </Collapsible>
        </SettingCard>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section title={t('settings.reminders.sections.toYou')} subtitle={t('settings.reminders.sections.toYouHint')}>
        <SettingCard
          icon={<UserX className="w-5 h-5" />}
          title={t('settings.reminders.inactive.title')}
          subtitle={t('settings.reminders.inactive.subtitle')}
          on={ia.enabled}
          onToggle={() => patchIa({ enabled: !ia.enabled })}
        >
          {ia.enabled && (
            <>
              <SubHeading>{t('settings.reminders.groups.when')}</SubHeading>
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
                  hour: hh(ia.hour),
                })}
              </p>

              <SubHeading>{t('settings.reminders.groups.delivery')}</SubHeading>
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

              <SubHeading>{t('settings.reminders.groups.rules')}</SubHeading>
              {/* Per-type rules. The switch is what makes "not monitored"
                  unambiguous: an empty number field reads as a mistake. */}
              <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">{t('settings.reminders.inactive.rulesHint')}</p>
              <div className="space-y-2">
                {CUSTOMER_TYPES.map(ct => (
                  <RuleRow
                    key={ct}
                    label={CUSTOMER_TYPE_LABELS[ct]}
                    days={ia.by_type[ct]}
                    onToggle={() => patchIa({ by_type: { ...ia.by_type, [ct]: ia.by_type[ct] != null ? null : 30 } })}
                    onDays={v => patchIa({ by_type: { ...ia.by_type, [ct]: v } })}
                  />
                ))}
                {/* Untagged customers get their own line rather than silently
                    falling into "Overig", which is a real customer type here. */}
                <RuleRow
                  label={t('settings.reminders.inactive.untagged')}
                  days={ia.default_days}
                  onToggle={() => patchIa({ default_days: ia.default_days != null ? null : 30 })}
                  onDays={v => patchIa({ default_days: v })}
                />
              </div>

              {/* Most customers with no order at all are import leftovers.
                  Including them buries the ones who actually stopped. */}
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
        </SettingCard>
      </Section>

      {/* The in-app queue is not a setting, so it reads as a footnote rather
          than as the first thing on the page. */}
      <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {t('settings.reminders.queueNote')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const inputClass =
  'w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500'

const toggleClass = (on: boolean) =>
  `relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'}`
const knobClass = (on: boolean) =>
  `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`

function SummaryChip({ on, icon, label, detail }: {
  on: boolean; icon: React.ReactNode; label: string; detail: string
}) {
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl border ${
      on
        ? 'bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800/60'
        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
    }`}>
      <span className={on ? 'text-green-600 dark:text-green-400 mt-0.5' : 'text-slate-400 mt-0.5'}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-900 dark:text-white truncate">{label}</span>
        <span className={`block text-xs truncate ${on ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {detail}
        </span>
      </span>
    </div>
  )
}

function Section({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

/** One mail = one card. The body only exists when the card has more to say. */
function SettingCard({ icon, title, subtitle, on, onToggle, children }: {
  icon: React.ReactNode
  title: string
  subtitle: string
  on: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      on ? 'border-green-300 dark:border-green-800/70' : 'border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`p-2 rounded-lg shrink-0 ${
            on ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
               : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full ${
            on ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
               : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            {t(on ? 'settings.reminders.status.on' : 'settings.reminders.status.off')}
          </span>
          <button type="button" role="switch" aria-checked={on} aria-label={title}
            onClick={onToggle} className={toggleClass(on)}>
            <span className={knobClass(on)} />
          </button>
        </div>
      </div>
      {children && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-700/60 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{children}</h4>
  )
}

/** Email texts are long and rarely edited, so they start closed. The badge is
 *  what keeps a customised wording from hiding behind a closed panel. */
function Collapsible({ label, badge, right, children }: {
  label: string; badge?: string; right?: React.ReactNode; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 min-w-0 text-left"
        >
          {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
          <Mail className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{label}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
              {badge}
            </span>
          )}
        </button>
        {open && right}
      </div>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  )
}

/** One "after N days" rule, with the switch that makes "not monitored" explicit. */
function RuleRow({ label, days, onToggle, onDays }: {
  label: string
  days: number | null
  onToggle: () => void
  onDays: (v: number) => void
}) {
  const { t } = useTranslation()
  const on = days != null
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
      <button type="button" role="switch" aria-checked={on} aria-label={label}
        onClick={onToggle} className={toggleClass(on)}>
        <span className={knobClass(on)} />
      </button>
      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{label}</span>
      {on ? (
        <>
          <input
            type="number" min={1} max={3650} value={days ?? 30}
            onChange={e => onDays(clamp(+e.target.value, 1, 3650))}
            className="w-20 px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">
            {t('settings.reminders.inactive.daysSuffix')} · {friendlyDays(days ?? 30, t)}
          </span>
        </>
      ) : (
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.reminders.inactive.notMonitored')}</span>
      )}
    </div>
  )
}

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
