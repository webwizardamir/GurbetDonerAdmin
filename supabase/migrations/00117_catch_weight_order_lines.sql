-- Catch-weight order lines: "35 stuks a 7 kg" priced per kg.
--
-- Gurbet sells doner spits, packs and trays that are COUNTED in pieces but
-- PRICED per kilo. Their sheet models one line as three factors:
--
--     stuk (kg) x aantal x eenheidprijs   ->   7 x 35 x EUR 4,70 = EUR 1.151,50
--
-- The app has always been two-factor (quantity x unit_price), so the only way to
-- enter that today is to type "245 kg" and lose the "35 stuks a 7 kg" that the
-- warehouse, the driver and the customer all actually count in.
--
-- DELIBERATE MODELLING CHOICE - `quantity` STAYS THE KILOS.
-- The two new columns are DESCRIPTIVE, never a second source of truth for money:
--   * order_items.quantity        = 245     (kg, unchanged meaning)
--   * order_items.unit_price      = 470     (cents per kg, unchanged meaning)
--   * order_items.piece_count     = 35      (how many pieces those kilos are)
--   * order_items.piece_weight_kg = 7.000   (kg per piece, snapshotted)
--
-- Everything that touches money therefore needs NO change: computeOrderTotals,
-- the stock triggers (which subtract NEW.quantity, i.e. kilos, exactly as
-- before), create_order_refund's server-side recompute from the immutable
-- snapshot, every analytics RPC, the 00109 net-revenue rules, the price
-- resolution chain and customer_prices (which keep holding the EUR/kg the
-- customer actually negotiated, not a derived per-piece figure).
--
-- The alternative - quantity = 35 pieces and unit_price = the derived per-piece
-- price - was rejected for exactly that reason: it would store a number nobody
-- typed and silently poison remembered customer prices and the price lists.
--
-- WHY THE WEIGHT LIVES ON THE LINE AND NOT ONLY ON THE PRODUCT.
-- A spit is not a fixed 7 kg; it is a RANGE, and it moves per delivery. So the
-- line carries its own weight, snapshotted immutably beside the sold price and
-- cost (same rule as unit_price / cost_cents: a re-print of last month's invoice
-- must show last month's weight). products.default_piece_weight_kg is only a
-- PREFILL for the order form.

-- -- order_items: the two descriptive columns --------------------------------
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS piece_count     NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS piece_weight_kg NUMERIC(10, 3);

COMMENT ON COLUMN order_items.piece_count IS
  'Catch-weight lines only: how many pieces the kilos in `quantity` represent. NULL = ordinary line.';
COMMENT ON COLUMN order_items.piece_weight_kg IS
  'Catch-weight lines only: kg per piece, snapshotted immutably at sale (the weight is a range and moves per delivery). NULL = ordinary line.';

-- Both or neither: a piece count with no weight cannot be reconciled against
-- `quantity`, and a weight with no count says nothing.
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_catch_weight_pair;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_catch_weight_pair
  CHECK ((piece_count IS NULL) = (piece_weight_kg IS NULL));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_catch_weight_positive;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_catch_weight_positive
  CHECK (piece_count IS NULL OR (piece_count > 0 AND piece_weight_kg > 0));

-- `quantity` is the kilo figure, so a catch-weight line is a kg line by
-- definition. Enforced here rather than only in the UI so the invariant survives
-- an import, a script or a future writer.
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_catch_weight_is_kg;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_catch_weight_is_kg
  CHECK (piece_count IS NULL OR unit_type = 'kg');

-- -- products: the prefill default -------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS default_piece_weight_kg NUMERIC(10, 3);

COMMENT ON COLUMN products.default_piece_weight_kg IS
  'Typical kg per piece, used ONLY to prefill a new order line. The line snapshots its own weight; changing this never touches history.';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_default_piece_weight_positive;
ALTER TABLE products
  ADD CONSTRAINT products_default_piece_weight_positive
  CHECK (default_piece_weight_kg IS NULL OR default_piece_weight_kg > 0);

-- -- Portal reads -------------------------------------------------------------
-- Portal customers have NO direct SELECT on order_items; they read through these
-- column-whitelisted SECURITY DEFINER RPCs, so a new column is invisible until
-- it is added to the whitelist. Bodies below are copied VERBATIM from the live
-- definitions (checked with pg_get_functiondef) with the two keys added and
-- nothing else changed.
--
-- SECURITY: recreating a SECURITY DEFINER function re-grants EXECUTE to PUBLIC
-- via Supabase default privileges, and REVOKE ... FROM PUBLIC alone does NOT
-- cover `anon`. Both are revoked explicitly below. (Same trap as 00092/00094.)

CREATE OR REPLACE FUNCTION get_portal_orders()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(json_agg(json_build_object(
    'id', o.id, 'order_number', o.order_number, 'customer_id', o.customer_id,
    'status', o.status::text, 'payment_method', o.payment_method::text,
    'subtotal', o.subtotal, 'discount', o.discount, 'tax', o.tax, 'delivery_fee', o.delivery_fee,
    'total', o.total, 'order_date', o.order_date, 'delivery_notes', o.delivery_notes,
    'created_at', o.created_at, 'updated_at', o.updated_at,
    'items', COALESCE((SELECT json_agg(json_build_object(
        'id', oi.id, 'product_name', oi.product_name, 'product_sku', oi.product_sku,
        'unit_type', oi.unit_type, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
        'piece_count', oi.piece_count, 'piece_weight_kg', oi.piece_weight_kg,
        'discount_amount', oi.discount_amount, 'tax_rate', oi.tax_rate, 'tax_amount', oi.tax_amount,
        'line_total_cents', oi.total, 'notes', oi.notes))
      FROM order_items oi WHERE oi.order_id = o.id), '[]'::json)
  ) ORDER BY o.created_at DESC), '[]'::json)
  FROM orders o
  WHERE o.customer_id = get_portal_customer_id()
    AND o.deleted_at IS NULL
    AND o.status <> 'draft';
$fn$;

CREATE OR REPLACE FUNCTION get_portal_order(p_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT json_build_object(
    'id', o.id, 'order_number', o.order_number, 'customer_id', o.customer_id,
    'status', o.status::text, 'payment_method', o.payment_method::text,
    'subtotal', o.subtotal, 'discount', o.discount, 'tax', o.tax, 'delivery_fee', o.delivery_fee,
    'total', o.total, 'order_date', o.order_date, 'delivery_notes', o.delivery_notes,
    'created_at', o.created_at, 'updated_at', o.updated_at,
    'items', COALESCE((SELECT json_agg(json_build_object(
        'id', oi.id, 'product_name', oi.product_name, 'product_sku', oi.product_sku,
        'unit_type', oi.unit_type, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
        'piece_count', oi.piece_count, 'piece_weight_kg', oi.piece_weight_kg,
        'discount_amount', oi.discount_amount, 'tax_rate', oi.tax_rate, 'tax_amount', oi.tax_amount,
        'line_total_cents', oi.total, 'notes', oi.notes))
      FROM order_items oi WHERE oi.order_id = o.id), '[]'::json),
    'documents', COALESCE((SELECT json_agg(json_build_object(
        'id', d.id, 'document_type', d.document_type::text, 'document_number', d.document_number,
        'snapshot', d.snapshot, 'generated_at', d.generated_at, 'created_at', d.generated_at)
      ORDER BY d.generated_at DESC)
      FROM documents d WHERE d.order_id = o.id), '[]'::json)
  )
  FROM orders o
  WHERE o.id = p_id
    AND o.customer_id = get_portal_customer_id()
    AND o.deleted_at IS NULL
    AND o.status <> 'draft';
$fn$;

REVOKE ALL ON FUNCTION get_portal_orders()    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_portal_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_portal_orders()    TO authenticated;
GRANT EXECUTE ON FUNCTION get_portal_order(uuid) TO authenticated;

DO $guard$
BEGIN
  IF has_function_privilege('anon', 'get_portal_orders()', 'EXECUTE')
     OR has_function_privilege('anon', 'get_portal_order(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon still holds EXECUTE on a get_portal_* function';
  END IF;
END
$guard$;
