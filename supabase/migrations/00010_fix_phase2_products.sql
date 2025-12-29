-- =====================================================
-- Fix Phase 2: Alter existing products table
-- =====================================================

-- -----------------------------------------------------
-- Categories Table (if not exists)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Unit Type Enum
-- -----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('kg', 'piece', 'package');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------
-- Alter Products Table - Add new columns
-- -----------------------------------------------------

-- Add category_id column
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Add barcode column
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Add unit_type column (default to 'package')
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_type unit_type DEFAULT 'package';

-- Add base_price column (in cents) - migrate from price column
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price INTEGER DEFAULT 0;

-- Add tax_rate column
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 9.00;

-- Add created_by column
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Migrate existing price data to base_price (convert from decimal euros to integer cents)
UPDATE products SET base_price = COALESCE((price * 100)::INTEGER, 0) WHERE base_price = 0 OR base_price IS NULL;

-- Convert existing 'unit' column values to unit_type enum
UPDATE products SET unit_type = 'kg' WHERE unit = 'kg';
UPDATE products SET unit_type = 'piece' WHERE unit IN ('piece', 'pcs', 'st', 'stuk');
UPDATE products SET unit_type = 'package' WHERE unit IN ('package', 'box', 'doos', 'pak');

-- Set default for any remaining
UPDATE products SET unit_type = 'package' WHERE unit_type IS NULL;

-- Make unit_type NOT NULL
ALTER TABLE products ALTER COLUMN unit_type SET NOT NULL;

-- -----------------------------------------------------
-- Indexes
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- -----------------------------------------------------
-- Updated_at Triggers
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- RLS Policies for Categories
-- -----------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true OR is_admin_user());

DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
CREATE POLICY "Admins can insert categories" ON categories
  FOR INSERT WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories" ON categories
  FOR UPDATE USING (is_admin_user());

DROP POLICY IF EXISTS "Owner can delete categories" ON categories;
CREATE POLICY "Owner can delete categories" ON categories
  FOR DELETE USING (is_owner());

-- -----------------------------------------------------
-- RLS Policies for Products (update existing)
-- -----------------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true OR is_admin_user());

DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products" ON products
  FOR INSERT WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products" ON products
  FOR UPDATE USING (is_admin_user());

DROP POLICY IF EXISTS "Owner can delete products" ON products;
CREATE POLICY "Owner can delete products" ON products
  FOR DELETE USING (is_owner());

-- -----------------------------------------------------
-- Helper Functions for Products
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION search_products(search_query TEXT)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM products
  WHERE
    name ILIKE '%' || search_query || '%'
    OR sku ILIKE '%' || search_query || '%'
    OR barcode ILIKE '%' || search_query || '%'
    OR description ILIKE '%' || search_query || '%'
  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_product_stats()
RETURNS TABLE (
  total_products BIGINT,
  active_products BIGINT,
  categories_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM products)::BIGINT as total_products,
    (SELECT COUNT(*) FROM products WHERE is_active = true)::BIGINT as active_products,
    (SELECT COUNT(*) FROM categories WHERE is_active = true)::BIGINT as categories_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Audit Log Triggers (only if function exists)
-- -----------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_changes') THEN
    DROP TRIGGER IF EXISTS audit_categories_changes ON categories;
    CREATE TRIGGER audit_categories_changes
      AFTER INSERT OR UPDATE OR DELETE ON categories
      FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

    DROP TRIGGER IF EXISTS audit_products_changes ON products;
    CREATE TRIGGER audit_products_changes
      AFTER INSERT OR UPDATE OR DELETE ON products
      FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
  END IF;
END $$;
