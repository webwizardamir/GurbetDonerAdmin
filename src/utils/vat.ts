// VAT helpers for Dutch B2B reverse-charge handling.
//
// Rule: NL company sells from NL → customer outside NL → 0% BTW with
// "BTW verlegd" notice + customer's VAT number on the invoice. Customer
// self-accounts for VAT in their own country.
//
// Imported (WooCommerce) orders are frozen — their tax_rate stays as it
// was when the original invoice went out, even on edit.

export function isReverseChargeCountry(country: string | undefined | null): boolean {
  if (!country) return false
  return country.trim().toUpperCase() !== 'NL'
}

export function isImportedOrder(
  order: { woo_invoice_number?: number | null; woo_invoice_date?: string | null } | null | undefined
): boolean {
  if (!order) return false
  return !!order.woo_invoice_number || !!order.woo_invoice_date
}
