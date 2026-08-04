-- 00111: collapse the legacy `pending` order status onto `pending_payment`
--
-- WHY
-- `pending` and `pending_payment` are the SAME state — both render "Wacht op
-- betaling" — and `pending` was the column DEFAULT, so every order created since
-- go-live landed on the legacy value while the UI only ever offered the canonical
-- one. On 2026-08-04 that was 245 vs 4 rows on Melek and 26 vs 2 on Gurbet.
--
-- The duplication leaked out of the data layer and into what the owner sees:
--   * Analytics' status filter matched the raw stored value, so isolating
--     "Wacht op betaling" reported 4 of 248 orders and EUR 1.384 of EUR 111.919.
--   * `get_orders_by_status` GROUPs BY the raw column, so the Overview pie drew
--     two identical "Wacht op betaling" slices.
--   * Every hand-written status->label / status->colour map that listed only the
--     canonical value rendered the raw English word "pending", uncoloured.
-- The app now expands (`expandStatusFilter`) and collapses (`canonicalStatus`)
-- around the alias, which keeps HISTORIC snapshots readable. This migration
-- removes the cause, so no NEW row can be written on the legacy value.
--
-- THE ENUM VALUE IS DELIBERATELY LEFT IN PLACE. Postgres cannot DROP an enum
-- label; it would mean recreating `order_status` and re-typing every dependent
-- column, function signature and policy — a large blast radius for an unused
-- label. `pending` simply becomes unreachable. Keep the app's STATUS_ALIAS /
-- expandStatusFilter / canonicalStatus machinery for the same reason: audit_logs
-- and documents.snapshot still carry the old string, and it costs nothing.

BEGIN;

-- 1. New orders land on the canonical value. This is the actual fix; the
--    backfill below only cleans up what the old default already wrote.
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending_payment'::order_status;

-- 2. Backfill, TRIGGER-SUPPRESSED. Same reasoning as 00099's activated_at
--    backfill, plus two more that are specific to touching `status`:
--      * orders_updated_at        BEFORE UPDATE FOR EACH ROW -> would stamp
--        updated_at = now() on every waiting order, destroying the real edit
--        history the Orders list shows and sorts on.
--      * audit_orders             -> ~271 junk rows across the two projects,
--        burying the genuine history. THIS FILE IS THE RECORD OF THE CHANGE.
--      * trg_orders_invoice_due_paid  BEFORE INSERT OR UPDATE -> its draft block
--        is skipped (OLD.status is not 'draft'), but it also recomputes
--        invoice_due_date when the row has none and force-NULLs invoice_paid_at
--        for any non-completed status. Both are no-ops on today's data (verified:
--        0 rows with a NULL due date or a non-NULL paid_at), which is exactly why
--        it must be disabled rather than trusted — a future re-run must not start
--        issuing due dates and thereby feeding the dunning cron.
--      * orders_status_change     AFTER UPDATE OF status -> moves STOCK. Neither
--        side of this transition is 'cancelled' so it is provably a no-op, but
--        stock is not something to leave to a proof about a bulk UPDATE.
--      * trg_clear_reminder_state_on_paid -> only fires on -> 'completed'.
ALTER TABLE public.orders DISABLE TRIGGER orders_updated_at;
ALTER TABLE public.orders DISABLE TRIGGER audit_orders;
ALTER TABLE public.orders DISABLE TRIGGER trg_orders_invoice_due_paid;
ALTER TABLE public.orders DISABLE TRIGGER orders_status_change;
ALTER TABLE public.orders DISABLE TRIGGER trg_clear_reminder_state_on_paid;

UPDATE public.orders SET status = 'pending_payment' WHERE status = 'pending';

-- Trashed orders remember what to restore TO. Missing this would write the
-- legacy value straight back the moment someone emptied nothing and restored an
-- order from the Prullenbak (1 such row on Gurbet, 0 on Melek).
UPDATE public.orders SET pre_trash_status = 'pending_payment' WHERE pre_trash_status = 'pending';

ALTER TABLE public.orders ENABLE TRIGGER orders_updated_at;
ALTER TABLE public.orders ENABLE TRIGGER audit_orders;
ALTER TABLE public.orders ENABLE TRIGGER trg_orders_invoice_due_paid;
ALTER TABLE public.orders ENABLE TRIGGER orders_status_change;
ALTER TABLE public.orders ENABLE TRIGGER trg_clear_reminder_state_on_paid;

-- 3. Assert. A silent partial backfill on a status column is not acceptable —
--    it would leave the exact split this migration exists to remove.
DO $$
DECLARE v_left int; v_default text;
BEGIN
  SELECT count(*) INTO v_left FROM public.orders
   WHERE status = 'pending' OR pre_trash_status = 'pending';
  IF v_left <> 0 THEN
    RAISE EXCEPTION '00111: % order row(s) still on the legacy pending status', v_left;
  END IF;

  SELECT column_default INTO v_default FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status';
  IF v_default IS DISTINCT FROM '''pending_payment''::order_status' THEN
    RAISE EXCEPTION '00111: orders.status default is %, expected pending_payment', v_default;
  END IF;
END $$;

COMMIT;
