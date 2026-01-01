-- =====================================================
-- Migration: Add Order Confirmation & Payment Reminder document types
-- =====================================================

-- Add new values to document_type enum
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'order_confirmation';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'payment_reminder';

-- =====================================================
-- Add new columns to document_settings
-- =====================================================

-- Order Confirmation numbering
ALTER TABLE document_settings
  ADD COLUMN IF NOT EXISTS order_confirmation_prefix TEXT DEFAULT 'OB-',
  ADD COLUMN IF NOT EXISTS order_confirmation_next_number INTEGER DEFAULT 1;

-- Payment Reminder numbering
ALTER TABLE document_settings
  ADD COLUMN IF NOT EXISTS payment_reminder_prefix TEXT DEFAULT 'HR-',
  ADD COLUMN IF NOT EXISTS payment_reminder_next_number INTEGER DEFAULT 1;

-- Labels for new document types
ALTER TABLE document_settings
  ADD COLUMN IF NOT EXISTS label_order_confirmation TEXT DEFAULT 'ORDERBEVESTIGING',
  ADD COLUMN IF NOT EXISTS label_payment_reminder TEXT DEFAULT 'BETALINGSHERINNERING';

-- =====================================================
-- Update get_next_document_number function
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_document_number(doc_type document_type)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_number INTEGER;
  v_result TEXT;
BEGIN
  -- Get current settings based on document type
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

  ELSIF doc_type = 'order_confirmation' THEN
    SELECT order_confirmation_prefix, order_confirmation_next_number INTO v_prefix, v_number
    FROM document_settings LIMIT 1;
    UPDATE document_settings SET order_confirmation_next_number = order_confirmation_next_number + 1;

  ELSIF doc_type = 'payment_reminder' THEN
    SELECT payment_reminder_prefix, payment_reminder_next_number INTO v_prefix, v_number
    FROM document_settings LIMIT 1;
    UPDATE document_settings SET payment_reminder_next_number = payment_reminder_next_number + 1;
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
