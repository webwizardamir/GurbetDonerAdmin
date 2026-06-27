-- ============================================================================
-- 00068: Per-price-list cost of goods (COG) override
-- ============================================================================
-- Lets the owner record a *cheaper buy cost* on a price list (per product, per
-- unit type) for bulk deals where the source price beats the product default.
--
--   - price_list_items.cost_cents — NULL = follow the product default cost
--     (product_unit_prices.cost_cents → products.cost_cents). A value overrides it.
--
-- The override flows into orders via OrderForm's cost resolver, which snapshots
-- order_items.cost_cents at create time — so every analytics RPC (which reads
-- that immutable snapshot) reflects the negotiated cost with no SQL changes.
--
-- price_cents becomes nullable so a row can carry a cost override on its own
-- (price then falls back to the product default), keeping price and cost fully
-- independent per unit. A row must still set at least one of the two.
--
-- Safe to re-run (idempotent).
-- ============================================================================

-- 1. New cost override column (NULL = inherit product default).
ALTER TABLE price_list_items
  ADD COLUMN IF NOT EXISTS cost_cents INTEGER
    CHECK (cost_cents IS NULL OR cost_cents >= 0);

COMMENT ON COLUMN price_list_items.cost_cents IS
  'Cost of goods in cents for this (list, product, unit). NULL = inherit product default (product_unit_prices.cost_cents → products.cost_cents). Owner-only.';

-- 2. Allow a cost-only row: price may now be NULL (= inherit default price).
--    The existing CHECK (price_cents >= 0) already passes for NULL once the
--    column is nullable, so no constraint rewrite is needed for it.
ALTER TABLE price_list_items
  ALTER COLUMN price_cents DROP NOT NULL;

-- 3. A row must override at least one of price / cost (never fully empty).
ALTER TABLE price_list_items
  DROP CONSTRAINT IF EXISTS price_list_items_price_or_cost_present;
ALTER TABLE price_list_items
  ADD CONSTRAINT price_list_items_price_or_cost_present
    CHECK (price_cents IS NOT NULL OR cost_cents IS NOT NULL);
