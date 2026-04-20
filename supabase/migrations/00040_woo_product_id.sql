-- Canonical WC product identity on every SB product. Enables deterministic
-- dedup across renames, and lets per-product analytics aggregate correctly
-- when WC renames a product.
--
-- woo_product_id = WordPress post ID of the WC product (from line_items.product_id).
-- UNIQUE so accidental double-link fails loud.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS woo_product_id INTEGER,
  ADD COLUMN IF NOT EXISTS woo_status TEXT;

-- Partial unique index: NULL allowed (not every product has a WC id), but
-- two SB products can't share the same WC id.
CREATE UNIQUE INDEX IF NOT EXISTS products_woo_product_id_unique
  ON products(woo_product_id)
  WHERE woo_product_id IS NOT NULL;

COMMENT ON COLUMN products.woo_product_id IS
  'WordPress post ID of the WooCommerce product. Sourced from line_items.product_id and /products endpoint. UNIQUE when set.';

COMMENT ON COLUMN products.woo_status IS
  'WC product status snapshot (publish / draft / trash). NULL = never linked to WC.';
