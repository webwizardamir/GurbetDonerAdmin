-- ============================================================================
-- 00098  Finalising a draft moves its order_date to the day it went live
-- ============================================================================
--
-- A Concept (draft) order is a scratchpad: the owner opens one, adds products
-- over days or weeks, then flips it to a live status. Until now `order_date`
-- kept whatever it was on the day the draft was STARTED, because none of the
-- three finalisation paths touches it:
--   1. OrderDetail status picker  -> updateOrderStatus (writes `status` only)
--   2. Orders list bulk complete  -> bulkUpdateOrderStatus (same)
--   3. OrderForm "Concept" untick -> updateOrderWithItems (re-sends the field)
-- The order then behaves as if it had been placed weeks ago: it lands in the
-- wrong day's route and day-close, books revenue into a past (already-reported)
-- period, and — worst — falls outside the 24h invoice auto-send window, whose
-- `order_date >= 3 days ago` floor means the invoice email is never sent at all.
--
-- WHY THIS LIVES INSIDE set_invoice_due_and_paid RATHER THAN ITS OWN TRIGGER:
-- that function recomputes `invoice_due_date` whenever order_date changes, and
-- BEFORE triggers on one table fire in ALPHABETICAL NAME ORDER. A separate
-- trigger would therefore depend on an invisible naming coincidence to run
-- first, and getting it wrong fails silently in an expensive direction: the due
-- date would stay anchored to the old draft date, so the invoice ships already
-- overdue and the dunning cron mails the customer a payment reminder on day
-- one. Doing the bump at the top of this same function makes the ordering
-- explicit and unbreakable — the due-date block below then sees
-- order_date <> OLD.order_date and recomputes off the new date.
--
-- Applied 2026-07-27 to pnimvwconhhmcwxcuxcz (Melek) and dvpnvulxkccurqkpqqnx
-- (Gurbet). The two live copies differed only in comments; this is the merge.
CREATE OR REPLACE FUNCTION public.set_invoice_due_and_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_global_days  INTEGER;
  v_cust_days    INTEGER;
  v_eff_days     INTEGER;
  v_base_date    DATE;
  v_today        DATE := (now() AT TIME ZONE 'Europe/Amsterdam')::date;
BEGIN
  -- Draft going live: re-stamp order_date to today. MUST come before the
  -- due-date block below, which keys off order_date having changed.
  --
  -- Two guards keep this from destroying a date the user actually meant:
  --
  --  * `NEW.order_date IS NOT DISTINCT FROM OLD.order_date` — only re-stamp when
  --    the caller did not set the date in this same statement. The status-only
  --    paths (detail picker, bulk complete) send no date and are re-stamped; the
  --    order form always re-sends the field, so if the user typed a date while
  --    unticking Concept that value is respected verbatim.
  --
  --  * `< today` — a date in the FUTURE is a planned delivery, deliberately set
  --    (the app supports future-dated orders and the Orders list sorts by this
  --    column). Never pull one backwards to today.
  --
  -- draft -> cancelled/refunded is not "going live", so it is excluded.
  IF TG_OP = 'UPDATE'
     AND OLD.status::text = 'draft'
     AND NEW.status::text NOT IN ('draft', 'cancelled', 'refunded')
     AND NEW.order_date IS NOT DISTINCT FROM OLD.order_date
     AND NEW.order_date < v_today
  THEN
    NEW.order_date := v_today;
  END IF;

  -- Recompute due date on insert, or when order_date changes, or when it is
  -- still NULL (backfill / first invoice). Customer-term changes are NOT
  -- retro-applied here on purpose (invoice terms are a snapshot at sale).
  IF TG_OP = 'INSERT'
     OR NEW.invoice_due_date IS NULL
     OR NEW.order_date IS DISTINCT FROM OLD.order_date THEN

    SELECT COALESCE(payment_terms_days, 14) INTO v_global_days
    FROM public.document_settings
    LIMIT 1;
    v_global_days := COALESCE(v_global_days, 14);

    SELECT payment_due_days INTO v_cust_days
    FROM public.customers WHERE id = NEW.customer_id;

    v_eff_days  := COALESCE(v_cust_days, v_global_days);
    v_base_date := COALESCE(NEW.order_date, NEW.created_at::date, CURRENT_DATE);
    NEW.invoice_due_date := v_base_date + (v_eff_days || ' days')::interval;
  END IF;

  -- Paid stamp follows the 'completed' status (idempotent).
  IF NEW.status = 'completed' THEN
    IF NEW.invoice_paid_at IS NULL THEN
      NEW.invoice_paid_at := NOW();
    END IF;
  ELSE
    NEW.invoice_paid_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;
