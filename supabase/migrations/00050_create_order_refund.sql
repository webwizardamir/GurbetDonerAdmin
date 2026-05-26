-- ============================================================================
-- 00050: In-app order refunds (full + partial)
-- ============================================================================
-- Adds create_order_refund(...) so refunds can be issued from the app, not
-- only imported from WooCommerce. Mirrors the WC model already in the data:
--   * order_refunds       = one row per refund event (gross amount, incl. VAT)
--   * order_refund_items  = the refunded lines (ex-VAT subtotal + tax)
--   * orders.refund_amount = running SUM(order_refunds.amount)
--   * the parent order's status and totals are LEFT UNCHANGED
--
-- Why we DON'T set status = 'refunded':
--   The orders_status_change trigger (00017) restores the FULL stock of an
--   order the moment its status enters ('cancelled','refunded'). This RPC
--   already restores stock for exactly the refunded units, so flipping the
--   status would double-restore. "Fully refunded" is therefore derived from
--   refund_amount >= total, not from the status column. Keeping the status as
--   'completed' also keeps the order inside the analytics 'sold' set
--   (WHERE status NOT IN ('cancelled','refunded')), where the existing
--   "refunded" CTE subtracts the refunded portion — so net revenue/profit stay
--   correct for partial AND full refunds (no double counting).
--
-- Line amounts are recomputed server-side from the immutable order_items
-- snapshot (total / tax_amount, which already reflect any line discount). The
-- client only sends which order_item and how many units to refund, so it can
-- never dictate the refunded amount.
--
-- Both Owner and Shop Manager may refund (matches the role matrix), enforced
-- via is_admin_user(). Safe to re-run.
-- ============================================================================

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
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  -- Lock the order so two concurrent refunds can't both pass the cap check.
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

  -- Header first; amount is back-filled once the lines are summed.
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

    -- Units already refunded on this line (across prior refunds).
    SELECT COALESCE(SUM(ori.quantity), 0) INTO v_already
    FROM order_refund_items ori
    JOIN order_refunds r ON r.id = ori.refund_id
    WHERE r.order_id = p_order_id
      AND ori.order_item_id = v_order_item.id
      AND ori.refund_id <> v_refund_id;

    -- +0.0005 tolerance for DECIMAL(10,3) rounding noise.
    IF v_req_qty > (v_order_item.quantity - v_already) + 0.0005 THEN
      RAISE EXCEPTION 'refund quantity % exceeds remaining % for %',
        v_req_qty, (v_order_item.quantity - v_already), v_order_item.product_name;
    END IF;

    -- Refund proportionally from the line's recorded totals so any line
    -- discount and the original tax split are honoured exactly. order_items.total
    -- is incl. VAT, tax_amount is the VAT portion.
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

  -- Never let cumulative refunds exceed the order's gross total.
  v_remaining := v_order.total - COALESCE(v_order.refund_amount, 0);
  IF v_total_refund > v_remaining THEN
    RAISE EXCEPTION 'refund total % exceeds remaining order amount %',
      v_total_refund, v_remaining;
  END IF;

  UPDATE order_refunds SET amount = v_total_refund WHERE id = v_refund_id;
  UPDATE orders
  SET refund_amount = COALESCE(refund_amount, 0) + v_total_refund
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'refund_id',         v_refund_id,
    'total_refund',      v_total_refund,
    'new_refund_amount', COALESCE(v_order.refund_amount, 0) + v_total_refund,
    'fully_refunded',    (COALESCE(v_order.refund_amount, 0) + v_total_refund) >= v_order.total
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION create_order_refund(UUID, TEXT, DATE, BOOLEAN, JSONB) TO authenticated;
