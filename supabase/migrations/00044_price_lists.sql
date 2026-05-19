-- ============================================================================
-- 00044: Country / customer price lists
-- ============================================================================
-- Adds two tables:
--   - price_lists       — named lists ("Italy 2026", "Belgium HoReCa", etc.)
--   - price_list_items  — per-product, per-unit overrides on a list
--
-- And one column:
--   - customers.price_list_id — nullable single FK; a customer is either on
--                                a list or falls through to product defaults.
--
-- Resolution chain in TS (src/services/pricing.ts) becomes:
--   1. customer_prices    (per-customer custom override)         highest
--   2. price_list_items   (if customer.price_list_id is set)
--   3. product_unit_prices (product default per unit)
--   4. products.base_price                                       lowest
--
-- RLS pattern matches `categories`: is_admin_user() can read + edit,
-- is_owner() can delete. Read access is broad so OrderForm can resolve
-- prices client-side.
--
-- Safe to re-run (every statement is idempotent).
-- ============================================================================

-- 1. price_lists
CREATE TABLE IF NOT EXISTS price_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  currency    TEXT NOT NULL DEFAULT 'EUR',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_lists_is_active
  ON price_lists(is_active);

COMMENT ON TABLE  price_lists IS 'Named pricing tiers a customer can be assigned to (country list, segment list, etc.).';
COMMENT ON COLUMN price_lists.is_active IS 'Inactive lists are hidden from the customer dropdown but kept for historical orders.';

-- 2. price_list_items
CREATE TABLE IF NOT EXISTS price_list_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  unit_type     TEXT NOT NULL CHECK (unit_type IN ('kg', 'piece', 'zak', 'doos')),
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
  tax_rate      NUMERIC(5,2) CHECK (tax_rate IS NULL OR tax_rate IN (0, 9, 21)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (price_list_id, product_id, unit_type)
);

CREATE INDEX IF NOT EXISTS idx_price_list_items_list    ON price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_product ON price_list_items(product_id);

COMMENT ON COLUMN price_list_items.price_cents IS 'Price in cents. Overrides product_unit_prices for this (list, product, unit).';
COMMENT ON COLUMN price_list_items.tax_rate   IS 'Optional BTW % override. NULL = inherit from products.tax_rate.';

-- 3. customers.price_list_id
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES price_lists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_price_list_id ON customers(price_list_id);

COMMENT ON COLUMN customers.price_list_id IS 'Optional FK to price_lists. NULL = customer falls through to product defaults.';

-- 4. updated_at triggers (re-use the existing helper)
DROP TRIGGER IF EXISTS trg_price_lists_updated_at ON price_lists;
CREATE TRIGGER trg_price_lists_updated_at
  BEFORE UPDATE ON price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_price_list_items_updated_at ON price_list_items;
CREATE TRIGGER trg_price_list_items_updated_at
  BEFORE UPDATE ON price_list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS — admins can read/write, owner can delete, manager can read
ALTER TABLE price_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view price lists"   ON price_lists;
DROP POLICY IF EXISTS "Admins insert price lists" ON price_lists;
DROP POLICY IF EXISTS "Admins update price lists" ON price_lists;
DROP POLICY IF EXISTS "Owner deletes price lists" ON price_lists;

CREATE POLICY "Admins view price lists"   ON price_lists FOR SELECT USING (is_admin_user());
CREATE POLICY "Admins insert price lists" ON price_lists FOR INSERT WITH CHECK (is_admin_user());
CREATE POLICY "Admins update price lists" ON price_lists FOR UPDATE USING (is_admin_user());
CREATE POLICY "Owner deletes price lists" ON price_lists FOR DELETE USING (is_owner());

DROP POLICY IF EXISTS "Admins view price list items"   ON price_list_items;
DROP POLICY IF EXISTS "Admins insert price list items" ON price_list_items;
DROP POLICY IF EXISTS "Admins update price list items" ON price_list_items;
DROP POLICY IF EXISTS "Admins delete price list items" ON price_list_items;

CREATE POLICY "Admins view price list items"   ON price_list_items FOR SELECT USING (is_admin_user());
CREATE POLICY "Admins insert price list items" ON price_list_items FOR INSERT WITH CHECK (is_admin_user());
CREATE POLICY "Admins update price list items" ON price_list_items FOR UPDATE USING (is_admin_user());
CREATE POLICY "Admins delete price list items" ON price_list_items FOR DELETE USING (is_admin_user());
