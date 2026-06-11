import { supabase } from './supabase'
import type { DocumentSettings, DocumentType, Document } from '../types'

// =====================================================
// Document Settings
// =====================================================

export async function fetchDocumentSettings(): Promise<DocumentSettings | null> {
  const { data, error } = await supabase
    .from('document_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateDocumentSettings(
  updates: Partial<Omit<DocumentSettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<DocumentSettings> {
  // First check if settings exist
  const existing = await fetchDocumentSettings()

  if (existing) {
    const { data, error } = await supabase
      .from('document_settings')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new settings
    const { data, error } = await supabase
      .from('document_settings')
      .insert(updates)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// =====================================================
// Documents (Generated PDFs)
// =====================================================

export async function fetchDocuments(orderId?: string): Promise<Document[]> {
  let query = supabase
    .from('documents')
    .select('*')
    .order('generated_at', { ascending: false })

  if (orderId) {
    query = query.eq('order_id', orderId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Document info for orders list view
export interface OrderDocumentInfo {
  count: number
  invoiceNumber?: string
}

// Fetch document info per order (count and invoice number)
export async function fetchDocumentInfoByOrder(
  orderIds: string[]
): Promise<Map<string, OrderDocumentInfo>> {
  if (orderIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('documents')
    .select('order_id, document_type, document_number')
    .in('order_id', orderIds)

  if (error) throw error

  // Build document info per order
  const infoMap = new Map<string, OrderDocumentInfo>()

  for (const doc of data || []) {
    const existing = infoMap.get(doc.order_id) || { count: 0 }
    existing.count++

    // Store invoice number if this is an invoice document
    if (doc.document_type === 'invoice' && doc.document_number) {
      existing.invoiceNumber = doc.document_number
    }

    infoMap.set(doc.order_id, existing)
  }

  return infoMap
}

// Legacy function for backward compatibility
export async function fetchDocumentCountsByOrder(
  orderIds: string[]
): Promise<Map<string, number>> {
  const infoMap = await fetchDocumentInfoByOrder(orderIds)
  const counts = new Map<string, number>()

  for (const [orderId, info] of infoMap) {
    counts.set(orderId, info.count)
  }

  return counts
}

export async function fetchDocumentById(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Find the most recent document of a given type on an order, if one exists.
 * Used by DocumentGenerator so that reopening an order doesn't burn a fresh
 * invoice number — the existing document is reused instead.
 */
export async function fetchLatestDocumentForOrder(
  orderId: string,
  docType: DocumentType,
): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('order_id', orderId)
    .eq('document_type', docType)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getNextDocumentNumber(docType: DocumentType): Promise<string> {
  // Get current settings
  const settings = await fetchDocumentSettings()

  if (!settings) {
    throw new Error('Document settings not configured. Please configure settings first.')
  }

  let prefix: string
  let nextNumber: number
  let updateField: string

  switch (docType) {
    case 'invoice':
      prefix = settings.invoice_prefix || 'INV-'
      nextNumber = settings.invoice_next_number || 1
      updateField = 'invoice_next_number'
      break
    case 'proforma':
      prefix = settings.proforma_prefix || 'PRO-'
      nextNumber = settings.proforma_next_number || 1
      updateField = 'proforma_next_number'
      break
    case 'credit_note':
      prefix = settings.credit_note_prefix || 'CN-'
      nextNumber = settings.credit_note_next_number || 1
      updateField = 'credit_note_next_number'
      break
    case 'packing_slip':
      prefix = settings.packing_slip_prefix || 'PS-'
      nextNumber = settings.packing_slip_next_number || 1
      updateField = 'packing_slip_next_number'
      break
    case 'order_confirmation':
      prefix = settings.order_confirmation_prefix || 'OB-'
      nextNumber = settings.order_confirmation_next_number || 1
      updateField = 'order_confirmation_next_number'
      break
    case 'payment_reminder':
      prefix = settings.payment_reminder_prefix || 'HR-'
      nextNumber = settings.payment_reminder_next_number || 1
      updateField = 'payment_reminder_next_number'
      break
    default:
      prefix = 'DOC-'
      nextNumber = 1
      updateField = 'invoice_next_number'
  }

  // Generate document number
  const documentNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`

  // Increment the counter
  const { error: updateError } = await supabase
    .from('document_settings')
    .update({ [updateField]: nextNumber + 1 })
    .eq('id', settings.id)

  if (updateError) {
    console.error('Failed to increment document number:', updateError)
    // Still return the number, just log the error
  }

  return documentNumber
}

export async function createDocument(
  orderId: string,
  documentType: DocumentType,
  documentNumber: string,
  snapshot: Record<string, unknown>,
  pdfUrl?: string,
  fileSize?: number
): Promise<Document> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const { data, error } = await supabase
    .from('documents')
    .insert({
      order_id: orderId,
      document_type: documentType,
      document_number: documentNumber,
      snapshot,
      pdf_url: pdfUrl,
      file_size: fileSize,
      generated_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// =====================================================
// Document Preview Data
// =====================================================

export interface InvoiceData {
  // Document info
  documentNumber: string
  // The customer-facing invoice number for this order (app-generated, else a
  // legacy WC number). Used by the payment reminder so it references the
  // invoice the customer received, never the internal order number.
  invoiceNumber?: string
  documentType: DocumentType
  documentDate: string
  dueDate: string

  // Company info (from settings)
  company: {
    name: string
    address?: string
    postalCode?: string
    city?: string
    country: string
    phone?: string
    email?: string
    website?: string
    logoUrl?: string
    vatNumber?: string
    kvkNumber?: string
    bankName?: string
    iban?: string
    bic?: string
    accountHolder?: string
  }

  // Customer info
  customer: {
    id: string
    companyName: string
    contactPerson?: string
    street?: string
    postalCode?: string
    city?: string
    country: string
    vatNumber?: string
    customerNumber?: string
  }

  // Order info
  order: {
    id: string
    orderNumber: string
    orderDate: string
  }

  // Line items
  items: Array<{
    index: number
    description: string
    note?: string
    quantity: number
    unit: string
    unitPrice: number // cents
    vatRate: number
    total: number // cents
  }>

  // Totals
  subtotal: number // cents
  vatBreakdown: Array<{
    rate: number
    base: number // cents
    amount: number // cents
  }>
  totalVat: number // cents
  grandTotal: number // cents

  // Labels (from settings)
  labels: {
    documentTitle: string
    invoiceAddress: string
    date: string
    customerNumber: string
    dueDate: string
    description: string
    quantity: string
    unit: string
    unitPrice: string
    vat: string
    total: string
    subtotal: string
    grandTotal: string
    paymentMethod: string
    cash: string
    bank: string
    onAccount: string
    forApproval: string
    name: string
    signature: string
  }

  // Payment terms
  paymentTerms?: string

  // Footer
  footerText?: string
}

// One credit-note line, aggregated across every refund on the order.
interface RefundCreditLine {
  description: string
  unitType: string
  quantity: number
  unitPrice: number  // cents, ex-VAT
  vatRate: number
  amount: number     // cents, ex-VAT subtotal
  taxAmount: number  // cents
}

/**
 * Cumulative refunded lines for an order, used to make the Credit Nota show
 * exactly what was refunded (full or partial) rather than the whole order.
 * Returns [] when the order has no refund rows (e.g. a plain cancellation),
 * in which case the credit note falls back to the full order.
 */
async function fetchRefundCreditLines(orderId: string): Promise<RefundCreditLine[]> {
  const { data, error } = await supabase
    .from('order_refund_items')
    .select('order_item_id, product_name, quantity, amount, tax_amount, refund:order_refunds!inner(order_id), order_item:order_items(unit_type, unit_price, tax_rate)')
    .eq('refund.order_id', orderId)
  if (error) throw error

  const rows = (data as unknown as Array<{
    order_item_id: string | null
    product_name: string
    quantity: number
    amount: number
    tax_amount: number
    order_item: { unit_type?: string; unit_price?: number; tax_rate?: number } | null
  }>) ?? []

  const map = new Map<string, RefundCreditLine>()
  for (const r of rows) {
    const key = r.order_item_id ?? `name:${r.product_name}`
    const qty = Number(r.quantity) || 0
    const amount = Number(r.amount) || 0
    const tax = Number(r.tax_amount) || 0
    const existing = map.get(key)
    if (existing) {
      existing.quantity += qty
      existing.amount += amount
      existing.taxAmount += tax
    } else {
      const oi = r.order_item
      map.set(key, {
        description: r.product_name,
        unitType: oi?.unit_type || 'piece',
        quantity: qty,
        // Prefer the order item's recorded values; derive when the line was deleted.
        unitPrice: oi?.unit_price != null ? Number(oi.unit_price) : (qty > 0 ? Math.round(amount / qty) : 0),
        vatRate: oi?.tax_rate != null ? Number(oi.tax_rate) : (amount > 0 ? Math.round((tax / amount) * 100) : 0),
        amount,
        taxAmount: tax,
      })
    }
  }
  return Array.from(map.values())
}

// Build invoice data from order and settings
/**
 * Resolve the payment-terms sentence for a specific customer.
 * - If the configured text contains a `{days}` placeholder, it is filled with
 *   the effective day count.
 * - Otherwise, when the customer's term differs from the global default, the
 *   standalone global day-count number in the text is swapped for the effective
 *   one (so "...is 7 dagen na factuurdatum." becomes "...is 30 dagen...").
 */
function resolvePaymentTermsText(
  text: string | undefined,
  globalDays: number,
  effectiveDays: number
): string | undefined {
  if (!text) return text
  if (text.includes('{days}')) return text.split('{days}').join(String(effectiveDays))
  if (effectiveDays !== globalDays) {
    return text.replace(new RegExp(`\\b${globalDays}\\b`), String(effectiveDays))
  }
  return text
}

export async function buildInvoiceData(
  orderId: string,
  documentType: DocumentType
): Promise<InvoiceData> {
  // Fetch order with items and customer
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers!customer_id(*),
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single()

  if (orderError) throw orderError
  if (!order) throw new Error('Order not found')

  // Fetch document settings
  const settings = await fetchDocumentSettings()
  if (!settings) throw new Error('Document settings not configured')

  // Calculate due date — a customer-specific payment term overrides the global
  // default (NULL on the customer = use the global document setting).
  const customer = order.customer || {}
  const globalDueDays = settings.payment_terms_days || 14
  const effectiveDueDays = Number(customer.payment_due_days ?? globalDueDays)
  const orderDate = new Date(order.order_date || order.created_at)
  const dueDate = new Date(orderDate)
  dueDate.setDate(dueDate.getDate() + effectiveDueDays)

  // Get document title based on type
  const documentTitles: Record<DocumentType, string> = {
    invoice: settings.label_invoice,
    proforma: settings.label_proforma,
    credit_note: settings.label_credit_note,
    packing_slip: settings.label_packing_slip,
    order_confirmation: settings.label_order_confirmation || 'ORDERBEVESTIGING',
    payment_reminder: settings.label_payment_reminder || 'BETALINGSHERINNERING',
  }

  // Convert unit type to Dutch format
  const formatUnitDutch = (unitType: string, quantity: number): string => {
    switch (unitType?.toLowerCase()) {
      case 'kg':
        return 'kg'
      case 'piece':
        return quantity === 1 ? 'stuk' : 'stuks'
      case 'zak':
        return quantity === 1 ? 'zak' : 'zakken'
      case 'doos':
        return quantity === 1 ? 'doos' : 'dozen'
      case 'package':
        return quantity === 1 ? 'pak' : 'pakken'
      default:
        return unitType // Return the original unit type if not recognized
    }
  }

  // Process items and calculate VAT breakdown
  let items = (order.items || []).map((item: Record<string, unknown>, idx: number) => {
    const quantity = Number(item.quantity) || 0
    const unitType = (item.unit_type as string) || 'piece'
    return {
      index: idx + 1,
      description: item.product_name as string,
      note: (item.notes as string | undefined) || undefined,
      quantity,
      unit: formatUnitDutch(unitType, quantity),
      unitPrice: Number(item.unit_price) || 0,
      vatRate: Number(item.tax_rate) || 0,
      total: Number(item.total) || 0,
    }
  })

  // Calculate VAT breakdown by rate
  const vatMap = new Map<number, { base: number; amount: number }>()
  for (const item of items) {
    const lineBase = item.unitPrice * item.quantity
    const lineVat = Math.round(lineBase * (item.vatRate / 100))

    const existing = vatMap.get(item.vatRate) || { base: 0, amount: 0 }
    vatMap.set(item.vatRate, {
      base: existing.base + lineBase,
      amount: existing.amount + lineVat,
    })
  }

  let vatBreakdown = Array.from(vatMap.entries())
    .map(([rate, { base, amount }]) => ({ rate, base, amount }))
    .sort((a, b) => a.rate - b.rate)

  let totalVat = vatBreakdown.reduce((sum, v) => sum + v.amount, 0)
  let subtotal = Number(order.subtotal) || items.reduce((sum: number, i: { unitPrice: number; quantity: number }) => sum + (i.unitPrice * i.quantity), 0)
  let grandTotal = Number(order.total) || (subtotal + totalVat)

  // A credit note must reflect what was actually refunded, not the full order.
  // When refund rows exist we rebuild the lines and totals from them; a plain
  // cancellation (no refund rows) keeps the full-order fallback above.
  if (documentType === 'credit_note') {
    const refundLines = await fetchRefundCreditLines(orderId)
    if (refundLines.length > 0) {
      items = refundLines.map((l, idx) => ({
        index: idx + 1,
        description: l.description,
        note: undefined,
        quantity: l.quantity,
        unit: formatUnitDutch(l.unitType, l.quantity),
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        total: l.amount + l.taxAmount,
      }))

      const refundVatMap = new Map<number, { base: number; amount: number }>()
      let refundSub = 0
      let refundVat = 0
      for (const l of refundLines) {
        refundSub += l.amount
        refundVat += l.taxAmount
        const existing = refundVatMap.get(l.vatRate) || { base: 0, amount: 0 }
        refundVatMap.set(l.vatRate, { base: existing.base + l.amount, amount: existing.amount + l.taxAmount })
      }
      vatBreakdown = Array.from(refundVatMap.entries())
        .map(([rate, { base, amount }]) => ({ rate, base, amount }))
        .sort((a, b) => a.rate - b.rate)
      subtotal = refundSub
      totalVat = refundVat
      grandTotal = refundSub + refundVat
    }
  }

  // For the payment reminder the reference must show the invoice number the
  // customer received — never the internal order number. Look up the order's
  // invoice document, falling back to a legacy WC invoice number.
  let invoiceNumber: string | undefined
  if (documentType === 'payment_reminder') {
    const invoiceDoc = await fetchLatestDocumentForOrder(orderId, 'invoice')
    invoiceNumber = invoiceDoc?.document_number
      || (order.woo_invoice_number ? String(order.woo_invoice_number) : undefined)
  }

  return {
    documentNumber: '', // Will be set when generating
    invoiceNumber,
    documentType,
    documentDate: orderDate.toISOString().split('T')[0],
    dueDate: dueDate.toISOString().split('T')[0],

    company: {
      name: settings.company_name,
      address: settings.company_address,
      postalCode: settings.company_postal_code,
      city: settings.company_city,
      country: settings.company_country,
      phone: settings.company_phone,
      email: settings.company_email,
      website: settings.company_website,
      logoUrl: settings.company_logo_url,
      vatNumber: settings.company_vat_number,
      kvkNumber: settings.company_kvk_number,
      bankName: settings.bank_name,
      iban: settings.bank_iban,
      bic: settings.bank_bic,
      accountHolder: settings.bank_account_holder,
    },

    customer: {
      id: customer.id || '',
      companyName: customer.company_name || 'Unknown Customer',
      contactPerson: customer.contact_person,
      street: customer.billing_street,
      postalCode: customer.billing_postal_code,
      city: customer.billing_city,
      country: customer.billing_country || 'NL',
      vatNumber: customer.vat_number,
      customerNumber: customer.id?.substring(0, 8).toUpperCase(),
    },

    order: {
      id: order.id,
      orderNumber: order.order_number,
      orderDate: order.order_date || order.created_at?.split('T')[0],
    },

    items,

    subtotal,
    vatBreakdown,
    totalVat,
    grandTotal,

    labels: {
      documentTitle: documentTitles[documentType],
      invoiceAddress: settings.label_invoice_address,
      date: settings.label_date,
      customerNumber: settings.label_customer_number,
      dueDate: settings.label_due_date,
      description: settings.label_description,
      quantity: settings.label_quantity,
      unit: settings.label_unit,
      unitPrice: settings.label_unit_price,
      vat: settings.label_vat,
      total: settings.label_total,
      subtotal: settings.label_subtotal,
      grandTotal: settings.label_grand_total,
      paymentMethod: settings.label_payment_method,
      cash: settings.label_cash,
      bank: settings.label_bank,
      onAccount: settings.label_on_account,
      forApproval: settings.label_for_approval,
      name: settings.label_name,
      signature: settings.label_signature,
    },

    paymentTerms: resolvePaymentTermsText(settings.payment_terms_text, globalDueDays, effectiveDueDays),
    footerText: settings.footer_text,
  }
}
