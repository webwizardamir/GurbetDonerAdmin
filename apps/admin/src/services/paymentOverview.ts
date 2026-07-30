import { supabase } from './supabase'
import { fetchDocumentSettings } from './documents'
import { resolveDocumentLang } from '../utils/documentLang'
import { firstOfMonth, ymdInAms } from '../utils/dateRange'
import type {
  PaymentOverviewCustomer,
  PaymentOverviewData,
  PaymentOverviewLine,
  PaymentOverviewRecord,
} from '../types'

// ===========================================================================
// Monthly Betaaloverzicht — statement of account (migrations 00102/00103)
//
// Two consumers, one definition of the truth:
//   * this file      — the /overdue Betaaloverzicht tab (preview + manual send)
//   * the cron       — process-invoice-reminders Step 7 (automatic 1st-of-month)
// Both read the SAME two RPCs, so a preview cannot disagree with what is mailed.
// Anything that changes which orders qualify belongs in the RPC, never here.
//
// ⚠️ The RPCs are owner-only (auth.uid() IS NOT NULL AND NOT is_owner() → refuse).
// Gate the UI on useAuth().isOwner as well, or a Shop Manager gets a raw
// "Not authorized" toast instead of a hidden feature.
// ===========================================================================

/** First day of the statement month, YYYY-MM-DD, pinned to Europe/Amsterdam. */
export function currentPeriod(today: string = ymdInAms()): string {
  return firstOfMonth(today)
}

/** 'juli 2026' / 'July 2026' — the {{period}} placeholder and the email subject. */
export function formatPeriodLabel(period: string, lang: 'nl' | 'en' = 'nl'): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nl-NL', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(period + 'T00:00:00'))
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Every active customer with at least one outstanding, billed order. */
export async function fetchPaymentOverviewCustomers(
  period: string = currentPeriod()
): Promise<PaymentOverviewCustomer[]> {
  const { data, error } = await supabase.rpc('get_payment_overview_customers', {
    p_period: period,
  })
  if (error) throw error
  return (data ?? []) as PaymentOverviewCustomer[]
}

/** The lines that belong on one customer's statement, right now. */
export async function fetchPaymentOverviewLines(customerId: string): Promise<PaymentOverviewLine[]> {
  const { data, error } = await supabase.rpc('get_payment_overview_orders', {
    p_customer_id: customerId,
  })
  if (error) throw error
  return (data ?? []) as PaymentOverviewLine[]
}

/**
 * Build the render payload from LIVE data. This is what "Voorbeeld" shows and
 * what gets frozen into payment_overviews.snapshot at send time — same builder,
 * so the preview is the document.
 */
export async function buildPaymentOverviewData(
  customerId: string,
  period: string = currentPeriod()
): Promise<PaymentOverviewData> {
  const [lines, settings, customerRes] = await Promise.all([
    fetchPaymentOverviewLines(customerId),
    fetchDocumentSettings(),
    supabase
      .from('customers')
      .select(
        'id, company_name, contact_person, billing_street, billing_postal_code, billing_city, billing_country, vat_number'
      )
      .eq('id', customerId)
      .single(),
  ])

  if (customerRes.error) throw customerRes.error
  if (!settings) throw new Error('Document settings not configured')
  const customer = customerRes.data as {
    id: string
    company_name: string
    contact_person: string | null
    billing_street: string | null
    billing_postal_code: string | null
    billing_city: string | null
    billing_country: string | null
    vat_number: string | null
  }

  // Language by COUNTRY, never by app language — same rule as every other
  // customer-facing document (utils/documentLang.ts).
  const lang = resolveDocumentLang(customer.billing_country ?? undefined)

  const totalCents = lines.reduce((s, l) => s + Number(l.amount_cents || 0), 0)
  const overdue = lines.filter(l => l.days_overdue > 0)
  const overdueCents = overdue.reduce((s, l) => s + Number(l.amount_cents || 0), 0)

  return {
    lang,
    period,
    asAtDate: ymdInAms(),
    company: {
      name: settings.company_name,
      address: settings.company_address ?? undefined,
      postalCode: settings.company_postal_code ?? undefined,
      city: settings.company_city ?? undefined,
      country: settings.company_country ?? undefined,
      phone: settings.company_phone ?? undefined,
      email: settings.company_email ?? undefined,
      website: settings.company_website ?? undefined,
      logoUrl: settings.company_logo_url ?? undefined,
      vatNumber: settings.company_vat_number ?? undefined,
      kvkNumber: settings.company_kvk_number ?? undefined,
      bankName: settings.bank_name ?? undefined,
      iban: settings.bank_iban ?? undefined,
      bic: settings.bank_bic ?? undefined,
      accountHolder: settings.bank_account_holder ?? undefined,
    },
    // Explicit whitelist, never an object spread — the same discipline
    // buildInvoiceData uses, so an internal column (customer_type, notes,
    // credit limits) can never leak into a customer-facing snapshot.
    customer: {
      id: customer.id,
      companyName: customer.company_name || 'Onbekende klant',
      contactPerson: customer.contact_person ?? undefined,
      street: customer.billing_street ?? undefined,
      postalCode: customer.billing_postal_code ?? undefined,
      city: customer.billing_city ?? undefined,
      country: customer.billing_country ?? undefined,
      vatNumber: customer.vat_number ?? undefined,
      customerNumber: customer.id?.substring(0, 8).toUpperCase(),
    },
    lines,
    totalCents,
    overdueCents,
    overdueCount: overdue.length,
  }
}

/** A previously sent statement, for re-rendering exactly what the customer got. */
export async function fetchPaymentOverviewById(id: string): Promise<PaymentOverviewRecord | null> {
  const { data, error } = await supabase
    .from('payment_overviews')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as PaymentOverviewRecord) ?? null
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Freeze the snapshot for (customer, period). Upsert on the unique index, so a
 * retry after a failed send re-uses the row rather than creating a second
 * statement for the same month.
 */
export async function savePaymentOverview(
  customerId: string,
  period: string,
  data: PaymentOverviewData
): Promise<PaymentOverviewRecord> {
  const { data: row, error } = await supabase
    .from('payment_overviews')
    .upsert(
      {
        customer_id: customerId,
        period,
        snapshot: data,
        total_cents: data.totalCents,
        order_count: data.lines.length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id,period' }
    )
    .select('*')
    .single()
  if (error) throw error
  return row as PaymentOverviewRecord
}
