-- Order Trash (soft delete), WooCommerce-style, with stock restored on trash.
--
-- Design: trashing sets status='cancelled' (the existing handle_order_status_change
-- trigger restores stock) plus a deleted_at marker and remembers the original
-- status in pre_trash_status. Because every analytics RPC already excludes
-- 'cancelled', trashed orders drop out of analytics with no RPC changes. The
-- normal order list filters deleted_at IS NULL (genuine cancelled orders still
-- show); the Trash view filters deleted_at IS NOT NULL and displays
-- pre_trash_status as the real status.
--
-- Restore reverses it (leaving 'cancelled' re-deducts stock via the same trigger).
-- Purge re-deducts then hard-deletes (cascade order_items delete trigger restores)
-- so net stock stays correct with no double-restore.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pre_trash_status order_status;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders (deleted_at);

-- Only these statuses may be trashed (mirrors the UI delete restriction).
-- ('pending' is not in the enum; the deletable set is draft/pending_payment/on_hold.)

CREATE OR REPLACE FUNCTION public.trash_order(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_status order_status;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO v_status FROM orders WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order not found or already trashed';
  END IF;
  IF v_status NOT IN ('draft','pending_payment','on_hold') THEN
    RAISE EXCEPTION 'Only draft / pending / on-hold orders can be trashed';
  END IF;

  -- status -> cancelled fires handle_order_status_change (restores stock)
  UPDATE orders
  SET pre_trash_status = v_status,
      status = 'cancelled',
      deleted_at = now()
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_order(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_pre order_status;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT pre_trash_status INTO v_pre FROM orders WHERE id = p_id AND deleted_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found in trash';
  END IF;

  -- leaving cancelled fires handle_order_status_change (re-deducts stock)
  UPDATE orders
  SET status = COALESCE(v_pre, 'draft'),
      pre_trash_status = NULL,
      deleted_at = NULL
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_order(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_pre order_status;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT pre_trash_status INTO v_pre FROM orders WHERE id = p_id AND deleted_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found in trash';
  END IF;

  -- Stock is currently restored (order is 'cancelled'). Re-deduct by leaving
  -- cancelled, then hard delete (cascade order_items delete restores) -> net zero,
  -- so the row disappears with stock left in the restored state. No double count.
  UPDATE orders SET status = COALESCE(v_pre, 'draft') WHERE id = p_id;
  DELETE FROM orders WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.trash_order(uuid) FROM public;
REVOKE ALL ON FUNCTION public.restore_order(uuid) FROM public;
REVOKE ALL ON FUNCTION public.purge_order(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.trash_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_order(uuid) TO authenticated;
