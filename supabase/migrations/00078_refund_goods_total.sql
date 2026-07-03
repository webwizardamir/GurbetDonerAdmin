-- ============================================================================
-- 00078: Refund full-refund test must use the GOODS total, not orders.total
-- ============================================================================
-- The per-order shipping fee (orders.delivery_fee) is now folded into
-- orders.total. Refunds only ever cover goods lines (order_items), so the
-- cumulative refund amount tops out at the goods total. The refund RPC's
-- "fully refunded" test compared against orders.total, which — once shipping is
-- present — is strictly larger than the goods total, so an order with a shipping
-- fee could NEVER flip to 'refunded' even after every line was refunded (it got
-- stuck as a permanent partial refund, and analytics kept counting it as sold).
--
-- Fix: compare both the over-refund guard and the full-refund flag against the
-- GOODS total = SUM(order_items.total). For orders WITHOUT a shipping fee this
-- equals orders.total exactly (total = subtotal - discount + tax = Σ line totals),
-- so behaviour is unchanged for every existing order.
--
-- Only the two comparisons changed vs migration 00051; the rest is identical.
-- Safe to re-run.
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
  v_goods_total  INTEGER;
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

  -- Goods total (what refunds can ever cover). Equals orders.total when there is
  -- no shipping fee, so existing orders are unaffected.
  SELECT COALESCE(SUM(total), 0) INTO v_goods_total
  FROM order_items WHERE order_id = p_order_id;

  v_remaining := v_goods_total - COALESCE(v_order.refund_amount, 0);
  IF v_total_refund > v_remaining THEN
    RAISE EXCEPTION 'refund total % exceeds remaining order amount %',
      v_total_refund, v_remaining;
  END IF;

  UPDATE order_refunds SET amount = v_total_refund WHERE id = v_refund_id;

  v_new_amount := COALESCE(v_order.refund_amount, 0) + v_total_refund;
  v_fully := v_new_amount >= v_goods_total;

  -- Flip to 'refunded' only when the whole order's goods are covered. The status
  -- trigger deliberately ignores the 'refunded' transition for stock.
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
