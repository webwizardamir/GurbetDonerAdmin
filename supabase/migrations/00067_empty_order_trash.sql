-- "Empty trash": permanently delete ALL trashed orders in one call.
-- Mirrors purge_order per row: set status back to pre_trash (re-deduct via the
-- status trigger) then DELETE (cascade order_items-delete trigger restores) so
-- net stock stays correct with no double-restore. Returns the number purged.

CREATE OR REPLACE FUNCTION public.empty_order_trash()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r record; n int := 0;
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  FOR r IN SELECT id, pre_trash_status FROM orders WHERE deleted_at IS NOT NULL FOR UPDATE LOOP
    UPDATE orders SET status = COALESCE(r.pre_trash_status, 'draft') WHERE id = r.id;
    DELETE FROM orders WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.empty_order_trash() FROM public;
GRANT EXECUTE ON FUNCTION public.empty_order_trash() TO authenticated;
