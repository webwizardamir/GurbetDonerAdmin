-- Test Data for Document Layout Testing
-- Creates: 1 customer, 30 products, 1 order with 30 items

DO $$
DECLARE
  v_user_id UUID;
  v_customer_id UUID;
  v_order_id UUID;
  v_category_id UUID;
  v_product_id UUID;
  v_base_price INTEGER;
  v_cost_cents INTEGER;
  v_quantity INTEGER;
  v_unit_type unit_type;
  v_unit_type_text TEXT;
  v_tax_rate INTEGER;
  v_product_name TEXT;
  v_sku TEXT;
  i INTEGER;
BEGIN
  -- Get a user ID (first authenticated user)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found - skipping test data creation';
    RETURN;
  END IF;

  -- Check if test customer already exists
  SELECT id INTO v_customer_id FROM customers WHERE company_name = 'Test Groothandel B.V.' LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    RAISE NOTICE 'Test data already exists - skipping';
    RETURN;
  END IF;

  -- Create test customer
  INSERT INTO customers (
    company_name, contact_person, email, phone,
    billing_street, billing_city, billing_postal_code, billing_country,
    vat_number, created_by
  ) VALUES (
    'Test Groothandel B.V.', 'Jan de Vries', 'jan@testgroothandel.nl', '+31 20 123 4567',
    'Teststraat 123', 'Amsterdam', '1012 AB', 'Nederland',
    'NL123456789B01', v_user_id
  ) RETURNING id INTO v_customer_id;

  -- Create or get test category
  SELECT id INTO v_category_id FROM categories WHERE name = 'Test Producten' LIMIT 1;

  IF v_category_id IS NULL THEN
    INSERT INTO categories (name, slug, is_active)
    VALUES ('Test Producten', 'test-producten', true)
    RETURNING id INTO v_category_id;
  END IF;

  -- Product names array simulation using CASE
  FOR i IN 1..30 LOOP
    -- Determine product name
    v_product_name := CASE i
      WHEN 1 THEN 'Halal Kip Filet 1kg'
      WHEN 2 THEN 'Halal Kip Drumsticks 500g'
      WHEN 3 THEN 'Halal Kip Vleugels 1kg'
      WHEN 4 THEN 'Halal Kip Gehakt 500g'
      WHEN 5 THEN 'Halal Kip Worst 400g'
      WHEN 6 THEN 'Halal Kip Kebab 500g'
      WHEN 7 THEN 'Halal Kip Shoarma 1kg'
      WHEN 8 THEN 'Halal Kip Nuggets 300g'
      WHEN 9 THEN 'Halal Kip Schnitzels 4st'
      WHEN 10 THEN 'Halal Kip Burgers 4st'
      WHEN 11 THEN 'Halal Rund Biefstuk 500g'
      WHEN 12 THEN 'Halal Rund Gehakt 500g'
      WHEN 13 THEN 'Halal Rund Stoofvlees 1kg'
      WHEN 14 THEN 'Halal Rund Rib 1kg'
      WHEN 15 THEN 'Halal Rund Sucuk 400g'
      WHEN 16 THEN 'Halal Rund Pastirma 200g'
      WHEN 17 THEN 'Halal Rund Lever 500g'
      WHEN 18 THEN 'Halal Rund Ossenhaas 500g'
      WHEN 19 THEN 'Halal Rund Entrecote 400g'
      WHEN 20 THEN 'Halal Rund Tartaar 300g'
      WHEN 21 THEN 'Halal Lam Kotelet 500g'
      WHEN 22 THEN 'Halal Lam Gehakt 500g'
      WHEN 23 THEN 'Halal Lam Schouder 1kg'
      WHEN 24 THEN 'Halal Geit Stoofvlees 1kg'
      WHEN 25 THEN 'Halal Kalkoen Filet 500g'
      WHEN 26 THEN 'Halal Kalkoen Gehakt 500g'
      WHEN 27 THEN 'Halal Eend Heel 2kg'
      WHEN 28 THEN 'Halal Merguez Worst 400g'
      WHEN 29 THEN 'Halal Mixed Grill 1kg'
      WHEN 30 THEN 'Halal BBQ Pakket 2kg'
    END;

    v_sku := 'TST-' || LPAD(i::TEXT, 3, '0');
    v_unit_type_text := CASE WHEN i % 3 = 0 THEN 'kg' WHEN i % 3 = 1 THEN 'package' ELSE 'piece' END;
    v_unit_type := v_unit_type_text::unit_type;
    v_base_price := 500 + (i * 50) + (floor(random() * 500))::INTEGER;
    v_cost_cents := 300 + (i * 30) + (floor(random() * 300))::INTEGER;
    v_tax_rate := CASE WHEN i % 5 = 0 THEN 21 ELSE 9 END;

    INSERT INTO products (
      name, sku, barcode, category_id, unit_type,
      base_price, cost_cents, tax_rate,
      stock_quantity, track_stock, description, is_active, created_by
    ) VALUES (
      v_product_name,
      v_sku,
      '87' || LPAD(i::TEXT, 11, '0'),
      v_category_id,
      v_unit_type,
      v_base_price,
      v_cost_cents,
      v_tax_rate,
      50 + (floor(random() * 100))::INTEGER,
      true,
      'Test product ' || i || ' voor document layout testing',
      true,
      v_user_id
    ) RETURNING id INTO v_product_id;
  END LOOP;

  -- Create order (generate order number manually since trigger may not exist)
  INSERT INTO orders (
    customer_id, order_date, status, order_number,
    delivery_notes, internal_notes, created_by
  ) VALUES (
    v_customer_id,
    CURRENT_DATE,
    'pending_payment',
    'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) + 1 FROM orders WHERE order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%')::TEXT, 5, '0'),
    'Test bestelling voor document layout. Bezorgen voor 12:00.',
    'Dit is een test order met 30 items om PDF layouts te testen.',
    v_user_id
  ) RETURNING id INTO v_order_id;

  -- Create order items for all test products
  FOR i IN 1..30 LOOP
    v_product_name := CASE i
      WHEN 1 THEN 'Halal Kip Filet 1kg'
      WHEN 2 THEN 'Halal Kip Drumsticks 500g'
      WHEN 3 THEN 'Halal Kip Vleugels 1kg'
      WHEN 4 THEN 'Halal Kip Gehakt 500g'
      WHEN 5 THEN 'Halal Kip Worst 400g'
      WHEN 6 THEN 'Halal Kip Kebab 500g'
      WHEN 7 THEN 'Halal Kip Shoarma 1kg'
      WHEN 8 THEN 'Halal Kip Nuggets 300g'
      WHEN 9 THEN 'Halal Kip Schnitzels 4st'
      WHEN 10 THEN 'Halal Kip Burgers 4st'
      WHEN 11 THEN 'Halal Rund Biefstuk 500g'
      WHEN 12 THEN 'Halal Rund Gehakt 500g'
      WHEN 13 THEN 'Halal Rund Stoofvlees 1kg'
      WHEN 14 THEN 'Halal Rund Rib 1kg'
      WHEN 15 THEN 'Halal Rund Sucuk 400g'
      WHEN 16 THEN 'Halal Rund Pastirma 200g'
      WHEN 17 THEN 'Halal Rund Lever 500g'
      WHEN 18 THEN 'Halal Rund Ossenhaas 500g'
      WHEN 19 THEN 'Halal Rund Entrecote 400g'
      WHEN 20 THEN 'Halal Rund Tartaar 300g'
      WHEN 21 THEN 'Halal Lam Kotelet 500g'
      WHEN 22 THEN 'Halal Lam Gehakt 500g'
      WHEN 23 THEN 'Halal Lam Schouder 1kg'
      WHEN 24 THEN 'Halal Geit Stoofvlees 1kg'
      WHEN 25 THEN 'Halal Kalkoen Filet 500g'
      WHEN 26 THEN 'Halal Kalkoen Gehakt 500g'
      WHEN 27 THEN 'Halal Eend Heel 2kg'
      WHEN 28 THEN 'Halal Merguez Worst 400g'
      WHEN 29 THEN 'Halal Mixed Grill 1kg'
      WHEN 30 THEN 'Halal BBQ Pakket 2kg'
    END;

    v_sku := 'TST-' || LPAD(i::TEXT, 3, '0');
    v_unit_type_text := CASE WHEN i % 3 = 0 THEN 'kg' WHEN i % 3 = 1 THEN 'package' ELSE 'piece' END;
    v_base_price := 500 + (i * 50) + (floor(random() * 500))::INTEGER;
    v_tax_rate := CASE WHEN i % 5 = 0 THEN 21 ELSE 9 END;
    v_quantity := 1 + (floor(random() * 5))::INTEGER;

    INSERT INTO order_items (
      order_id, product_id, product_name, product_sku,
      unit_type, quantity, unit_price, tax_rate, total, line_total, tax_amount
    )
    SELECT
      v_order_id,
      p.id,
      v_product_name,
      v_sku,
      v_unit_type_text,
      v_quantity,
      v_base_price,
      v_tax_rate,
      (v_quantity * v_base_price), -- total
      (v_quantity * v_base_price) + ((v_quantity * v_base_price * v_tax_rate) / 100), -- line_total with tax
      ((v_quantity * v_base_price * v_tax_rate) / 100) -- tax_amount
    FROM products p
    WHERE p.sku = v_sku
    LIMIT 1;
  END LOOP;

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Customer: Test Groothandel B.V.';
  RAISE NOTICE 'Products: 30 items';
  RAISE NOTICE 'Order ID: %', v_order_id;
END $$;
