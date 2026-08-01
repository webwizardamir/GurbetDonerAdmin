-- 00108 — Audit trail on the pricing tables.
--
-- "Who changed this price, and from what?" was unanswerable. When a customer's
-- price list appeared to have reverted (Laura Food, 29 July 2026), the only
-- reason the question could be settled at all was that `customer_prices`
-- happens to have its own `price_history` table from 00014. The three tables
-- that actually hold prices had nothing:
--
--   price_list_items     negotiated per-list price + the COG override (00068)
--   price_lists          list name / is_active
--   product_unit_prices  the CATALOG price and cost per unit
--
-- All three are audited, not just the price list: that morning a catalog cost
-- change at 07:22 and price-list writes at 10:10–10:17 were both involved, so
-- auditing only the list would have left half the timeline dark.
--
-- Nothing new is built. `log_audit_event()` (00084) already derives entity_type
-- from TG_TABLE_NAME and entity_id from NEW.id/OLD.id, snapshots the full row to
-- JSONB, and resolves the actor via profiles → auth.users → 'system'. All three
-- tables have a uuid `id` PK, which is what `audit_logs.entity_id UUID NOT NULL`
-- requires.
--
-- Volume is bounded by the trigger's own noise filter: it skips no-op updates,
-- and skips updates that touch only `noise_keys` — which includes `updated_at`,
-- the one column each of these tables' own BEFORE UPDATE trigger bumps. So an
-- idempotent re-import or a re-save of unchanged values writes ZERO rows. A
-- genuine Excel re-import of many changed prices does write one row per changed
-- item, and that is the point of having the log.
--
-- Nothing else needs changing: `search_audit_logs` (00085) compares
-- p_entity_type with `=` against free text, `get_audit_actors()` is a SELECT
-- DISTINCT, and the audit_logs RLS (SELECT, is_owner()) already covers the new
-- rows. `COST_FIELDS` in utils/audit.ts already strips cost_cents from
-- non-owners in the UI diff.
--
-- Safe to re-run.
--
-- 🚨 Apply to BOTH pnimvwconhhmcwxcuxcz (Melek) and dvpnvulxkccurqkpqqnx (Gurbet).

DROP TRIGGER IF EXISTS audit_price_list_items    ON price_list_items;
DROP TRIGGER IF EXISTS audit_price_lists         ON price_lists;
DROP TRIGGER IF EXISTS audit_product_unit_prices ON product_unit_prices;

CREATE TRIGGER audit_price_list_items    AFTER INSERT OR UPDATE OR DELETE ON price_list_items    FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_price_lists         AFTER INSERT OR UPDATE OR DELETE ON price_lists         FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_product_unit_prices AFTER INSERT OR UPDATE OR DELETE ON product_unit_prices FOR EACH ROW EXECUTE FUNCTION log_audit_event();
