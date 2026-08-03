-- 00110 — Two Gurbet-surfaced bugs, both fixed on BOTH databases.
--
-- Symptoms (Gurbet, 2026-08-03, while creating an order):
--   POST /rest/v1/orders            → 409  duplicate key "orders_order_number_key"
--   POST /rest/v1/rpc/get_overdue_invoices → 400  structure of query does not
--                                                match function result type
--
-- ---------------------------------------------------------------------------
-- 1. generate_order_number() — self-heal counter drift
-- ---------------------------------------------------------------------------
-- The old body blindly claimed document_settings.order_next_number. On Gurbet
-- that counter had drifted to 13 while orders 1..28 already existed, so every
-- new order collided on the unique index. Melek was merely lucky (10951 vs a
-- max of 10950) — the same drift is one out-of-band insert away there.
--
-- This is exactly the bug get_next_document_number_atomic (00079) fixed for
-- INVOICE numbers; order numbers never got the same treatment. Same shape:
-- next = GREATEST(stored_counter, max_used + 1) under a FOR UPDATE lock on the
-- document_settings singleton, so a drifted counter heals on the next call and
-- concurrent callers can never claim the same number.
--
-- The regex filter on order_number matters: the column is TEXT, so a future
-- non-numeric value (a prefixed import) must be skipped rather than crash the
-- cast. Verified 2026-08-03: 0 non-numeric rows on either database.

CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settings_id UUID;
  v_stored      INTEGER;
  v_max_used    INTEGER;
  v_next        INTEGER;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Niet geautoriseerd om een bestelnummer te genereren';
  END IF;

  -- Serialise concurrent callers on the settings singleton.
  SELECT id, order_next_number
    INTO v_settings_id, v_stored
  FROM document_settings
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  -- Highest number actually used, ignoring any non-numeric order_number.
  SELECT COALESCE(MAX(order_number::BIGINT), 0)::INTEGER
    INTO v_max_used
  FROM orders
  WHERE order_number ~ '^[0-9]+$';

  -- No settings row yet (fresh DB) — seed one, still respecting existing orders.
  IF v_settings_id IS NULL THEN
    v_next := v_max_used + 1;
    INSERT INTO document_settings (id, order_next_number)
    VALUES (gen_random_uuid(), v_next + 1);
    RETURN v_next::TEXT;
  END IF;

  -- Never hand out a number at or below one already on an order.
  v_next := GREATEST(COALESCE(v_stored, 1), v_max_used + 1);

  UPDATE document_settings
  SET order_next_number = v_next + 1,
      updated_at = now()
  WHERE id = v_settings_id;

  RETURN v_next::TEXT;   -- e.g. "7000"
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. get_overdue_invoices() — cast total to the declared return type
-- ---------------------------------------------------------------------------
-- The signature declares `total integer`. Melek's orders.total IS integer, so
-- it worked there; Gurbet's is NUMERIC (a known schema divergence between the
-- two databases), and plpgsql refuses to coerce a NUMERIC into an INTEGER
-- OUT column — "structure of query does not match function result type", i.e.
-- a hard 400 on the /overdue page for the whole tenant.
--
-- Casting in the BODY rather than widening the signature to numeric keeps the
-- wire format identical on both tenants: PostgREST serialises numeric as a
-- JSON *string* ("443680.00") but integer as a number, and the client type
-- OverdueInvoice.total is `number`. Verified: 0 non-integral and 0 NULL totals
-- on Gurbet, max 443680 cents — comfortably inside int4.
--
-- Body is otherwise byte-identical to the live definition on both databases
-- (verified by md5 of pg_get_functiondef before the change).

CREATE OR REPLACE FUNCTION public.get_overdue_invoices()
 RETURNS TABLE(order_id uuid, order_number text, customer_id uuid, customer_name text, customer_email text, total integer, invoice_due_date date, days_overdue integer, invoice_number text, reminders_sent integer, last_reminder_at timestamp with time zone, snoozed_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    o.id, o.order_number, c.id, c.company_name, c.email,
    o.total::INTEGER,                      -- Gurbet stores this as NUMERIC
    o.invoice_due_date,
    (CURRENT_DATE - o.invoice_due_date)::INTEGER AS days_overdue,
    inv.document_number AS invoice_number,
    COALESCE(r.cnt, 0)::INTEGER AS reminders_sent,
    r.last_reminder_at, st.snoozed_until
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN LATERAL (
    SELECT d.document_number FROM documents d
    WHERE d.order_id = o.id AND d.document_type = 'invoice'
    ORDER BY d.generated_at DESC NULLS LAST LIMIT 1
  ) inv ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt, MAX(ds.created_at) AS last_reminder_at
    FROM document_sends ds
    WHERE ds.order_id = o.id
      AND ds.document_type = 'payment_reminder'
      AND ds.status NOT IN ('pending', 'failed')
  ) r ON TRUE
  LEFT JOIN invoice_reminder_state st ON st.order_id = o.id
  WHERE o.invoice_due_date < CURRENT_DATE
    AND o.status NOT IN ('completed', 'cancelled', 'refunded')
    AND o.reminders_opted_out = false
    AND c.reminders_opted_out = false
    AND (NOT o.hidden_from_managers OR is_owner())
  ORDER BY o.invoice_due_date ASC;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Grants — recreating a SECURITY DEFINER function re-grants EXECUTE to anon
-- via Supabase default privileges (the 00092 / 00095 gotcha). REVOKE FROM
-- PUBLIC alone is NOT enough; anon must be named explicitly.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.generate_order_number()  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_overdue_invoices()   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_overdue_invoices()  TO authenticated, service_role;
