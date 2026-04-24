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

// Build invoice data from order and settings
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

  // Calculate due date
  const orderDate = new Date(order.order_date || order.created_at)
  const dueDate = new Date(orderDate)
  dueDate.setDate(dueDate.getDate() + (settings.payment_terms_days || 14))

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
  const items = (order.items || []).map((item: Record<string, unknown>, idx: number) => {
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

  const vatBreakdown = Array.from(vatMap.entries())
    .map(([rate, { base, amount }]) => ({ rate, base, amount }))
    .sort((a, b) => a.rate - b.rate)

  const totalVat = vatBreakdown.reduce((sum, v) => sum + v.amount, 0)
  const subtotal = Number(order.subtotal) || items.reduce((sum: number, i: { unitPrice: number; quantity: number }) => sum + (i.unitPrice * i.quantity), 0)
  const grandTotal = Number(order.total) || (subtotal + totalVat)

  // Build customer address
  const customer = order.customer || {}

  return {
    documentNumber: '', // Will be set when generating
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

    paymentTerms: settings.payment_terms_text,
    footerText: settings.footer_text,
  }
}
