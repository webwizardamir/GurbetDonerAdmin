// =====================================================
// USER & AUTH TYPES
// =====================================================

// User roles - matches database enum
export type UserRole = 'owner' | 'shop_manager' | 'admin' | 'customer'

// Resources for permission system
export type Resource =
  | 'customers'
  | 'products'
  | 'orders'
  | 'documents'
  | 'inventory'
  | 'analytics'
  | 'settings'
  | 'audit_log'

// Actions for permission system
export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'view_cost'
  | 'view_profit'
  | 'generate'
  | 'download'
  | 'adjust'
  | 'refund'
  | 'export'

// Permission type
export interface Permission {
  id: string
  role: UserRole
  resource: Resource
  action: Action
  allowed: boolean
}

// User profile type
export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

// Session info
export interface UserSession {
  id: string
  user_id: string
  session_token: string
  ip_address?: string
  user_agent?: string
  expires_at: string
  created_at: string
  last_active_at: string
}

// Auth state
export interface AuthState {
  user: UserProfile | null
  session: unknown | null
  loading: boolean
  permissions: Permission[]
}

// =====================================================
// AUDIT LOG TYPES
// =====================================================

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditLog {
  id: string
  user_id: string
  user_email: string
  action: AuditAction
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address?: string
  user_agent?: string
  created_at: string
}

// =====================================================
// CUSTOMER TYPES
// =====================================================

