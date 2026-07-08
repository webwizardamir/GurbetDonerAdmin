-- =====================================================
-- 00079 — Atomic, drift-proof document numbering
-- =====================================================
--
-- Problem this fixes:
--   The app assigned the next document number by reading the stored counter
--   (document_settings.<type>_next_number) and incrementing it, client-side,
--   with no atomicity and no reference to the numbers actually used. If that
--   counter ever drifted BEHIND the real maximum used number (an end-of-month
--   numbering resync, a manual edit, a WC import, or an aborted batch), every
--   generate handed out an already-used number and hit the
--   documents_document_type_document_number_key UNIQUE constraint (HTTP 409).
--   The Day Close batch aborted mid-loop ("keeps loading, then nothing").
--   Each failed insert still bumped the counter, so it slowly "walked" past the
--   max, burning numbers and leaving gaps in a legal invoice sequence.
--
-- Fix:
--   A single SECURITY DEFINER RPC that, under a row lock on the settings
--   singleton, computes the next number as
--       GREATEST(stored_counter, max_used_for_type + 1)
--   so it can never collide with an existing number and self-heals any drift
--   instantly (no walking, no burned numbers). The row lock also removes the
--   read-then-write race between concurrent callers, so numbering is safe even
--   if two documents are generated at the same instant.
--
--   Both owner and shop_manager may generate documents (see the roles table),
--   so the guard is is_admin_user() (owner + shop_manager + admin), matching
--   the existing document RLS.

CREATE OR REPLACE FUNCTION get_next_document_number_atomic(p_doc_type document_type)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id       uuid;
  v_prefix   text;
  v_counter  integer;
  v_max_used integer;
  v_next     integer;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized to generate document numbers';
  END IF;

  -- Lock the singleton settings row so concurrent callers serialize here.
  SELECT id INTO v_id FROM document_settings LIMIT 1 FOR UPDATE;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Document settings not configured';
  END IF;

  -- Resolve the prefix + current stored counter for this document type.
  SELECT
    CASE p_doc_type
      WHEN 'invoice'            THEN COALESCE(invoice_prefix, 'INV-')
      WHEN 'proforma'           THEN COALESCE(proforma_prefix, 'PRO-')
      WHEN 'credit_note'        THEN COALESCE(credit_note_prefix, 'CN-')
      WHEN 'packing_slip'       THEN COALESCE(packing_slip_prefix, 'PS-')
      WHEN 'order_confirmation' THEN COALESCE(order_confirmation_prefix, 'OB-')
      WHEN 'payment_reminder'   THEN COALESCE(payment_reminder_prefix, 'HR-')
    END,
    CASE p_doc_type
      WHEN 'invoice'            THEN COALESCE(invoice_next_number, 1)
      WHEN 'proforma'           THEN COALESCE(proforma_next_number, 1)
      WHEN 'credit_note'        THEN COALESCE(credit_note_next_number, 1)
      WHEN 'packing_slip'       THEN COALESCE(packing_slip_next_number, 1)
      WHEN 'order_confirmation' THEN COALESCE(order_confirmation_next_number, 1)
      WHEN 'payment_reminder'   THEN COALESCE(payment_reminder_next_number, 1)
    END
  INTO v_prefix, v_counter
  FROM document_settings WHERE id = v_id;

  -- Highest numeric suffix already used for this type (NULL if none yet).
  SELECT MAX(NULLIF(substring(document_number FROM '(\d+)$'), '')::integer)
  INTO v_max_used
  FROM documents
  WHERE document_type = p_doc_type;

  -- Never go backwards, never collide.
  v_next := GREATEST(v_counter, COALESCE(v_max_used, 0) + 1);

  -- Persist the counter for the matching type = next + 1.
  UPDATE document_settings SET
    invoice_next_number            = CASE WHEN p_doc_type = 'invoice'            THEN v_next + 1 ELSE invoice_next_number END,
    proforma_next_number           = CASE WHEN p_doc_type = 'proforma'           THEN v_next + 1 ELSE proforma_next_number END,
    credit_note_next_number        = CASE WHEN p_doc_type = 'credit_note'        THEN v_next + 1 ELSE credit_note_next_number END,
    packing_slip_next_number       = CASE WHEN p_doc_type = 'packing_slip'       THEN v_next + 1 ELSE packing_slip_next_number END,
    order_confirmation_next_number = CASE WHEN p_doc_type = 'order_confirmation' THEN v_next + 1 ELSE order_confirmation_next_number END,
    payment_reminder_next_number   = CASE WHEN p_doc_type = 'payment_reminder'   THEN v_next + 1 ELSE payment_reminder_next_number END
  WHERE id = v_id;

  RETURN v_prefix || LPAD(v_next::text, 5, '0');
END;
$$;

REVOKE ALL ON FUNCTION get_next_document_number_atomic(document_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_next_document_number_atomic(document_type) TO authenticated;
