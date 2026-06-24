import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  fetchOverdueInvoices,
  snoozeInvoiceReminder,
  clearInvoiceReminderSnooze,
  markInvoicePaid,
  setInvoiceReminderOptOut,
} from '../services/invoiceReminders'
import type { OverdueInvoice } from '../types'

/**
 * Loads the overdue-invoice work queue. Refreshes on mount and whenever the
 * window regains focus, so the queue "resurfaces" each time an admin returns to
 * the app (the dashboard widget's per-session minimize is separate UI state).
 */
export function useOverdueInvoices() {
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([])
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
