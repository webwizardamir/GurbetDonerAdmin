-- 00115 — Klantactiviteit: alerting on customers who stopped ordering.
--
-- Every automated email in this system chases money that is OWED (the dunning
-- ladder, the monthly Betaaloverzicht, the 24h invoice send). Nothing watches
-- the opposite risk: a customer who quietly stops ordering. That is noticed by
-- accident, weeks late. This adds the data model for a daily morning digest
-- naming the customers who have gone quiet.
--
-- WHAT "QUIET" MEANS IS ROLLING DAYS, NOT A CALENDAR MONTH. "Has not ordered
-- this month" flags practically the whole book on the 1st and the 2nd, which is
-- exactly when the mail would be least worth reading. Days-since-last-order is
-- monotonic and states itself: "37 dagen geleden (regel: 30)".
--
-- The rule for a customer resolves like the pricing chain does:
--     customers.inactivity_enabled = FALSE   → never report this customer
--   → customers.inactivity_days              → their own rule
--   → client_reminder_config.inactive_alert.by_type[customer_type]
--   → …default_days (untagged customers, or a customer forced ON by hand)
--   → NULL                                   → not monitored
-- A NULL per-type value means that whole type is not monitored, which is what
-- makes "watch Horeca weekly, ignore the rest" a two-field setting.
--
-- 🚨 OWNER-ONLY BY DESIGN. Chasing sales is the owner's job, and it keeps
-- `orders.hidden_from_managers` out of the picture entirely: a last-order date
-- computed over hidden orders would let a Shop Manager infer that a hidden order
-- exists. Do NOT relax the guard to is_admin_user() without adding the canonical
-- hidden-order predicate to the order scan below.
--
-- 🚨 Apply to BOTH pnimvwconhhmcwxcuxcz (Melek) and dvpnvulxkccurqkpqqnx (Gurbet).
-- The matching config lives in document_settings.client_reminder_config as the
-- optional `inactive_alert` key, so it needs no column and no backfill.

-- ---------------------------------------------------------------------------
-- 1. Per-customer override
-- ---------------------------------------------------------------------------
-- Both columns are nullable and NULL means "inherit", so an untouched customer
-- keeps following its type rule forever. Taking one client off the general
-- Horeca rule is `inactivity_enabled = false`; giving them their own cadence is
-- `inactivity_days = 21`.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS inactivity_days    INTEGER,
  ADD COLUMN IF NOT EXISTS inactivity_enabled BOOLEAN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_inactivity_days_ck'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_inactivity_days_ck
      CHECK (inactivity_days IS NULL OR (inactivity_days BETWEEN 1 AND 3650));
  END IF;
END $$;

COMMENT ON COLUMN public.customers.inactivity_days IS
  'Klantactiviteit: own threshold in days. NULL = follow the customer-type rule.';
COMMENT ON COLUMN public.customers.inactivity_enabled IS
  'Klantactiviteit: NULL = inherit, FALSE = never report, TRUE = report even when the type rule is off.';

-- The digest scans every active customer for its newest order date, so give
-- that scan an index instead of leaning on the generic customer index.
CREATE INDEX IF NOT EXISTS idx_orders_customer_order_date
  ON public.orders (customer_id, order_date DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Digest log
-- ---------------------------------------------------------------------------
-- One row per send. `run_date` is UNIQUE and is the idempotency anchor: the
-- cron wakes hourly, so without it a send_hour of 8 would mail again at 9.
-- `snapshot` freezes the rows exactly as mailed (the payment_overviews rule),
-- so re-opening last week's digest can never show today's numbers, and
-- `customer_ids` backs the optional repeat suppression without parsing JSON.
CREATE TABLE IF NOT EXISTS public.customer_inactivity_digests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date          date NOT NULL UNIQUE,
  recipients        text[] NOT NULL DEFAULT '{}',
  customer_ids      uuid[] NOT NULL DEFAULT '{}',
  snapshot          jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_count    integer NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'sent', 'failed')),
  resend_message_id text,
  error_message     text,
  sent_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_inactivity_digests_run_date
  ON public.customer_inactivity_digests (run_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_inactivity_digests_customers
  ON public.customer_inactivity_digests USING GIN (customer_ids);

ALTER TABLE public.customer_inactivity_digests ENABLE ROW LEVEL SECURITY;

-- Owner-only, matching payment_overviews (00103). No DELETE policy: the log is
-- append-only, like every other send record in this system.
DROP POLICY IF EXISTS customer_inactivity_digests_select ON public.customer_inactivity_digests;
DROP POLICY IF EXISTS customer_inactivity_digests_insert ON public.customer_inactivity_digests;
DROP POLICY IF EXISTS customer_inactivity_digests_update ON public.customer_inactivity_digests;

CREATE POLICY customer_inactivity_digests_select ON public.customer_inactivity_digests
  FOR SELECT TO authenticated
  USING (is_admin_user() AND (SELECT is_owner()));

CREATE POLICY customer_inactivity_digests_insert ON public.customer_inactivity_digests
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user() AND (SELECT is_owner()));

