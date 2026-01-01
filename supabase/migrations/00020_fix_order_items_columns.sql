-- =====================================================
-- Fix order_items columns to ensure all required fields exist
-- =====================================================

-- Ensure all columns exist with correct types
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'piece';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_amount INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_total INTEGER DEFAULT 0;

-- Make sure NOT NULL constraints don't block inserts
ALTER TABLE order_items ALTER COLUMN unit_type SET DEFAULT 'piece';
ALTER TABLE order_items ALTER COLUMN discount_amount SET DEFAULT 0;
ALTER TABLE order_items ALTER COLUMN tax_rate SET DEFAULT 0;
ALTER TABLE order_items ALTER COLUMN tax_amount SET DEFAULT 0;
ALTER TABLE order_items ALTER COLUMN line_total SET DEFAULT 0;

-- Drop NOT NULL constraints if they exist (they cause issues)
DO $$
BEGIN
  ALTER TABLE order_items ALTER COLUMN unit_type DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE order_items ALTER COLUMN tax_rate DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE order_items ALTER COLUMN tax_amount DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE order_items ALTER COLUMN line_total DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
