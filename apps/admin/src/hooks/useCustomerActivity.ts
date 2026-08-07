import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  fetchCustomerActivity,
  saveCustomerInactivityRule,
  normalizeInactiveAlert,
  DEFAULT_INACTIVE_ALERT_CONFIG,
} from '../services/customerActivity'
import { fetchDocumentSettings } from '../services/documents'
import type { CustomerActivityRow, InactiveAlertConfig } from '../types'

/**
 * Klantactiviteit: every active customer with the rule that applies to them and
 * whether they are currently due to be reported. Mirrors useOverdueInvoices —
 * loads on mount, resurfaces on window focus (throttled), and applies a rule
 * change optimistically so the row does not jump while the list reloads.
 *
 * `onlyDue` is deliberately NOT a parameter: the screen always wants the full
 * picture and filters client-side (a few hundred rows), while the digest asks
 * the RPC for the due subset. Same RPC, one definition of "due".
 */
export function useCustomerActivity() {
  const [rows, setRows] = useState<CustomerActivityRow[]>([])
  const [config, setConfig] = useState<InactiveAlertConfig>(DEFAULT_INACTIVE_ALERT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastLoadRef = useRef(0)

  const load = useCallback(async () => {
    try {
      setError(null)
      lastLoadRef.current = Date.now()
      setRows(await fetchCustomerActivity(false))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon klantactiviteit niet laden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // The alert config drives the rule labels and the "wordt gemeld" preview.
  // Non-fatal: fall back to the defaults rather than blanking the page.
  useEffect(() => {
    void (async () => {
      try {
        const s = await fetchDocumentSettings()
        setConfig(normalizeInactiveAlert(s?.client_reminder_config?.inactive_alert))
      } catch { /* keep defaults */ }
    })()
  }, [])

  useEffect(() => {
    const onFocus = () => { if (Date.now() - lastLoadRef.current > 30_000) load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  const stats = useMemo(() => {
    const due = rows.filter(r => r.is_due)
    return {
      due,
      dueCount: due.length,
      longestQuiet: due.reduce((m, r) => Math.max(m, r.days_since), 0),
      customRuleCount: rows.filter(r => r.rule_source === 'customer').length,
      unmonitoredCount: rows.filter(r => r.threshold_days == null).length,
      neverOrderedCount: rows.filter(r => r.order_count === 0).length,
    }
  }, [rows])

  /** Optimistic: the row keeps its place until the reload lands, so the table
   *  does not reshuffle under the cursor after a single click. */
  const saveRule = useCallback(async (
    customerId: string,
    rule: { mode: 'inherit' | 'custom' | 'off'; days?: number | null },
  ) => {
    await saveCustomerInactivityRule(customerId, rule)
    setRows(prev => prev.map(r => r.customer_id !== customerId ? r : {
      ...r,
      threshold_days: rule.mode === 'off' ? null : rule.mode === 'custom' ? (rule.days ?? null) : r.threshold_days,
      rule_source: rule.mode === 'off' ? 'off' : rule.mode === 'custom' ? 'customer' : r.rule_source,
      is_due: rule.mode === 'off' ? false : r.is_due,
    }))
    await load()
  }, [load])

  return { rows, config, stats, loading, error, refresh: load, saveRule }
}
