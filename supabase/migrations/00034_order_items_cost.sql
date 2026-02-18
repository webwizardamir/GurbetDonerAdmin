-- Add cost_cents column to order_items for profit tracking
-- Cost is snapshotted at order creation time (like unit_price) to preserve historical accuracy
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_cents INTEGER DEFAULT 0;

-- Backfill existing order items with current product costs
-- Priority: product_unit_prices.cost_cents (matching unit_type) → products.cost_cents → 0
UPDATE order_items oi
SET cost_cents = COALESCE(
  (SELECT pup.cost_cents
   FROM product_unit_prices pup
   WHERE pup.product_id = oi.product_id
     AND pup.unit_type = oi.unit_type::unit_type
     AND pup.cost_cents IS NOT NULL
   LIMIT 1),
  (SELECT p.cost_cents
   FROM products p
   WHERE p.id = oi.product_id
     AND p.cost_cents IS NOT NULL
     AND p.cost_cents > 0
   LIMIT 1),
  0
)
WHERE oi.cost_cents = 0 OR oi.cost_cents IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN order_items.cost_cents IS 'Cost of goods per unit in cents, snapshotted at order creation time. Used for profit calculation.';
