-- ============================================================================
-- 00076: Let Shop Managers trash orders + allow trashing cancelled orders
-- ============================================================================
-- Two client-requested changes:
--
-- (1) Shop Managers may trash (soft-delete) orders. The DB side already allowed
--     it (trash_order is SECURITY DEFINER guarded by is_admin_user(), which
--     includes shop_manager); only the UI permission row blocked it. Flip
--     ('shop_manager','orders','delete') to allowed = true.
--
-- (2) Cancelled orders become trashable. Previously trash_order only accepted
--     draft/pending/pending_payment/on_hold. A cancelled order already has its
--     stock restored, so trashing it must NOT touch stock again — and because
--     trashing sets status = 'cancelled' (a no-op on an already-cancelled row)
--     the status trigger never fires, so stock is untouched. pre_trash_status is
--     stored as 'cancelled' so restore leaves it cancelled (no re-deduct).
--
--     purge_order / empty_order_trash must be fixed for this case: they set
--     status back to COALESCE(pre_trash_status,'draft') to re-deduct stock
--     before the hard DELETE (whose cascade order_items-delete trigger always
--     restores). For a cancelled order that COALESCE resolves to 'cancelled',
--     leaving the order in 'cancelled' → the delete-restore would OVER-restore.
--     Fix: force a non-cancelled transient status ('draft') before delete so the
--     re-deduct always offsets the cascade restore. The row is deleted
--     immediately, so the transient status value is irrelevant beyond firing the
--     trigger.
--
-- Safe to re-run.
-- ============================================================================

-- (1) Shop Manager can trash orders -------------------------------------------
UPDATE permissions
SET allowed = true
WHERE role = 'shop_manager' AND resource = 'orders' AND action = 'delete';

-- (2a) trash_order also accepts 'cancelled' -----------------------------------
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
  IF v_status NOT IN ('draft','pending','pending_payment','on_hold','cancelled') THEN
    RAISE EXCEPTION 'Only draft / pending / on-hold / cancelled orders can be trashed';
  END IF;

  -- status -> cancelled fires handle_order_status_change (restores stock). For an
  -- already-cancelled order this is a no-op (OLD = NEW = 'cancelled'), so stock
  -- is left untouched (it was already restored when the order was cancelled).
  UPDATE orders
  SET pre_trash_status = v_status,
      status = 'cancelled',
      deleted_at = now()
  WHERE id = p_id;
END;
$$;

-- (2b) purge_order re-deducts via a guaranteed non-cancelled transient status --
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

  -- The trashed order is currently 'cancelled' (stock restored). Re-deduct by
  -- leaving 'cancelled' via a NON-cancelled status, then hard delete (cascade
  -- order_items-delete restores) -> net zero. If pre_trash was itself
  -- 'cancelled', substitute 'draft' so the re-deduct actually fires.
  UPDATE orders
  SET status = CASE WHEN COALESCE(v_pre, 'draft') = 'cancelled' THEN 'draft'::order_status
                    ELSE COALESCE(v_pre, 'draft') END
  WHERE id = p_id;
  DELETE FROM orders WHERE id = p_id;
END;
$$;

-- (2c) empty_order_trash: same fix, per row -----------------------------------
CREATE OR REPLACE FUNCTION public.empty_order_trash()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r record; n int := 0;
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  FOR r IN SELECT id, pre_trash_status FROM orders WHERE deleted_at IS NOT NULL FOR UPDATE LOOP
    UPDATE orders
    SET status = CASE WHEN COALESCE(r.pre_trash_status, 'draft') = 'cancelled' THEN 'draft'::order_status
                      ELSE COALESCE(r.pre_trash_status, 'draft') END
    WHERE id = r.id;
    DELETE FROM orders WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
