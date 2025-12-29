-- =====================================================
-- Fix Products Constraints
-- =====================================================

-- Make SKU nullable (not all products have SKU)
ALTER TABLE products ALTER COLUMN sku DROP NOT NULL;

-- Make price nullable (we use base_price now)
ALTER TABLE products ALTER COLUMN price DROP NOT NULL;

-- Set default for price if null
ALTER TABLE products ALTER COLUMN price SET DEFAULT 0;
