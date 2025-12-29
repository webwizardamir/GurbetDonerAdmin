-- =====================================================
-- Phase 2: Products & Categories
-- =====================================================

-- -----------------------------------------------------
-- Categories Table (simple flat structure)
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
-- Unit Type Enum (standard food wholesale)
-- -----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('kg', 'piece', 'package');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------
-- Products Table
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  unit_type unit_type NOT NULL DEFAULT 'package',
  base_price INTEGER NOT NULL DEFAULT 0, -- cents (EUR)
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 9.00, -- Dutch BTW (9% for food)

  description TEXT,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Indexes
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
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

-- Everyone can view active categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true OR is_admin_user());

-- Only admins can insert categories
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
CREATE POLICY "Admins can insert categories" ON categories
  FOR INSERT WITH CHECK (is_admin_user());

-- Only admins can update categories
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories" ON categories
  FOR UPDATE USING (is_admin_user());

-- Only owner can delete categories
DROP POLICY IF EXISTS "Owner can delete categories" ON categories;
CREATE POLICY "Owner can delete categories" ON categories
  FOR DELETE USING (is_owner());

-- -----------------------------------------------------
-- RLS Policies for Products
-- -----------------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Everyone can view active products
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true OR is_admin_user());

-- Admins can insert products
DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products" ON products
  FOR INSERT WITH CHECK (is_admin_user());

-- Admins can update products
DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products" ON products
  FOR UPDATE USING (is_admin_user());

-- Only owner can delete products
DROP POLICY IF EXISTS "Owner can delete products" ON products;
CREATE POLICY "Owner can delete products" ON products
  FOR DELETE USING (is_owner());

-- -----------------------------------------------------
-- Helper Functions for Products
-- -----------------------------------------------------

-- Search products function
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

-- Get product stats function
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
-- Audit Log Triggers for Products & Categories
-- -----------------------------------------------------

-- Categories audit trigger
DROP TRIGGER IF EXISTS audit_categories_changes ON categories;
CREATE TRIGGER audit_categories_changes
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Products audit trigger
DROP TRIGGER IF EXISTS audit_products_changes ON products;
CREATE TRIGGER audit_products_changes
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
