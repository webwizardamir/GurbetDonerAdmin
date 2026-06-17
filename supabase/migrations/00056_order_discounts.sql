-- 00056_order_discounts.sql
-- Structured discount inputs for order line items and the order total.
--
-- The app already stores RESOLVED cents in `order_items.discount_amount` and
-- `orders.discount`; those remain the SINGLE SOURCE OF TRUTH for every total,
-- the invoice/credit-note PDFs, and (critically) the refund RPC. The columns
-- added here only ECHO the user's input so add/edit round-trips: a 10% line
-- discount reopens as "10%" instead of a frozen cents value. NOTHING reads them
-- for math.
--
--   discount_type = 'percentage' -> discount_value is BASIS POINTS (10% = 1000,
--                                   12.5% = 1250). Keeps the column integer and
--                                   round-trips exactly.
--   discount_type = 'fixed'      -> discount_value is CENTS.
--
-- REFUND-SAFETY INVARIANT (do not break): per-line `order_items.total` and
-- `tax_amount` MUST stay fully net of BOTH the line discount and the line's
-- proportional share of the order-level discount. `create_order_refund`
-- recomputes refunds purely from those two columns and is blind to
-- `orders.discount`; storing the order discount only on the header would
-- over-refund. The service distributes the order discount into the lines.
--
-- All statements are idempotent so this can be pasted into Supabase Studio
-- safely. New nullable columns inherit the existing table RLS; no trigger or
-- policy change is needed.

-- =====================================================
-- order_items: per-line discount echo
-- =====================================================
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS discount_type  text,
  ADD COLUMN IF NOT EXISTS discount_value integer;

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_discount_type_chk;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_discount_type_chk
    CHECK (discount_type IS NULL OR discount_type IN ('percentage', 'fixed'));

-- =====================================================
-- orders: order-level discount echo
-- =====================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_type  text,
  ADD COLUMN IF NOT EXISTS discount_value integer;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_discount_type_chk;
ALTER TABLE orders
  ADD CONSTRAINT orders_discount_type_chk
    CHECK (discount_type IS NULL OR discount_type IN ('percentage', 'fixed'));
