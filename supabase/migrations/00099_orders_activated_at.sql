-- ============================================================================
-- 00099  A finalised draft sorts to the TOP of its day, not the bottom
-- ============================================================================
--
-- 00098 re-stamps `order_date` to today when a Concept goes live, which puts the
-- order in the right day's group. It still arrived invisible, because the Orders
-- list sorts `order_date DESC, created_at DESC` and a draft's `created_at` is the
-- day the scratchpad was OPENED. Order 10767 (slagerij Atas) was started 20-07 and
-- finalised 27-07: correct date group, then dead last of 25 orders behind everything
-- entered that morning — the one place nobody scrolls to.
--
-- `created_at` cannot answer "when did this order enter the workflow", because for a
-- draft those are two different moments, and it must keep answering "when was the row
-- written" (it is audit data and a visible column). So this adds a second timestamp
-- for the second question:
--
--   activated_at = the moment the order became a live, actionable order.
--
-- For every normal order that is created_at and never moves. Only a draft going live
-- re-stamps it, so switching the list tiebreaker from created_at to activated_at
-- reorders nothing except the case it is meant to fix. Because it is set to now(),
-- a genuinely newer order outranks it immediately — it floats to the top and stays
-- there only until real newer work arrives.
--
-- Applied 2026-07-27 to pnimvwconhhmcwxcuxcz (Melek) and dvpnvulxkccurqkpqqnx (Gurbet).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Backfill: for existing rows the two questions have the same answer. Drafts that
-- were finalised BEFORE this migration are deliberately not guessed at (updated_at
-- is any edit, not the finalisation) — they keep their creation position.
--
-- TRIGGER-SUPPRESSED, and both are load-bearing: `orders_updated_at` is BEFORE UPDATE
-- FOR EACH ROW, so a bare backfill would stamp updated_at = now() on every order in
-- the system and destroy the real edit history; `audit_orders` would write ~6k junk
-- rows into the audit log. The status triggers are AFTER UPDATE **OF status** and
-- cannot fire here. trg_orders_invoice_due_paid would no-op but is skipped for speed.
ALTER TABLE public.orders DISABLE TRIGGER orders_updated_at;
ALTER TABLE public.orders DISABLE TRIGGER audit_orders;
ALTER TABLE public.orders DISABLE TRIGGER trg_orders_invoice_due_paid;

UPDATE public.orders SET activated_at = created_at WHERE activated_at IS NULL;

ALTER TABLE public.orders ENABLE TRIGGER orders_updated_at;
ALTER TABLE public.orders ENABLE TRIGGER audit_orders;
ALTER TABLE public.orders ENABLE TRIGGER trg_orders_invoice_due_paid;

ALTER TABLE public.orders
  ALTER COLUMN activated_at SET DEFAULT now(),
  ALTER COLUMN activated_at SET NOT NULL;

COMMENT ON COLUMN public.orders.activated_at IS
  'When the order became live/actionable. = created_at, except a draft finalised later. Orders-list sort tiebreaker (see 00099).';

-- Supports the default list sort: order_date DESC, activated_at DESC.
CREATE INDEX IF NOT EXISTS idx_orders_list_sort
  ON public.orders (order_date DESC, activated_at DESC);

-- ---------------------------------------------------------------------------
-- Trigger: stamp activated_at on the same draft-goes-live transition as 00098.
--
-- The transition test is now split from the order_date guards. 00098 only re-stamps
-- the date when it is in the PAST and the caller did not set it — correct for a date,
-- wrong for this: a draft opened at 08:00 and finalised at 17:00 the same day already
-- has order_date = today, so it would skip the block entirely and still sort below
-- everything entered in between. activated_at is stamped on EVERY finalisation; the
-- two date guards stay exactly where they were, nested inside.
-- ---------------------------------------------------------------------------
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
  -- Draft going live. MUST come before the due-date block below, which keys off
  -- order_date having changed. draft -> cancelled/refunded is not "going live".
  IF TG_OP = 'UPDATE'
     AND OLD.status::text = 'draft'
     AND NEW.status::text NOT IN ('draft', 'cancelled', 'refunded')
  THEN
    -- The order enters the live list now, regardless of what its date says.
    NEW.activated_at := now();

    -- Re-stamp order_date to today (00098). Two guards keep this from destroying
    -- a date the user actually meant:
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
    IF NEW.order_date IS NOT DISTINCT FROM OLD.order_date
       AND NEW.order_date < v_today
    THEN
      NEW.order_date := v_today;
    END IF;
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
