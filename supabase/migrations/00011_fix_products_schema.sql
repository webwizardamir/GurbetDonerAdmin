-- =====================================================
-- Fix Products Schema - Ensure all columns exist
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 9.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Ensure stock_quantity exists (from original schema, should already be there)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Create unit_type enum if not exists
DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('kg', 'piece', 'package');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add unit_type column (can't use IF NOT EXISTS with custom type easily)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit_type') THEN
    ALTER TABLE products ADD COLUMN unit_type unit_type DEFAULT 'package';
  END IF;
END $$;

-- Migrate old 'unit' column data to unit_type if unit column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit') THEN
    UPDATE products SET unit_type = 'kg' WHERE unit = 'kg' AND unit_type IS NULL;
    UPDATE products SET unit_type = 'piece' WHERE unit IN ('piece', 'pcs', 'st', 'stuk') AND unit_type IS NULL;
    UPDATE products SET unit_type = 'package' WHERE unit_type IS NULL;
  END IF;
END $$;

-- Migrate old 'price' to 'base_price' if price exists and base_price is 0
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price') THEN
    UPDATE products SET base_price = COALESCE((price * 100)::INTEGER, 0) WHERE base_price = 0 OR base_price IS NULL;
  END IF;
END $$;

-- Drop is_active column (simplify - just delete products)
-- First drop any policies referencing is_active
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

-- Create simpler policy
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
CREATE POLICY "Authenticated users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Keep other policies
DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products" ON products
  FOR INSERT WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products" ON products
  FOR UPDATE USING (is_admin_user());

DROP POLICY IF EXISTS "Owner can delete products" ON products;
CREATE POLICY "Owner can delete products" ON products
  FOR DELETE USING (is_owner());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
