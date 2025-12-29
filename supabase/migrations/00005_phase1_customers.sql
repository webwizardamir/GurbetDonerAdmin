-- =====================================================
-- PHASE 1: CUSTOMERS - Schema Update
-- =====================================================

-- This migration updates the customers table to match the Phase 1 spec
-- with proper billing/shipping addresses for Dutch/EU B2B compliance

-- =====================================================
-- 1. ADD NEW COLUMNS
-- =====================================================

-- Rename contact_name to contact_person (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'contact_name') THEN
        ALTER TABLE customers RENAME COLUMN contact_name TO contact_person;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'contact_person') THEN
        ALTER TABLE customers ADD COLUMN contact_person TEXT;
    END IF;
END $$;

-- Rename tax_id to vat_number
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tax_id') THEN
        ALTER TABLE customers RENAME COLUMN tax_id TO vat_number;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'vat_number') THEN
        ALTER TABLE customers ADD COLUMN vat_number TEXT;
    END IF;
END $$;

-- Add billing address columns
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS billing_street TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'NL';

-- Add shipping address columns
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS shipping_same_as_billing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS shipping_street TEXT,
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'NL';

-- Rename notes to internal_notes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'notes') THEN
        ALTER TABLE customers RENAME COLUMN notes TO internal_notes;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'internal_notes') THEN
        ALTER TABLE customers ADD COLUMN internal_notes TEXT;
    END IF;
END $$;

-- Add created_by column
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- =====================================================
-- 2. MIGRATE EXISTING DATA
-- =====================================================

-- Migrate existing address data to billing fields
UPDATE customers
SET
    billing_street = address,
    billing_city = city,
    billing_postal_code = postal_code,
    billing_country = COALESCE(NULLIF(country, 'Turkey'), 'NL')
WHERE billing_street IS NULL AND address IS NOT NULL;

-- =====================================================
-- 3. UPDATE COUNTRY DEFAULT
-- =====================================================

-- Update default country to Netherlands
ALTER TABLE customers
ALTER COLUMN billing_country SET DEFAULT 'NL';

-- =====================================================
-- 4. REMOVE EMAIL UNIQUE CONSTRAINT (B2B can have same contacts)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'customers_email_key') THEN
        ALTER TABLE customers DROP CONSTRAINT customers_email_key;
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =====================================================
-- 5. CREATE INDEXES FOR NEW COLUMNS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_billing_city ON customers(billing_city);
CREATE INDEX IF NOT EXISTS idx_customers_vat_number ON customers(vat_number);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- RLS policies and functions are in 00006_fix_customers_rls.sql
