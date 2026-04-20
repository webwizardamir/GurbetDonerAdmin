-- Preserve WooCommerce (WP Overnight) invoice numbers for legacy search/reference.
-- These are distinct from the WC order ID and from any future invoice numbers
-- the new system may generate via the documents table.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS woo_invoice_number INTEGER,
  ADD COLUMN IF NOT EXISTS woo_invoice_date TIMESTAMPTZ;

COMMENT ON COLUMN orders.woo_invoice_number IS
  'WP Overnight invoice number from WooCommerce (_wcpdf_invoice_number meta). Searchable legacy reference.';

COMMENT ON COLUMN orders.woo_invoice_date IS
  'Invoice date from WP Overnight (_wcpdf_invoice_date_formatted). Usually matches order_date.';

-- Partial index: invoice number is unique when present, so b-tree on the populated subset is efficient.
CREATE INDEX IF NOT EXISTS idx_orders_woo_invoice_number
  ON orders(woo_invoice_number)
  WHERE woo_invoice_number IS NOT NULL;
