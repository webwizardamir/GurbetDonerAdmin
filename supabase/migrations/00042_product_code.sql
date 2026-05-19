-- ============================================================================
-- 00042: System-generated Product ID (MHF-NNNNN), separate from manual SKU
-- ============================================================================
-- Adds a new product_code column that is automatically populated on insert
-- with a stable MHF-NNNNN identifier. Used as the match key in Excel
-- import/export. Distinct from the existing admin-managed `sku` field.
--
-- Safe to re-run (all statements are idempotent).
-- ============================================================================

-- 1. Add the new column (nullable; trigger fills it on insert)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_code TEXT;

-- 2. Partial unique index — existing rows may stay NULL, but every populated
--    value must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_code_unique
  ON products(product_code)
  WHERE product_code IS NOT NULL;

-- 3. Case-insensitive lookup index for search.
CREATE INDEX IF NOT EXISTS idx_products_product_code_lower
  ON products(lower(product_code));

-- 4. Sequence backing the auto-generated IDs.
CREATE SEQUENCE IF NOT EXISTS product_code_seq START WITH 1 INCREMENT BY 1;

-- 5. Trigger function: assign MHF-NNNNN on insert when not provided.
CREATE OR REPLACE FUNCTION set_product_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_code IS NULL OR btrim(NEW.product_code) = '' THEN
    NEW.product_code := 'MHF-' || lpad(nextval('product_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger: BEFORE INSERT only — never modifies product_code on UPDATE.
DROP TRIGGER IF EXISTS trg_set_product_code ON products;
CREATE TRIGGER trg_set_product_code
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_product_code();

COMMENT ON COLUMN products.product_code IS
  'System-generated stable Product ID (MHF-NNNNN). Used as the match key in Excel import/export. Distinct from the manual sku field.';
COMMENT ON SEQUENCE product_code_seq IS
  'Backing sequence for auto-generated Product IDs.';
