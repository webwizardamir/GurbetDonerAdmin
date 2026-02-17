-- Fix generate_order_number to use MAX instead of COUNT
-- COUNT breaks when orders are deleted (produces duplicate numbers)
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year TEXT;
  v_max INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Use MAX to avoid conflicts when orders are deleted
  SELECT COALESCE(MAX(SUBSTRING(order_number FROM 'ORD-' || v_year || '-(\d+)')::integer), 0) + 1
  INTO v_max
  FROM orders
  WHERE order_number LIKE 'ORD-' || v_year || '-%';

  v_number := 'ORD-' || v_year || '-' || LPAD(v_max::TEXT, 5, '0');

  RETURN v_number;
END;
$function$;
