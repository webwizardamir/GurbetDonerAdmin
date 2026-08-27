-- 00118 — payment_method follows the paid stamp: clear it when an order leaves
--         'completed'.
--
-- SYMPTOM
-- Complete an order and pick "Bank", then set the status back to "Wacht op
-- betaling". The status changed, but the blue Bank badge stayed next to it, on
-- the detail panel and in the Orders list: an unpaid order wearing a payment
-- method. Same for completed -> Concept / In afwachting / Geannuleerd, from the
-- status picker in OrderDetail and from the Concept tick in OrderForm alike.
--
-- CAUSE
-- `payment_method` had exactly one clearing rule: none. The -> completed
-- transition wrote it and nothing ever unwrote it, while THIS SAME TRIGGER has
-- always nulled `invoice_paid_at` the moment the status is anything other than
-- 'completed'. So the two columns disagreed: the order was not paid, but it
-- still recorded how it had been paid. That is not only a stale badge --
-- `get_revenue_by_payment_method` filters on `payment_method IS NOT NULL` and
-- includes `pending_payment`, so an unpaid order was reported as cash or bank
-- revenue.
--
-- FIX
-- Clear `payment_method` on the transition out of 'completed', in the same
-- BEFORE trigger that owns `invoice_paid_at`, so every write path is covered at
-- once: the detail status picker, the order form's Concept tick, a service-role
-- or SQL edit, and anything added later.
--
-- Two guards, both load-bearing:
--
--  * `NEW.payment_method IS NOT DISTINCT FROM OLD.payment_method` -- only clear
--    when the caller did not set a method in this same statement. Mirrors the
--    order_date guard above it: an explicit value always wins over the default.
--
--  * `NEW.status <> 'refunded'` -- a refunded order KEEPS the method it was paid
--    with. The money was really received and has to travel back the same way, so
--    that is the one status where the value is still operational rather than
--    stale. Refunded is terminal (the picker renders a plain badge for it), so
--    the value can never become editable-and-wrong again. A PARTIAL refund keeps
--    the order 'completed' and never reaches this branch at all.
--
-- Cancelling a completed order DOES clear it -- "this order never happened" is
-- not a refund, and the audit log keeps the old value either way.

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

    -- Re-stamp order_date to today (00098). Guards: only when the caller did not
    -- set the date in this statement, and never pull a FUTURE date backwards.
    IF NEW.order_date IS NOT DISTINCT FROM OLD.order_date
       AND NEW.order_date < v_today
    THEN
      NEW.order_date := v_today;
    END IF;
  END IF;

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

  IF NEW.status = 'completed' THEN
    IF NEW.invoice_paid_at IS NULL THEN
      NEW.invoice_paid_at := NOW();
    END IF;
  ELSE
    NEW.invoice_paid_at := NULL;
  END IF;

  -- 00118: the payment method follows the paid stamp above. See the header for
  -- why 'refunded' is the exception and why the IS NOT DISTINCT FROM guard is
  -- not optional.
  IF TG_OP = 'UPDATE'
     AND OLD.status::text = 'completed'
     AND NEW.status::text NOT IN ('completed', 'refunded')
     AND NEW.payment_method IS NOT DISTINCT FROM OLD.payment_method
  THEN
    NEW.payment_method := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Backfill the rows the bug already produced.
--
-- Only unpaid statuses are touched: 'completed' keeps its method (that is what
-- it means) and 'refunded' keeps it for the reason above. Triggers are
-- suppressed for the duration -- orders_updated_at / update_orders_updated_at
-- would stamp updated_at = now() and destroy the edit history, and audit_orders
-- would log a change nobody made.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders DISABLE TRIGGER USER;

UPDATE public.orders
SET payment_method = NULL
WHERE payment_method IS NOT NULL
  AND status::text NOT IN ('completed', 'refunded');

ALTER TABLE public.orders ENABLE TRIGGER USER;
