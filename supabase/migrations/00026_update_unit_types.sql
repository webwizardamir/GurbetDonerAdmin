-- =====================================================
-- Migration: Update Unit Types
-- =====================================================
-- Changes unit_type enum:
-- - Remove 'package' (was Pak/Doos combined)
-- - Add 'zak' (Zak - bag)
-- - Add 'doos' (Doos - box)
-- Keep: kg, piece

-- Step 1: Create new enum type
CREATE TYPE unit_type_new AS ENUM ('kg', 'piece', 'zak', 'doos');

-- Step 2: Update products table
-- First drop the default, then change the type, then set new default
ALTER TABLE products ALTER COLUMN unit_type DROP DEFAULT;
ALTER TABLE products
ALTER COLUMN unit_type TYPE unit_type_new
USING (
  CASE unit_type::text
    WHEN 'package' THEN 'doos'::unit_type_new
    ELSE unit_type::text::unit_type_new
  END
);
ALTER TABLE products ALTER COLUMN unit_type SET DEFAULT 'doos'::unit_type_new;

-- Step 3: Update order_items table
ALTER TABLE order_items ALTER COLUMN unit_type DROP DEFAULT;
ALTER TABLE order_items
ALTER COLUMN unit_type TYPE unit_type_new
USING (
  CASE unit_type::text
    WHEN 'package' THEN 'doos'::unit_type_new
    ELSE unit_type::text::unit_type_new
  END
);

-- Step 4: Drop old enum and rename new one
DROP TYPE unit_type;
ALTER TYPE unit_type_new RENAME TO unit_type;

-- Add comments
COMMENT ON TYPE unit_type IS 'Product unit types: kg (weight), piece (stuk), zak (bag), doos (box)';
