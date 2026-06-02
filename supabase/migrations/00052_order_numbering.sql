-- =====================================================
-- 00052 — Plain, configurable order numbering
-- =====================================================
-- Switches new order numbers from "ORD-YYYY-NNNNN" to plain incrementing
-- integers (WooCommerce-style: 7000, 7001, ...), driven by a counter the
-- owner can set in Settings. Existing ORD-... orders are left untouched
-- (order_number is TEXT UNIQUE, so plain numbers never collide with them).
--
-- The order-creation flow is unchanged: the app still calls
-- generate_order_number() and inserts whatever it returns. Only the function
-- body changes — it now atomically claims and advances a counter stored on
-- the single document_settings row.

-- 1. Counter column (pure number — no prefix, no padding). The ALTER backfills
--    the existing single settings row to 1; the owner sets the real starting
--    value (e.g. 7000) in Settings -> Documents -> Numbering.
ALTER TABLE document_settings
  ADD COLUMN IF NOT EXISTS order_next_number INTEGER NOT NULL DEFAULT 1;

-- 2. Replace the generator with an atomic, counter-based version.
--    SECURITY DEFINER so the counter advances for any order-creating user
--    (owner AND shop_manager), guarded by is_admin_user(). The row-level lock
--    taken by UPDATE serialises concurrent order creation, so two orders can
--    never receive the same number (fixes the old MAX()+1 race).
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claimed INTEGER;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Niet geautoriseerd om een bestelnummer te genereren';
  END IF;

  -- Claim the current value and advance the counter in one statement.
  UPDATE document_settings
  SET order_next_number = order_next_number + 1,
      updated_at = now()
  WHERE id = (SELECT id FROM document_settings ORDER BY created_at LIMIT 1)
  RETURNING order_next_number - 1 INTO v_claimed;

  -- No settings row yet (fresh DB) — seed one and start at 1.
  IF v_claimed IS NULL THEN
    INSERT INTO document_settings (id, order_next_number)
    VALUES (gen_random_uuid(), 2);
    v_claimed := 1;
  END IF;

  RETURN v_claimed::TEXT;   -- e.g. "7000"
END;
$$;
