-- =====================================================
-- Migration: Fix order_items quantity to support decimals
-- =====================================================
-- The previous migration only changed products.stock_quantity
-- This fixes order_items.quantity to also support decimals

-- Change order_items.quantity from INTEGER to DECIMAL(10,3)
ALTER TABLE order_items
ALTER COLUMN quantity TYPE DECIMAL(10,3)
USING quantity::DECIMAL(10,3);

-- Set default for new order items
ALTER TABLE order_items
ALTER COLUMN quantity SET DEFAULT 1;
