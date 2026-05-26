-- ============================================================================
-- 00051: Mark fully-refunded orders as 'refunded' + make stock refund-safe
-- ============================================================================
-- Follow-up to 00050. Two changes:
--
-- (1) create_order_refund now sets status = 'refunded' once the cumulative
--     refund covers the whole order. This makes the Orders list and status
--     filters reflect the refund (matching how the WooCommerce import already
--     marks fully-refunded orders). Partial refunds keep their status.
--
-- (2) handle_order_status_change no longer restores/re-deducts stock for the
--     'refunded' transition — refunds now manage their own stock per unit in
--     create_order_refund, so reacting to the status flip too would
--     double-restore. The 'cancelled' path is kept, but it now restores only
--     the units that have NOT already been returned via a refund (otherwise an
--     order that was partially refunded and then cancelled would over-restore).
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- (2) Stock trigger: cancel restores only the not-yet-refunded units; the
--     'refunded' status no longer drives stock at all.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Entering 'cancelled': put back the units still on the order (total minus
  -- anything already refunded — refunds restored their own stock already).
  IF NEW.status::text = 'cancelled' AND COALESCE(OLD.status::text, '') <> 'cancelled' THEN
    UPDATE products p
    SET stock_quantity = p.stock_quantity + (oi.quantity - COALESCE(ref.qty, 0))
    FROM order_items oi
    LEFT JOIN (
      SELECT ori.order_item_id, SUM(ori.quantity) AS qty
      FROM order_refund_items ori
      JOIN order_refunds r ON r.id = ori.refund_id
      WHERE r.order_id = NEW.id
      GROUP BY ori.order_item_id
    ) ref ON ref.order_item_id = oi.id
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND p.track_stock = true;
  END IF;

  -- Leaving 'cancelled': re-deduct the same (not-yet-refunded) units.
  IF COALESCE(OLD.status::text, '') = 'cancelled' AND NEW.status::text <> 'cancelled' THEN
    UPDATE products p
    SET stock_quantity = p.stock_quantity - (oi.quantity - COALESCE(ref.qty, 0))
    FROM order_items oi
    LEFT JOIN (
      SELECT ori.order_item_id, SUM(ori.quantity) AS qty
      FROM order_refund_items ori
      JOIN order_refunds r ON r.id = ori.refund_id
      WHERE r.order_id = NEW.id
      GROUP BY ori.order_item_id
    ) ref ON ref.order_item_id = oi.id
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND p.track_stock = true;
  END IF;

  -- NOTE: 'refunded' is intentionally NOT handled here. create_order_refund
  -- restores stock per refunded unit and only then flips status to 'refunded',
  -- so reacting to that flip would double-restore.

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- (1) Refund RPC: same as 00050, but flips status to 'refunded' when the order
--     becomes fully refunded.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_order_refund(
  p_order_id      UUID,
  p_reason        TEXT,
  p_refund_date   DATE,
  p_restore_stock BOOLEAN,
  p_items         JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_order        orders%ROWTYPE;
  v_item         JSONB;
  v_order_item   order_items%ROWTYPE;
  v_refund_id    UUID;
  v_req_qty      NUMERIC;
  v_already      NUMERIC;
  v_fraction     NUMERIC;
  v_line_sub     INTEGER;
  v_line_tax     INTEGER;
  v_total_sub    INTEGER := 0;
  v_total_tax    INTEGER := 0;
  v_total_refund INTEGER;
  v_remaining    INTEGER;
  v_lines        INTEGER := 0;
  v_new_amount   INTEGER;
  v_fully        BOOLEAN;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;
  IF v_order.status::text = 'cancelled' THEN
    RAISE EXCEPTION 'cannot refund a cancelled order';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'no refund items provided';
  END IF;

  INSERT INTO order_refunds (order_id, refund_date, amount, reason, created_by)
  VALUES (p_order_id, COALESCE(p_refund_date, CURRENT_DATE), 0,
          NULLIF(btrim(COALESCE(p_reason, '')), ''), auth.uid())
  RETURNING id INTO v_refund_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_req_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    CONTINUE WHEN v_req_qty <= 0;

    SELECT * INTO v_order_item
    FROM order_items
    WHERE id = (v_item->>'order_item_id')::uuid
      AND order_id = p_order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'order item % does not belong to order %',
        v_item->>'order_item_id', p_order_id;
    END IF;

    SELECT COALESCE(SUM(ori.quantity), 0) INTO v_already
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    WHERE r.order_id = p_order_id
      AND ori.order_item_id = v_order_item.id
      AND ori.refund_id <> v_refund_id;

    IF v_req_qty > (v_order_item.quantity - v_already) + 0.0005 THEN
      RAISE EXCEPTION 'refund quantity % exceeds remaining % for %',
        v_req_qty, (v_order_item.quantity - v_already), v_order_item.product_name;
    END IF;

    v_fraction := v_req_qty / NULLIF(v_order_item.quantity, 0);
    v_line_sub := ROUND((v_order_item.total - COALESCE(v_order_item.tax_amount, 0)) * v_fraction)::int;
    v_line_tax := ROUND(COALESCE(v_order_item.tax_amount, 0) * v_fraction)::int;

    v_total_sub := v_total_sub + v_line_sub;
    v_total_tax := v_total_tax + v_line_tax;
    v_lines := v_lines + 1;

    INSERT INTO order_refund_items
      (refund_id, order_item_id, product_id, product_name, product_sku, quantity, amount, tax_amount)
    VALUES
      (v_refund_id, v_order_item.id, v_order_item.product_id, v_order_item.product_name,
       v_order_item.product_sku, v_req_qty, v_line_sub, v_line_tax);

    IF p_restore_stock THEN
      UPDATE products
      SET stock_quantity = stock_quantity + v_req_qty
      WHERE id = v_order_item.product_id
        AND track_stock = true;
    END IF;
  END LOOP;

  IF v_lines = 0 THEN
    RAISE EXCEPTION 'no refund items with a positive quantity';
  END IF;

  v_total_refund := v_total_sub + v_total_tax;

  v_remaining := v_order.total - COALESCE(v_order.refund_amount, 0);
  IF v_total_refund > v_remaining THEN
    RAISE EXCEPTION 'refund total % exceeds remaining order amount %',
      v_total_refund, v_remaining;
  END IF;

  UPDATE order_refunds SET amount = v_total_refund WHERE id = v_refund_id;

  v_new_amount := COALESCE(v_order.refund_amount, 0) + v_total_refund;
  v_fully := v_new_amount >= v_order.total;

  -- Flip to 'refunded' only when the whole order is covered. The status trigger
  -- (above) deliberately ignores the 'refunded' transition for stock.
  IF v_fully THEN
    UPDATE orders SET refund_amount = v_new_amount, status = 'refunded' WHERE id = p_order_id;
  ELSE
    UPDATE orders SET refund_amount = v_new_amount WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'refund_id',         v_refund_id,
    'total_refund',      v_total_refund,
    'new_refund_amount', v_new_amount,
    'fully_refunded',    v_fully
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION create_order_refund(UUID, TEXT, DATE, BOOLEAN, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- One-time backfill: any order that is already fully refunded by amount but
-- still carries a non-refunded status (e.g. refunds issued under the 00050
-- version, which didn't flip status) is marked 'refunded' — consistent with
-- the WooCommerce import convention. Stock-safe: the trigger above ignores the
-- 'refunded' transition, and those units were already restored when refunded.
-- ---------------------------------------------------------------------------
UPDATE orders
SET status = 'refunded'
WHERE COALESCE(refund_amount, 0) >= total
  AND total > 0
  AND status::text NOT IN ('cancelled', 'refunded');
