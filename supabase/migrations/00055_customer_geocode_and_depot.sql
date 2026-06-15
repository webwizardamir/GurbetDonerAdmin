-- 00055_customer_geocode_and_depot.sql
-- Delivery Route (Bezorgroute) feature.
--
-- 1. Geocode cache on customers — each delivery address is geocoded once
--    (Google Geocoding is billed per call). The cache is invalidated by a
--    trigger whenever the resolved address changes, so the next route build
--    re-geocodes only the affected row.
-- 2. Delivery depot (start/return point) on the document_settings singleton.
--
-- All statements are idempotent so this can be pasted into Supabase Studio
-- safely. Coordinates are written by the plan-delivery-route edge function
-- (service-role); the new columns inherit the existing customers RLS.

-- =====================================================
-- 1. Geocode cache columns on customers
-- =====================================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS latitude             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at          TIMESTAMPTZ,
  -- md5 of the normalised resolved delivery address (the exact string sent to
  -- Google). When the resolved address changes this no longer matches the
  -- recomputed hash, so the edge function re-geocodes the row.
  ADD COLUMN IF NOT EXISTS geocode_address_hash TEXT,
  -- 'ok' | 'zero_results' | 'error' — lets the UI flag un-geocodable rows.
  ADD COLUMN IF NOT EXISTS geocode_status       TEXT;

COMMENT ON COLUMN customers.geocode_address_hash IS
  'md5 of the normalised resolved delivery address at geocode time. Mismatch with the recomputed hash triggers re-geocoding.';

-- "rows that still need geocoding" — small partial index for the edge function.
CREATE INDEX IF NOT EXISTS idx_customers_geocode_missing
  ON customers (id)
  WHERE latitude IS NULL OR longitude IS NULL;

-- =====================================================
-- 2. Cache invalidation trigger
-- =====================================================
-- Null out the cached coordinates whenever any address component (billing or
-- shipping) or the shipping_same_as_billing flag changes. This keeps the cache
-- correct without re-geocoding unchanged addresses.
CREATE OR REPLACE FUNCTION invalidate_customer_geocode()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.billing_street        IS DISTINCT FROM OLD.billing_street)
   OR (NEW.billing_postal_code  IS DISTINCT FROM OLD.billing_postal_code)
   OR (NEW.billing_city         IS DISTINCT FROM OLD.billing_city)
   OR (NEW.billing_country      IS DISTINCT FROM OLD.billing_country)
   OR (NEW.shipping_street       IS DISTINCT FROM OLD.shipping_street)
   OR (NEW.shipping_postal_code  IS DISTINCT FROM OLD.shipping_postal_code)
   OR (NEW.shipping_city         IS DISTINCT FROM OLD.shipping_city)
   OR (NEW.shipping_country      IS DISTINCT FROM OLD.shipping_country)
   OR (NEW.shipping_same_as_billing IS DISTINCT FROM OLD.shipping_same_as_billing)
  THEN
    NEW.latitude             := NULL;
    NEW.longitude            := NULL;
    NEW.geocoded_at          := NULL;
    NEW.geocode_address_hash := NULL;
    NEW.geocode_status       := NULL;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.invalidate_customer_geocode() SET search_path = public;

DROP TRIGGER IF EXISTS trg_invalidate_customer_geocode ON customers;
CREATE TRIGGER trg_invalidate_customer_geocode
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_customer_geocode();

-- =====================================================
-- 3. Delivery depot on document_settings (singleton)
-- =====================================================
ALTER TABLE document_settings
  ADD COLUMN IF NOT EXISTS depot_label       TEXT DEFAULT 'Magazijn',
  ADD COLUMN IF NOT EXISTS depot_street       TEXT,
  ADD COLUMN IF NOT EXISTS depot_postal_code  TEXT,
  ADD COLUMN IF NOT EXISTS depot_city         TEXT,
  ADD COLUMN IF NOT EXISTS depot_country      TEXT DEFAULT 'NL',
  ADD COLUMN IF NOT EXISTS depot_latitude     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS depot_longitude    DOUBLE PRECISION;

COMMENT ON COLUMN document_settings.depot_latitude IS
  'Cached geocode of the depot address; set by the plan-delivery-route edge function on first use.';
