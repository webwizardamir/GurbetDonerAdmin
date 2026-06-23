-- Drop redundant legacy line-amount columns on order_items.
--
-- Background: early schema churn (migrations 00015-00020) left three "line
-- amount" columns on order_items: `total` (canonical, written + read by the
-- app), `line_total` (legacy, default 0, no longer written), and
-- `line_total_cents` (added in 00017, never read or written).
--
-- The admin app's JS `line_total` field is an ALIAS sourced from the DB `total`
-- column (services/orders.ts), so it is unaffected. The only direct reader of
-- the DB `line_total` column was the customer portal query, now repointed to
-- `total` (services/portalOrders.ts). No RPC, view, or trigger references either
-- column. Safe to drop.

ALTER TABLE order_items DROP COLUMN IF EXISTS line_total;
ALTER TABLE order_items DROP COLUMN IF EXISTS line_total_cents;