export interface Customer {
  id: string
  company_name: string
  contact_person?: string
  email?: string
  phone?: string
  vat_number?: string
  // Per-customer invoice payment term (days). NULL = use global default.
  payment_due_days?: number | null
  // Billing address
  billing_street?: string
  billing_city?: string
  billing_postal_code?: string
  billing_country: string
  // Shipping address
  shipping_same_as_billing: boolean
  shipping_street?: string
  shipping_city?: string
  shipping_postal_code?: string
  shipping_country?: string
  // Pricing
  price_list_id?: string | null
  price_list?: PriceList | null
  // Admin-only classification (migration 00091). NULL = untagged. Never on customer-facing docs.
  customer_type?: 'horeca' | 'supermarkt' | 'other' | null
  // Geocode cache (delivery route) — see migration 00055
  latitude?: number | null
  longitude?: number | null
  geocoded_at?: string | null
  geocode_status?: 'ok' | 'zero_results' | 'error' | null
  // Archive (soft delete) — migration 00093. is_active=false → archived.
  is_active: boolean
  archived_at?: string | null
  // Other
  internal_notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PriceList {
  id: string
  name: string
  description?: string | null
  currency: string
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface PriceListItem {
  id: string
  price_list_id: string
  product_id: string
  unit_type: UnitType
  price_cents: number | null // cents, null = inherit the product default price
  cost_cents?: number | null // cents, null = inherit the product default cost (Owner only)
  tax_rate?: number | null
  created_at: string
  updated_at: string
  product?: Product | null
}

// =====================================================
// PRODUCT TYPES
// =====================================================

export type UnitType = 'kg' | 'piece' | 'zak' | 'doos'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Unit price for a specific unit type
export interface ProductUnitPrice {
  id: string
  product_id: string
  unit_type: UnitType
  price: number | null  // cents, null = unit type not available for sale
  cost_cents?: number | null  // Owner only
  is_default: boolean
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: string
  product_code?: string | null // System-generated stable Product ID (MHF-NNNNN)
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  category?: Category
  unit_type: UnitType
  base_price: number // stored in cents
  cost_cents?: number // Cost of goods in cents (Owner only)
  tax_rate: number
  stock_quantity: number
  stock_unit_type?: UnitType // What unit the stock quantity represents
  track_stock: boolean // Whether stock management is enabled
  description?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Multi-unit pricing
  unit_prices?: ProductUnitPrice[]
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  sku?: string
  barcode?: string
  price_adjustment: number // cents
  is_active: boolean
  created_at: string
}

// =====================================================
// INVENTORY & BATCH TYPES
// =====================================================

export interface ProductBatch {
  id: string
  product_id: string
  variant_id?: string
  quantity_received: number
  quantity_remaining: number
  unit_cost: number // cents - Owner only
  lot_number?: string
  expiry_date: string
  received_date: string
  supplier?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface StockAdjustment {
  id: string
  product_id: string
  batch_id?: string
  quantity_change: number
  reason: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface LowStockThreshold {
  id: string
  product_id: string
  threshold: number
}

// =====================================================
// PRICING TYPES
// =====================================================

export interface CustomerPrice {
  id: string
  customer_id: string
  product_id: string
  variant_id?: string
  unit_type?: UnitType // Specific unit type this price applies to
  custom_price: number // cents
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PriceHistory {
  id: string
  customer_price_id: string
  old_price?: number
  new_price: number
  changed_by?: string
  changed_at: string
}

// =====================================================
// ORDER TYPES
// =====================================================

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'on_hold'
  | 'cancelled'
  | 'refunded'
  | 'completed'
  // Original schema statuses
  | 'pending'
  | 'processing'
  | 'delivered'

export type PaymentMethod = 'bank' | 'cash' | 'none'

export interface Order {
  id: string
  order_number: string
  customer_id: string
  customer?: Customer
  status: OrderStatus
  payment_method?: PaymentMethod
  subtotal: number // cents
  discount_amount: number // cents — resolved grand-total discount (line + order-level)
  // Echo of the order-level discount input, so edit round-trips ("10%" reopens
  // as "10%"). percentage -> basis points (10% = 1000); fixed -> cents.
  discount_type?: 'percentage' | 'fixed' | null
  discount_value?: number | null
  tax_amount: number // cents
  delivery_fee: number // cents
  total: number // cents
  order_date: string
  invoice_date?: string
  woo_invoice_number?: number | null
  woo_invoice_date?: string | null
  refund_amount?: number // cents
  refunds?: OrderRefund[]
  delivery_notes?: string
  internal_notes?: string
  // Owner-only privacy flag (migration 00095). When true, only the owner can
  // see this order, its items, its documents/emails and its money in any
  // aggregate. Enforced in RLS, so a shop manager never receives the row at
  // all — for them this is always false/absent. The customer portal is
  // deliberately unaffected.
  hidden_from_managers?: boolean
  created_by?: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface OrderRefund {
  id: string
  order_id?: string
  woo_refund_id?: number | null
  woo_credit_note_number?: number | null
  refund_date: string
  amount: number // cents, positive
  reason?: string | null
  created_at?: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id?: string
  product_name: string
  product_sku?: string
  unit_type: UnitType
  quantity: number
  unit_price: number // cents - price at time of sale
  cost_cents?: number // cents - cost at time of sale, for profit calculation
  discount_amount: number // cents — resolved LINE discount only (not the order-level share)
  // Echo of the line discount input, so edit round-trips. percentage -> basis
  // points (10% = 1000); fixed -> cents.
  discount_type?: 'percentage' | 'fixed' | null
  discount_value?: number | null
  tax_rate: number
  tax_amount: number // cents
  line_total: number // cents
  notes?: string
  meta?: Record<string, unknown>
  created_at: string
}

export interface OrderItemBatch {
  id: string
  order_item_id: string
  batch_id: string
  quantity_used: number
  unit_cost: number // cents - for profit calculation
}

export interface OrderDiscount {
  id: string
  order_id: string
  discount_type: 'percentage' | 'fixed_cart' | 'fixed_product'
  description?: string
  amount: number // cents or percentage
  applied_to_item_id?: string
}

export interface OrderFee {
  id: string
  order_id: string
  fee_type: 'delivery' | 'custom'
  description?: string
  amount: number // cents
}

// =====================================================
// DOCUMENT TYPES
// =====================================================

export type DocumentType = 'invoice' | 'proforma' | 'credit_note' | 'packing_slip' | 'order_confirmation' | 'payment_reminder'

export interface Document {
  id: string
  order_id?: string
  document_type: DocumentType
  document_number: string
  snapshot?: Record<string, unknown>
  pdf_url?: string
  file_size?: number
  generated_by?: string
  generated_at: string
}

export interface DocumentSettings {
  id: string

  // Company Identity
  company_name: string
  company_address?: string
  company_postal_code?: string
  company_city?: string
  company_country: string
  company_phone?: string
  company_email?: string
  company_website?: string
  company_logo_url?: string

  // Legal Registration
  company_vat_number?: string
  company_kvk_number?: string

  // Bank Details
  bank_name?: string
  bank_iban?: string
  bank_bic?: string
  bank_account_holder?: string

  // Payment Terms
  payment_terms_days: number
  payment_terms_text?: string

  // Numbering - Invoice
  invoice_prefix: string
  invoice_next_number: number

  // Numbering - Proforma
  proforma_prefix: string
  proforma_next_number: number

  // Numbering - Credit Note
  credit_note_prefix: string
  credit_note_next_number: number

  // Numbering - Packing Slip
  packing_slip_prefix: string
  packing_slip_next_number: number

  // Numbering - Order Confirmation
  order_confirmation_prefix: string
  order_confirmation_next_number: number

  // Numbering - Payment Reminder
  payment_reminder_prefix: string
  payment_reminder_next_number: number

  // Numbering - Orders (plain WooCommerce-style counter, no prefix/padding)
  order_next_number: number

  // Customizable Labels
  label_invoice: string
  label_proforma: string
  label_credit_note: string
  label_packing_slip: string
  label_order_confirmation: string
  label_payment_reminder: string
  label_invoice_address: string
  label_date: string
  label_customer_number: string
  label_due_date: string
  label_description: string
  label_quantity: string
  label_unit: string
  label_unit_price: string
  label_vat: string
  label_total: string
  label_subtotal: string
  label_grand_total: string
  label_payment_method: string
  label_cash: string
  label_bank: string
  label_on_account: string
  label_for_approval: string
  label_name: string
  label_signature: string

  // Footer
  footer_text?: string

  // Email (Phase 5)
  email_bcc?: string | null
  // Localized per-language template map (migration 00077). Legacy rows may still
  // hold a flat EmailTemplateMap — normalizeEmailTemplates() handles both.
  email_templates?: LocalizedEmailTemplates | EmailTemplateMap | null

  // Client overdue-invoice reminder schedule (migration 00058)
  client_reminder_config?: ClientReminderConfig | null

  // Delivery depot (route start/return point) — see migration 00055
  depot_label?: string
  depot_street?: string
  depot_postal_code?: string
  depot_city?: string
  depot_country?: string
  depot_latitude?: number | null
  depot_longitude?: number | null

  // Timestamps
  created_at: string
  updated_at: string
}

// Phase 5: per-document-type email template
export type EmailDocumentType =
  | 'invoice'
  | 'proforma'
  | 'credit_note'
  | 'packing_slip'
  | 'order_confirmation'
  | 'payment_reminder'

export interface EmailTemplate {
  subject: string
  body: string
}

// Per-step reminder template keys live in the same email_templates JSONB map but
// are NOT valid document_sends.document_type enum values — sends always log as
// 'payment_reminder'. These are just extra keys for storing escalation copy.
export type ReminderStepKey =
  | 'payment_reminder_1'
  | 'payment_reminder_2'
  | 'payment_reminder_final'

/**
 * Monthly Betaaloverzicht (statement of account).
 *
 * This one IS a real `document_sends.document_type` enum value (migration 00102)
 * — unlike ReminderStepKey above — because it must be countable separately from
 * 'payment_reminder', whose rows drive the dunning ladder.
 *
 * It is deliberately NOT part of `DocumentType`: a statement is never a numbered
 * legal document, has no `documents` row, and has no entry in getDocumentTemplate.
 */
export type PaymentOverviewKey = 'payment_overview'

export type EmailTemplateKey = EmailDocumentType | ReminderStepKey | PaymentOverviewKey

export type EmailTemplateMap = Partial<Record<EmailTemplateKey, EmailTemplate>>

// Document/email language. NL/BE customers get 'nl', everyone else 'en'
// (see utils/documentLang.ts). Email templates are stored per-language.
export type EmailLang = 'nl' | 'en'

export interface LocalizedEmailTemplates {
  nl: EmailTemplateMap
  en: EmailTemplateMap
}

// ---------------------------------------------------------------------------
// Client overdue-invoice reminder configuration (document_settings JSONB)
// ---------------------------------------------------------------------------
export type ReminderTone = 'gentle' | 'second' | 'final'

export interface ClientReminderStep {
  days_after_due: number       // overdue days at which this step fires
  template_key: EmailTemplateKey // which email_templates entry to use
  tone: ReminderTone           // drives PDF escalation wording
}

export interface ClientReminderConfig {
  auto_send_enabled: boolean   // GLOBAL kill-switch for automated reminder email
  send_hour: number            // 0-23 local hour the daily job may send
  working_days_only: boolean   // skip Sat/Sun for automated sends
  repeat_interval_days: number // after the last explicit step, repeat every N days
  max_count: number            // max reminders ever sent per invoice
  steps: ClientReminderStep[]  // ordered escalation milestones
  // Auto-email the invoice (PDF attached) ~24h after the order is created.
  // Separate from the reminder kill-switch; OPT-IN (treated as false when absent).
  initial_invoice_send_enabled?: boolean
  // Email every customer with outstanding orders a single Betaaloverzicht
  // (statement of account) on the FIRST WORKING DAY of each month, at send_hour.
  // Independent of auto_send_enabled — a statement is not a dunning letter.
  // OPT-IN (treated as false when absent); enabling mid-month does not backfill.
  monthly_overview_enabled?: boolean
}

// ---------------------------------------------------------------------------
// Overdue-invoice work queue (get_overdue_invoices RPC row)
// ---------------------------------------------------------------------------
export interface OverdueInvoice {
  order_id: string
  order_number: string
  customer_id: string
  customer_name: string
  customer_email: string | null
  total: number                // cents
  invoice_due_date: string     // YYYY-MM-DD
  days_overdue: number
  invoice_number: string | null
  reminders_sent: number
  last_reminder_at: string | null
  snoozed_until: string | null
}

// ---------------------------------------------------------------------------
// Monthly Betaaloverzicht — statement of account (migrations 00102/00103)
// ---------------------------------------------------------------------------

/** One row of `get_payment_overview_customers()` — drives the /overdue tab. */
export interface PaymentOverviewCustomer {
  customer_id: string
  company_name: string
  email: string | null
  billing_country: string | null
  reminders_opted_out: boolean
  open_count: number
  overdue_count: number
  total_cents: number
  oldest_due_date: string | null   // YYYY-MM-DD
  // The statement for the period being inspected (this month by default).
  last_overview_id: string | null
  last_period: string | null
  last_sent_at: string | null
  last_send_status: DocumentSendStatus | null
}

/** One row of `get_payment_overview_orders(customer)` — one line on the PDF. */
export interface PaymentOverviewLine {
  order_id: string
  order_number: string
  invoice_number: string
  order_date: string               // YYYY-MM-DD
  invoice_due_date: string | null  // YYYY-MM-DD
  days_overdue: number             // 0 when not yet due
  amount_cents: number             // total minus refunds, incl. VAT
}

/**
 * What the PDF renders from — and what is frozen into
 * `payment_overviews.snapshot`, so a sent statement can be reproduced exactly.
 *
 * Mirrors InvoiceData's split: `company`/`customer` are flattened plain strings
 * (safe to store), prose comes from getDocText(lang) at RENDER time and is never
 * stored. Keep this JSON-serialisable — no Dates, no functions.
 */
export interface PaymentOverviewData {
  lang: 'nl' | 'en'
  /** First day of the statement month, YYYY-MM-DD. */
  period: string
  /** The date the balance was taken, YYYY-MM-DD — printed as "Peildatum". */
  asAtDate: string
  company: {
    name: string
    address?: string
    postalCode?: string
    city?: string
    country?: string
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
  customer: {
    id: string
    companyName: string
    contactPerson?: string
    street?: string
    postalCode?: string
    city?: string
    country?: string
    vatNumber?: string
    customerNumber?: string
  }
  lines: PaymentOverviewLine[]
  totalCents: number
  overdueCents: number
  overdueCount: number
}

/** `payment_overviews` row (migration 00103). */
export interface PaymentOverviewRecord {
  id: string
  customer_id: string
  period: string
  snapshot: PaymentOverviewData
  total_cents: number
  order_count: number
  document_send_id: string | null
  created_at: string
  updated_at: string
}

// invoice_reminders send-log row (migration 00059)
export interface InvoiceReminder {
  id: string
  order_id: string
  step_number: number
  channel: 'manual' | 'auto'
  status: 'sent' | 'failed'
  document_send_id: string | null
  sent_at: string
  created_by: string | null
  created_at: string
}

// 'sent' = accepted by Resend, delivery not yet confirmed.
// 'delivered' = Resend confirmed the mailbox accepted it.
// 'bounced' / 'complained' / 'suppressed' = delivery failed after acceptance
// (the outcome that used to be invisible because it happens post-send).
// 'failed' = the Resend API rejected the request at send time.
// The delivered/bounced/complained/suppressed values are filled in by the
// sync-email-status poller, not at send time.
export type DocumentSendStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'complained'
  | 'suppressed'

// The statuses that mean the customer did NOT receive the email.
export const FAILED_SEND_STATUSES: DocumentSendStatus[] = [
  'failed',
  'bounced',
  'complained',
  'suppressed',
]

// The statuses that mean the email reached (or is expected to reach) the
// customer — i.e. show a green "sent" affordance. NOT the same question as
// "may we send it again?" (see NOT_YET_SENT_STATUSES in the reminders edge
// function): a bounced email WAS sent but never arrived, so it belongs here as
// a failure while still blocking a re-send.
export const SUCCESSFUL_SEND_STATUSES: DocumentSendStatus[] = ['sent', 'delivered']

/**
 * True when a send reached (or is expected to reach) the customer.
 *
 * Never test `status === 'sent'` directly: 'sent' only survives ~15 minutes
 * before the sync-email-status poller rewrites the row in place to the real
 * Resend outcome ('delivered' etc.), after which an equality check silently
 * reports every historic email as never-sent.
 */
export function isSuccessfulSend(status: string): boolean {
  return (SUCCESSFUL_SEND_STATUSES as string[]).includes(status)
}

export interface DocumentSend {
  id: string
  document_id: string | null
  order_id: string | null
  // 'payment_overview' rows carry NEITHER document_id NOR order_id — a statement
  // spans many orders. Follow payment_overviews.document_send_id back instead.
  document_type: EmailDocumentType | PaymentOverviewKey
  recipient_email: string
  bcc_email: string | null
  subject: string
  body: string
  status: DocumentSendStatus
  error_message: string | null
  resend_message_id: string | null
  sent_at: string | null
  sent_by: string | null
  created_at: string
}

// =====================================================
// PAYMENT & INVOICE TYPES
// =====================================================

export type PaymentStatus = 'paid' | 'unpaid' | 'partial'

export interface Invoice {
  id: string
  invoice_number: string
  order_id: string
  customer_id: string
  status: PaymentStatus
  subtotal: number
  tax: number
  total: number
  amount_paid: number
  amount_due: number
  issue_date: string
  due_date: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  payment_number: string
  invoice_id: string
  customer_id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number?: string
  notes?: string
  created_by?: string
  created_at: string
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

export interface DashboardStats {
  totalOrders: number
  totalRevenue: number // cents
  totalCustomers: number
  pendingOrders: number
  ordersGrowth: number // percentage
  revenueGrowth: number // percentage
  customersGrowth: number // percentage
  pendingGrowth: number // percentage
  // Owner only
  totalProfit?: number // cents
  profitMargin?: number // percentage
  vatCollected?: number // cents
}

export interface SalesReport {
  period: string
  revenue: number
  orders: number
  items_sold: number
  average_order_value: number
  profit?: number // Owner only
}

export interface TopItem {
  id: string
  name: string
  value: number
  count: number
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, unknown>
}

// Form types
export interface LoginForm {
  email: string
  password: string
  remember_me?: boolean
}

export interface ForgotPasswordForm {
  email: string
}

export interface ResetPasswordForm {
  password: string
  confirm_password: string
}
