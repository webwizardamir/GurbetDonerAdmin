-- 00112 — Saved delivery-route plans (Bezorgroute "Opslaan")
--
-- WHY
-- The owner's morning routine is: open Sold Products -> Route plannen,
-- optimise, then REORDER the stops by hand into the sequence he actually wants
-- to drive. All of that lived in React state and died with the modal. When a
-- shop manager opened the same day afterwards they got the raw candidate list
-- and had to run a fresh (billed) optimize, which returns Google's order, not
-- the owner's. The arrangement — the part that carries the owner's knowledge
-- about the round — was the one thing the app did not keep.
--
-- WHY A TABLE AND NOT localStorage
-- The whole point is hand-off between two PEOPLE on two devices. Browser
-- storage would leave the warehouse PC seeing nothing the owner saved on his
-- laptop, i.e. it would not implement the feature at all.
--
-- WHAT IS STORED: A SEQUENCE, NOT A SNAPSHOT
-- `plan` holds ordering + selection + locks + departure settings, plus an
-- OPTIONAL geometry cache (per-stop coordinates, leg distances, ETAs, totals,
-- depot) from the Google run that backed the save. It deliberately does NOT
-- hold manifests, addresses, quantities or order numbers: those are re-fetched
-- live every time the panel opens, so a saved route can never hand a driver a
-- stale product list. The geometry is a convenience only — the moment the
-- underlying order set drifts, the client blanks the ETAs (its existing
-- `orderDirty` path) rather than showing numbers for a route nobody is driving.
--
-- KEYED ON THE DATE ALONE, not on the city / customer-type / status filters the
-- owner happened to have set. A manager will not reproduce those filters, and a
-- plan keyed on them would simply never be found — the exact failure this
-- exists to prevent. The filters ARE stored, as metadata, so the panel can say
-- "opgeslagen met filter: Horeca" when they differ from the current view.
--
-- 🚨 Apply to BOTH pnimvwconhhmcwxcuxcz (Melek) and dvpnvulxkccurqkpqqnx (Gurbet).
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.delivery_route_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- A single-day plan stores end_date = route_date rather than NULL, so the
  -- uniqueness constraint is a plain two-column key instead of a COALESCE
  -- expression index (which PostgREST cannot name in an ON CONFLICT).
  route_date  date NOT NULL,
  end_date    date NOT NULL,
  plan        jsonb NOT NULL,
  -- Fingerprint of the order set at save time. Diffed against the live set on
  -- load to tell the user an order was added or dropped since the plan was made.
  order_ids   uuid[] NOT NULL DEFAULT '{}',
  filters     jsonb NOT NULL DEFAULT '{}'::jsonb,
  saved_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  saved_at    timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_route_plans_period_key UNIQUE (route_date, end_date),
  CONSTRAINT delivery_route_plans_period_ck  CHECK (end_date >= route_date)
);

COMMENT ON TABLE public.delivery_route_plans IS
  'One saved Bezorgroute arrangement per delivery period. Sequence + settings, not a data snapshot.';

-- Who saved it is stamped server-side on both INSERT and UPDATE. A client-sent
-- value would be spoofable, and an upsert that omits the column would otherwise
-- leave the ORIGINAL author's name on someone else's re-save.
CREATE OR REPLACE FUNCTION public.stamp_route_plan_saver()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.saved_by := auth.uid();
  NEW.saved_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_route_plans_saver ON public.delivery_route_plans;
CREATE TRIGGER trg_delivery_route_plans_saver
  BEFORE INSERT OR UPDATE ON public.delivery_route_plans
  FOR EACH ROW EXECUTE FUNCTION public.stamp_route_plan_saver();

-- RLS: staff only, both roles. Saving is explicitly NOT owner-gated — a manager
-- who finds a real problem with the arrangement (a stop the owner missed) must
-- be able to fix and re-save it rather than drive a route they know is wrong.
-- The panel names the last saver, which is what makes that safe socially.
-- The whole policy set is replaced, never patched by name: policies are OR'd,
-- so one leftover permissive policy would defeat the gate (see 00095).
ALTER TABLE public.delivery_route_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_route_plans_select ON public.delivery_route_plans;
DROP POLICY IF EXISTS delivery_route_plans_insert ON public.delivery_route_plans;
DROP POLICY IF EXISTS delivery_route_plans_update ON public.delivery_route_plans;
DROP POLICY IF EXISTS delivery_route_plans_delete ON public.delivery_route_plans;

CREATE POLICY delivery_route_plans_select ON public.delivery_route_plans
  FOR SELECT TO authenticated USING (is_admin_user());
CREATE POLICY delivery_route_plans_insert ON public.delivery_route_plans
  FOR INSERT TO authenticated WITH CHECK (is_admin_user());
CREATE POLICY delivery_route_plans_update ON public.delivery_route_plans
  FOR UPDATE TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY delivery_route_plans_delete ON public.delivery_route_plans
  FOR DELETE TO authenticated USING (is_admin_user());

-- ---------------------------------------------------------------------------
-- Read path
--
-- 🚨 THE ONLY REASON THIS IS AN RPC AND NOT A PLAIN SELECT: `order_ids` is the
-- drift fingerprint, and it can contain an order the caller is not allowed to
-- see. `orders.hidden_from_managers` (00095) hides an order from a shop manager
-- everywhere — but the manager's LIVE fetch would then be missing it while the
-- saved fingerprint still lists it, so the drift diff would announce
-- "1 bestelling vervallen" and quietly reveal that a hidden order exists.
-- Filtering the fingerprint through the canonical predicate, written verbatim
-- so it stays greppable, makes the manager's diff clean on both sides.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_delivery_route_plan(
  p_day date,
  p_end_day date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end    date := COALESCE(p_end_day, p_day);
  v_row    public.delivery_route_plans%ROWTYPE;
  v_result json;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_row
    FROM public.delivery_route_plans
   WHERE route_date = p_day AND end_date = v_end;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id',          v_row.id,
    'routeDate',   v_row.route_date,
    'endDate',     v_row.end_date,
    'plan',        v_row.plan,
    'filters',     v_row.filters,
    'savedAt',     v_row.saved_at,
    'savedByName', (
      SELECT COALESCE(NULLIF(pr.full_name, ''), pr.email)
        FROM public.profiles pr WHERE pr.id = v_row.saved_by
    ),
    'orderIds',    COALESCE((
      SELECT json_agg(o.id)
        FROM public.orders o
       WHERE o.id = ANY(v_row.order_ids)
         AND (NOT o.hidden_from_managers OR (SELECT is_owner()))
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Recreating a SECURITY DEFINER function re-grants EXECUTE to anon via Supabase
-- default privileges. REVOKE FROM PUBLIC alone is NOT enough (00092).
REVOKE ALL ON FUNCTION public.get_delivery_route_plan(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_route_plan(date, date) TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_delivery_route_plan(date, date)', 'EXECUTE') THEN
    RAISE EXCEPTION '00112: get_delivery_route_plan is executable by anon';
  END IF;
END $$;
