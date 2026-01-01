-- =====================================================
-- Phase 6: Documents - PDF Generation System
-- =====================================================

-- Document type enum
DO $$
BEGIN
  CREATE TYPE document_type AS ENUM ('invoice', 'proforma', 'credit_note', 'packing_slip');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- Document Settings Table (Company Info, Bank, Numbering)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Identity
  company_name TEXT NOT NULL DEFAULT 'Your Company Name',
  company_address TEXT,
  company_postal_code TEXT,
  company_city TEXT,
  company_country TEXT DEFAULT 'Netherlands',
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  company_logo_url TEXT,

  -- Legal Registration
  company_vat_number TEXT,  -- BTW nummer
  company_kvk_number TEXT,  -- KVK nummer (Chamber of Commerce)

  -- Bank Details
  bank_name TEXT,
  bank_iban TEXT,
  bank_bic TEXT,
  bank_account_holder TEXT,

  -- Payment Terms
  payment_terms_days INTEGER DEFAULT 14,
  payment_terms_text TEXT DEFAULT 'Payment due within 14 days of invoice date.',

  -- Invoice Numbering
  invoice_prefix TEXT DEFAULT 'INV-',
  invoice_next_number INTEGER DEFAULT 1,

  -- Proforma Numbering
  proforma_prefix TEXT DEFAULT 'PRO-',
  proforma_next_number INTEGER DEFAULT 1,

  -- Credit Note Numbering
  credit_note_prefix TEXT DEFAULT 'CN-',
  credit_note_next_number INTEGER DEFAULT 1,

  -- Packing Slip Numbering
  packing_slip_prefix TEXT DEFAULT 'PS-',
  packing_slip_next_number INTEGER DEFAULT 1,

  -- Document Labels (customizable text)
  label_invoice TEXT DEFAULT 'FACTUUR',
  label_proforma TEXT DEFAULT 'PROFORMA',
  label_credit_note TEXT DEFAULT 'CREDITNOTA',
  label_packing_slip TEXT DEFAULT 'PAKBON',
  label_invoice_address TEXT DEFAULT 'FACTUURADRES',
  label_date TEXT DEFAULT 'Datum',
  label_customer_number TEXT DEFAULT 'Klantnummer',
  label_due_date TEXT DEFAULT 'Vervaldatum',
  label_description TEXT DEFAULT 'Omschrijving',
  label_quantity TEXT DEFAULT 'Aantal',
  label_unit TEXT DEFAULT 'Eenheid',
  label_unit_price TEXT DEFAULT 'Prijs',
  label_vat TEXT DEFAULT 'BTW',
  label_total TEXT DEFAULT 'Totaal',
  label_subtotal TEXT DEFAULT 'Subtotaal',
  label_grand_total TEXT DEFAULT 'Totaal te betalen',
  label_payment_method TEXT DEFAULT 'BETAALWIJZE (AANKRUISEN)',
  label_cash TEXT DEFAULT 'Contant',
  label_bank TEXT DEFAULT 'Bank',
  label_on_account TEXT DEFAULT 'Op rekening',
  label_for_approval TEXT DEFAULT 'VOOR AKKOORD',
  label_name TEXT DEFAULT 'Naam',
  label_signature TEXT DEFAULT 'Handtekening',

  -- Footer text
  footer_text TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Documents Table (Generated PDFs)
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  document_type document_type NOT NULL,
  document_number TEXT NOT NULL,

  -- Snapshot of data at generation time (for legal compliance)
  snapshot JSONB,

  -- Storage
  pdf_url TEXT,
  file_size INTEGER,

  -- Metadata
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique document numbers per type
  UNIQUE(document_type, document_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id);
CREATE INDEX IF NOT EXISTS idx_documents_type_number ON documents(document_type, document_number);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE document_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Document Settings: Only Owner can modify, all authenticated can read
DROP POLICY IF EXISTS "document_settings_select" ON document_settings;
CREATE POLICY "document_settings_select" ON document_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "document_settings_insert" ON document_settings;
CREATE POLICY "document_settings_insert" ON document_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "document_settings_update" ON document_settings;
CREATE POLICY "document_settings_update" ON document_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Documents: All authenticated can generate and view
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "documents_delete" ON documents;
CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- =====================================================
-- Functions
-- =====================================================

-- Function to get next document number and increment counter
CREATE OR REPLACE FUNCTION get_next_document_number(doc_type document_type)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_number INTEGER;
  v_result TEXT;
BEGIN
  -- Get current settings
  IF doc_type = 'invoice' THEN
    SELECT invoice_prefix, invoice_next_number INTO v_prefix, v_number
    FROM document_settings LIMIT 1;

    UPDATE document_settings SET invoice_next_number = invoice_next_number + 1;
  ELSIF doc_type = 'proforma' THEN
    SELECT proforma_prefix, proforma_next_number INTO v_prefix, v_number
    FROM document_settings LIMIT 1;

    UPDATE document_settings SET proforma_next_number = proforma_next_number + 1;
  ELSIF doc_type = 'credit_note' THEN
    SELECT credit_note_prefix, credit_note_next_number INTO v_prefix, v_number
    FROM document_settings LIMIT 1;

    UPDATE document_settings SET credit_note_next_number = credit_note_next_number + 1;
  ELSIF doc_type = 'packing_slip' THEN
    SELECT packing_slip_prefix, packing_slip_next_number INTO v_prefix, v_number
    FROM document_settings LIMIT 1;

    UPDATE document_settings SET packing_slip_next_number = packing_slip_next_number + 1;
  END IF;

  -- Handle case where no settings exist
  IF v_prefix IS NULL THEN
    v_prefix := UPPER(SUBSTRING(doc_type::TEXT FROM 1 FOR 3)) || '-';
    v_number := 1;
  END IF;

  v_result := v_prefix || LPAD(v_number::TEXT, 5, '0');

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Insert default settings if not exists
-- =====================================================

INSERT INTO document_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM document_settings LIMIT 1);

-- =====================================================
-- Update trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_document_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_settings_updated_at ON document_settings;
CREATE TRIGGER document_settings_updated_at
  BEFORE UPDATE ON document_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_document_settings_timestamp();