CREATE POLICY customer_inactivity_digests_update ON public.customer_inactivity_digests
  FOR UPDATE TO authenticated
  USING      (is_admin_user() AND (SELECT is_owner()))
  WITH CHECK (is_admin_user() AND (SELECT is_owner()));

-- ---------------------------------------------------------------------------
-- 3. The bell category
-- ---------------------------------------------------------------------------
-- The digest drops one row into the existing per-user `reminders` table so it
-- appears in the header bell beside the owner's own reminders, rather than
-- becoming a second notification surface.
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_category_check;
ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_category_check
  CHECK (category IN ('generic', 'payment_due', 'customer_inactive'));

-- ---------------------------------------------------------------------------
-- 4. get_customer_activity — one definition for the mail AND the screen
-- ---------------------------------------------------------------------------
-- `p_only_due` mirrors get_payment_overview_orders(p_overdue_only): the cron
-- passes TRUE (what gets mailed), the admin tab passes FALSE (the full picture,
-- which is what makes "who is covered by which rule" answerable). One body, so
-- the screen can never disagree with what went out.
--
-- The function reads the config itself instead of taking thresholds as
-- parameters, so the service-role cron and a browser session resolve rules
-- through the same code and no caller can pass a different rule set.
--
-- 🚨 CUSTOMERS WHO NEVER ORDERED ARE NOT DUE BY DEFAULT (`include_never_ordered`,
-- default false). Measured on live data the day this shipped: of 251 active
-- customers, 133 had no order at all (the WC import created them; the go-live
-- reset wiped the order history), against 31 who genuinely used to order and
-- stopped. Counting the 133 as dormant makes them 80% of every morning's mail
-- and buries the only rows worth acting on. They stay visible on the screen
-- with `order_count = 0` and can be switched into the mail deliberately.
DROP FUNCTION IF EXISTS public.get_customer_activity(boolean);

