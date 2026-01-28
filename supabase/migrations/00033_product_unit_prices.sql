-- =====================================================
-- MULTI-UNIT-TYPE PRICING FOR PRODUCTS
-- =====================================================
-- Allows a single product to have multiple unit types (piece, zak, doos, kg)
-- each with its own price, instead of creating separate products for each unit type.

-- Create product_unit_prices table
CREATE TABLE IF NOT EXISTS product_unit_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_type unit_type NOT NULL,
  price INTEGER,  -- cents, NULL = unit type not available for sale
  cost_cents INTEGER,  -- Owner only
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, unit_type)
);

-- Add stock_unit_type to products (what unit the stock quantity represents)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_unit_type unit_type;

-- Add unit_type to customer_prices for unit-specific customer pricing
ALTER TABLE customer_prices ADD COLUMN IF NOT EXISTS unit_type unit_type;

-- Drop existing unique constraint if it exists
ALTER TABLE customer_prices DROP CONSTRAINT IF EXISTS customer_prices_customer_id_product_id_key;

-- Add new unique constraint that includes unit_type
ALTER TABLE customer_prices ADD CONSTRAINT customer_prices_customer_product_unit_key
  UNIQUE(customer_id, product_id, unit_type);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_product_unit_prices_product_id
  ON product_unit_prices(product_id);

CREATE INDEX IF NOT EXISTS idx_customer_prices_unit_type
  ON customer_prices(customer_id, product_id, unit_type);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_product_unit_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS update_product_unit_prices_updated_at ON product_unit_prices;
CREATE TRIGGER update_product_unit_prices_updated_at
  BEFORE UPDATE ON product_unit_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_product_unit_prices_updated_at();

-- Ensure only one default per product
CREATE OR REPLACE FUNCTION ensure_single_default_unit_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE product_unit_prices
    SET is_default = false
    WHERE product_id = NEW.product_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS ensure_single_default_unit_price ON product_unit_prices;
CREATE TRIGGER ensure_single_default_unit_price
  BEFORE INSERT OR UPDATE ON product_unit_prices
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_unit_price();

-- =====================================================
-- DATA MIGRATION: Migrate existing products
-- =====================================================
-- Create unit_prices rows from existing product data

INSERT INTO product_unit_prices (product_id, unit_type, price, cost_cents, is_default)
SELECT
  id,
  unit_type,
  base_price,
  cost_cents,
  true
FROM products
WHERE NOT EXISTS (
  SELECT 1 FROM product_unit_prices pup
  WHERE pup.product_id = products.id AND pup.unit_type = products.unit_type
);

-- Set stock_unit_type to current unit_type for existing products
UPDATE products
SET stock_unit_type = unit_type
WHERE stock_unit_type IS NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE product_unit_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can view product unit prices
CREATE POLICY "product_unit_prices_select_all" ON product_unit_prices
  FOR SELECT USING (true);

-- Only owner can insert/update/delete (shop managers have no cost visibility)
CREATE POLICY "product_unit_prices_insert_owner" ON product_unit_prices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'owner'
    )
  );

CREATE POLICY "product_unit_prices_update_owner" ON product_unit_prices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'owner'
    )
  );

CREATE POLICY "product_unit_prices_delete_owner" ON product_unit_prices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'owner'
    )
  );

-- Shop managers can also manage unit prices (but cost_cents should be null)
CREATE POLICY "product_unit_prices_insert_manager" ON product_unit_prices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'shop_manager'
    )
    AND cost_cents IS NULL
  );

CREATE POLICY "product_unit_prices_update_manager" ON product_unit_prices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'shop_manager'
    )
  )
  WITH CHECK (cost_cents IS NULL);

CREATE POLICY "product_unit_prices_delete_manager" ON product_unit_prices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'shop_manager'
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE product_unit_prices IS 'Stores unit-type-specific pricing for products';
COMMENT ON COLUMN product_unit_prices.price IS 'Price in cents. NULL means this unit type is not available for sale';
COMMENT ON COLUMN product_unit_prices.cost_cents IS 'Cost of goods in cents. Owner only field';
COMMENT ON COLUMN product_unit_prices.is_default IS 'If true, this unit type is shown first in order forms';
COMMENT ON COLUMN products.stock_unit_type IS 'The unit type that stock_quantity represents (e.g., 50 stuks or 10 dozen)';
COMMENT ON COLUMN customer_prices.unit_type IS 'The specific unit type this price applies to. NULL means default unit type';
