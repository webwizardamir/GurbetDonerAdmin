-- ============================================================================
-- 00100 — A Concept (draft) order is pinned to the TOP of the orders list
-- ============================================================================
--
-- WHY
-- A draft is unfinished work: no invoice, no email, out of analytics, but the
-- stock is already reserved. It is the one status that needs a human to come
-- back and act on it. 00098 (re-stamp order_date on finalise) and 00099
-- (activated_at tiebreaker) fixed where an order lands *after* it goes live —
-- but while it is still a Concept it sorts by its own order_date like anything
-- else, so a draft parked on a quiet day sinks down the list (and off page 1)
-- the moment newer orders arrive. Owner's ask: "concept orders should always
-- stay at top, regardless of their date, so I know there is something going on
-- and check it till done."
--
-- HOW
-- The sort has to be SERVER-side. The list is paginated 50 at a time, so
-- re-ordering the fetched page in the browser would leave a draft stranded on
-- page 3 — exactly the invisibility being fixed. PostgREST can only ORDER BY a
-- column, not an expression, hence a generated column rather than a bare
-- `ORDER BY status = 'draft'`.
--
-- `is_draft` is GENERATED ALWAYS ... STORED, so it can never drift from
-- `status` and no trigger has to maintain it. `status` is nullable, so the
-- expression is wrapped in `IS TRUE` to keep the column NOT NULL-ish in
-- practice (NULL status → false, never a NULL that would sort first).
--
-- Deliberately keyed on `status`, NOT `pre_trash_status`: a trashed draft is
-- `status = 'cancelled' + deleted_at`, it lives in the Prullenbak and must not
-- be pinned to the top of the live list.
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_draft boolean
  GENERATED ALWAYS AS ((status = 'draft'::order_status) IS TRUE) STORED;

COMMENT ON COLUMN orders.is_draft IS
  'Generated from status. Sort key only: fetchOrders orders by is_draft DESC first so Concept orders stay pinned to the top of the list regardless of their date. See migration 00100.';

-- Matches the new ORDER BY exactly (is_draft DESC, order_date DESC,
-- activated_at DESC). Supersedes idx_orders_list_sort for the list query;
-- that index is left in place — it still serves date-only scans (analytics,
-- day close, route) and dropping it buys nothing.
CREATE INDEX IF NOT EXISTS idx_orders_list_sort_draft
  ON orders (is_draft DESC, order_date DESC, activated_at DESC);
