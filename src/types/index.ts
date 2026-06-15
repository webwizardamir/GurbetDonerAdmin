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
  // Geocode cache (delivery route) — see migration 00055
  latitude?: number | null
  longitude?: number | null
  geocoded_at?: string | null
  geocode_status?: 'ok' | 'zero_results' | 'error' | null
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
  price_cents: number
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
  discount_amount: number // cents
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
  discount_amount: number // cents
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
  email_templates?: EmailTemplateMap | null

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

export type EmailTemplateMap = Partial<Record<EmailDocumentType, EmailTemplate>>

export type DocumentSendStatus = 'pending' | 'sent' | 'failed' | 'bounced'

export interface DocumentSend {
  id: string
  document_id: string | null
  order_id: string | null
  document_type: EmailDocumentType
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
