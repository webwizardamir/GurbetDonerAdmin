import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  fetchOverdueInvoices,
  snoozeInvoiceReminder,
  clearInvoiceReminderSnooze,
  markInvoicePaid,
  setInvoiceReminderOptOut,
  DEFAULT_CLIENT_REMINDER_CONFIG,
} from '../services/invoiceReminders'
import { fetchDocumentSettings } from '../services/documents'
import type { ClientReminderConfig, OverdueInvoice } from '../types'

/**
 * Loads the overdue-invoice work queue. Refreshes on mount and whenever the
 * window regains focus, so the queue "resurfaces" each time an admin returns to
 * the app (the dashboard widget's per-session minimize is separate UI state).
 */
export function useOverdueInvoices() {
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([])
  const [config, setConfig] = useState<ClientReminderConfig>(DEFAULT_CLIENT_REMINDER_CONFIG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastLoadRef = useRef(0)

  const load = useCallback(async () => {
    try {
      setError(null)
      lastLoadRef.current = Date.now()
      const data = await fetchOverdueInvoices()
      setInvoices(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overdue invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Escalation schedule — loaded once so the page can project the next
  // reminder date and "N of max" progress. Non-fatal: keep the default config.
  useEffect(() => {
    void (async () => {
      try {
        const s = await fetchDocumentSettings()
        if (s?.client_reminder_config) setConfig({ ...DEFAULT_CLIENT_REMINDER_CONFIG, ...s.client_reminder_config })
      } catch { /* keep default config */ }
    })()
  }, [])

  // Resurface on return to the app, but throttle rapid focus events (~30s).
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastLoadRef.current > 30_000) load()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  // Active = not currently snoozed. Snoozed are kept for the "snoozed" filter.
  // `now` is read at filter time; snooze expiry surfaces on the next load.
  const { active, snoozed } = useMemo(() => {
    const now = Date.now()
    return {
      active: invoices.filter(i => !i.snoozed_until || new Date(i.snoozed_until).getTime() <= now),
      snoozed: invoices.filter(i => i.snoozed_until && new Date(i.snoozed_until).getTime() > now),
    }
  }, [invoices])

  const snooze = useCallback(async (orderId: string, until: Date) => {
    await snoozeInvoiceReminder(orderId, until)
    await load()
  }, [load])

  const unsnooze = useCallback(async (orderId: string) => {
    await clearInvoiceReminderSnooze(orderId)
    await load()
  }, [load])

  const markPaid = useCallback(async (orderId: string) => {
    await markInvoicePaid(orderId)
    setInvoices(prev => prev.filter(i => i.order_id !== orderId))
  }, [])

  const optOut = useCallback(async (orderId: string) => {
    await setInvoiceReminderOptOut(orderId, true)
    setInvoices(prev => prev.filter(i => i.order_id !== orderId))
  }, [])

  return {
    invoices,
    config,
    active,
    snoozed,
    activeCount: active.length,
    loading,
    error,
    refresh: load,
    snooze,
    unsnooze,
    markPaid,
    optOut,
  }
}
