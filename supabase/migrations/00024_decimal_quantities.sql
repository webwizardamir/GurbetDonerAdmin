-- =====================================================
-- Migration: Support Decimal Quantities
-- =====================================================
-- Allows decimal quantities for all product types
-- Enables flexible ordering (e.g., 1.5 packages, 0.75 kg)

-- Change stock_quantity from INTEGER to DECIMAL(10,3)
-- This supports up to 9,999,999.999 units with 3 decimal places
ALTER TABLE products
ALTER COLUMN stock_quantity TYPE DECIMAL(10,3)
USING stock_quantity::DECIMAL(10,3);

-- Set default for new products
ALTER TABLE products
ALTER COLUMN stock_quantity SET DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN products.stock_quantity IS 'Current stock quantity, supports decimals (e.g., 1.5 kg, 2.25 packages)';
COMMENT ON COLUMN order_items.quantity IS 'Order quantity, supports decimals (e.g., 1.5 kg, 2.25 packages)';
