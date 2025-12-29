-- =====================================================
-- Add track_stock column to products
-- Cost column already exists from original schema
-- =====================================================

-- Add track_stock column (default true = stock is managed)
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT true;

-- Ensure cost column exists and is in cents (integer)
-- Original schema has cost as DECIMAL, let's add cost_cents for consistency
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_cents INTEGER DEFAULT 0;

-- Migrate any existing cost data to cost_cents
UPDATE products SET cost_cents = COALESCE((cost * 100)::INTEGER, 0) WHERE cost_cents = 0 OR cost_cents IS NULL;