CREATE FUNCTION public.get_customer_activity(p_only_due boolean DEFAULT false)
RETURNS TABLE(
  customer_id     uuid,
  company_name    text,
  customer_type   text,
  email           text,
  phone           text,
  city            text,
  last_order_date date,
  order_count     integer,
  days_since      integer,
  threshold_days  integer,
  rule_source     text,
  is_due          boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg           jsonb;
  v_include_never boolean;
BEGIN
  -- Admits the service-role cron (auth.uid() IS NULL) AND the owner, nobody
  -- else. A plain `NOT is_owner()` would lock the cron out.
  IF auth.uid() IS NOT NULL AND NOT is_owner() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(ds.client_reminder_config -> 'inactive_alert', '{}'::jsonb)
    INTO v_cfg
  FROM document_settings ds
  LIMIT 1;
  v_cfg := COALESCE(v_cfg, '{}'::jsonb);
  v_include_never := COALESCE((v_cfg ->> 'include_never_ordered')::boolean, false);

  RETURN QUERY
  WITH last_orders AS (
    -- Real orders only. A cancelled, refunded or still-draft order is not a
    -- sign of life, and a trashed one certainly is not.
    SELECT
      o.customer_id            AS cid,
      MAX(o.order_date)        AS last_order_date,
      COUNT(*)::integer        AS order_count
    FROM orders o
    WHERE o.deleted_at IS NULL
      AND o.status NOT IN ('cancelled', 'refunded', 'draft')
    GROUP BY o.customer_id
  ),
  resolved AS (
    SELECT
      c.id, c.company_name, c.customer_type, c.email, c.phone, c.billing_city,
      lo.last_order_date,
      COALESCE(lo.order_count, 0) AS order_count,
      -- A customer who has never ordered counts as dormant, measured from the
      -- day they were created. last_order_date stays NULL so the UI and the PDF
      -- can say "nog nooit besteld" rather than invent a date.
      (CURRENT_DATE - COALESCE(lo.last_order_date, c.created_at::date))::integer AS days_since,
      -- 🚨 These two CASEs are ONE decision expressed twice: identical branch
      -- order, one returning the number and one naming where it came from.
      -- Change a branch in either and change it in both, and in the pure port
      -- resolveInactivityRule() in services/customerActivity.ts.
      CASE
        WHEN c.inactivity_enabled IS FALSE                  THEN NULL
        WHEN c.inactivity_days IS NOT NULL                  THEN c.inactivity_days
        WHEN rule.type_days IS NOT NULL                     THEN rule.type_days
        WHEN c.customer_type IS NULL
          OR c.inactivity_enabled IS TRUE                   THEN rule.default_days
        ELSE NULL
      END AS threshold_days,
      CASE
        WHEN c.inactivity_enabled IS FALSE                  THEN 'off'
        WHEN c.inactivity_days IS NOT NULL                  THEN 'customer'
        WHEN rule.type_days IS NOT NULL                     THEN 'type'
        WHEN c.customer_type IS NULL
          OR c.inactivity_enabled IS TRUE                   THEN 'default'
        ELSE 'off'
      END AS rule_source
    FROM customers c
    LEFT JOIN last_orders lo ON lo.cid = c.id
    LEFT JOIN LATERAL (
      SELECT
        -- A JSON null (or a missing key) yields SQL NULL, which is precisely
        -- "this type is not monitored".
        CASE WHEN c.customer_type IS NULL THEN NULL
             ELSE NULLIF(v_cfg -> 'by_type' ->> c.customer_type, '')::integer END AS type_days,
        NULLIF(v_cfg ->> 'default_days', '')::integer                             AS default_days
    ) rule ON TRUE
    WHERE c.is_active
  ),
  -- One definition of "due", computed once and reused by the projection, the
  -- filter and the sort, so those three can never drift apart.
  flagged AS (
    SELECT r.*,
           (r.threshold_days IS NOT NULL
             AND r.days_since >= r.threshold_days
             AND (r.order_count > 0 OR v_include_never)) AS due
    FROM resolved r
  )
  SELECT
    f.id,
    f.company_name,
    f.customer_type,
    f.email,
    f.phone,
    f.billing_city,
    f.last_order_date,
    f.order_count,
    f.days_since,
    f.threshold_days,
    CASE WHEN f.threshold_days IS NULL THEN 'off' ELSE f.rule_source END,
    f.due
  FROM flagged f
  WHERE NOT p_only_due OR f.due
  ORDER BY f.due DESC, f.days_since DESC, f.company_name ASC;
END;
$function$;

-- 🚨 Recreating a SECURITY DEFINER function re-grants EXECUTE to `anon` via
-- Supabase default privileges. REVOKE FROM PUBLIC alone is not enough.
REVOKE EXECUTE ON FUNCTION public.get_customer_activity(boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_customer_activity(boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Assertions — a silent miss on a security grant is the failure to prevent
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_customer_activity(boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'get_customer_activity is still executable by anon';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.get_customer_activity(boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'get_customer_activity is not executable by the cron (service_role)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customer_inactivity_digests' AND policyname = 'customer_inactivity_digests_select'
  ) THEN
    RAISE EXCEPTION 'customer_inactivity_digests SELECT policy missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'inactivity_days' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'customers.inactivity_days must stay nullable (NULL = inherit)';
  END IF;
END $$;
