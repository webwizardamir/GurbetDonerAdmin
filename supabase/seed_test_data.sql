-- Test Data for Document Layout Testing
-- This creates a test customer, 30 products, and an order with all items

-- Get the first user ID for created_by fields
DO $$
DECLARE
  v_user_id UUID;
  v_customer_id UUID;
  v_order_id UUID;
  v_category_id UUID;
  v_product_ids UUID[] := ARRAY[]::UUID[];
  v_product_id UUID;
  i INTEGER;
BEGIN
  -- Get a user ID
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Please log in first.';
  END IF;

  -- Create test customer
  INSERT INTO customers (
    company_name,
    contact_person,
    email,
    phone,
    billing_street,
    billing_city,
    billing_postal_code,
    billing_country,
    vat_number,
    created_by
  ) VALUES (
    'Test Groothandel B.V.',
    'Jan de Vries',
    'jan@testgroothandel.nl',
    '+31 20 123 4567',
    'Teststraat 123',
    'Amsterdam',
    '1012 AB',
    'Nederland',
    'NL123456789B01',
    v_user_id
  ) RETURNING id INTO v_customer_id;

  -- Create or get a category
  INSERT INTO categories (name, is_active, created_by)
  VALUES ('Test Producten', true, v_user_id)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_category_id;

  -- Create 30 test products
  FOR i IN 1..30 LOOP
    INSERT INTO products (
      name,
      sku,
      barcode,
      category_id,
      unit_type,
      base_price,
      cost_cents,
      tax_rate,
      stock_quantity,
      track_stock,
      description,
      is_active,
      created_by
    ) VALUES (
      CASE 
        WHEN i <= 10 THEN 'Halal Kip ' || 
          CASE i 
            WHEN 1 THEN 'Filet 1kg'
            WHEN 2 THEN 'Drumsticks 500g'
            WHEN 3 THEN 'Vleugels 1kg'
            WHEN 4 THEN 'Gehakt 500g'
            WHEN 5 THEN 'Worst 400g'
            WHEN 6 THEN 'Kebab 500g'
            WHEN 7 THEN 'Shoarma 1kg'
            WHEN 8 THEN 'Nuggets 300g'
            WHEN 9 THEN 'Schnitzels 4st'
            WHEN 10 THEN 'Burgers 4st'
          END
        WHEN i <= 20 THEN 'Halal Rund ' ||
          CASE i - 10
            WHEN 1 THEN 'Biefstuk 500g'
            WHEN 2 THEN 'Gehakt 500g'
            WHEN 3 THEN 'Stoofvlees 1kg'
            WHEN 4 THEN 'Runderrib 1kg'
            WHEN 5 THEN 'Sucuk 400g'
            WHEN 6 THEN 'Pastirma 200g'
            WHEN 7 THEN 'Lever 500g'
            WHEN 8 THEN 'Ossenhaas 500g'
            WHEN 9 THEN 'Entrecote 400g'
            WHEN 10 THEN 'Tartaar 300g'
          END
        ELSE 'Halal ' ||
          CASE i - 20
            WHEN 1 THEN 'Lam Kotelet 500g'
            WHEN 2 THEN 'Lam Gehakt 500g'
            WHEN 3 THEN 'Lam Schouder 1kg'
            WHEN 4 THEN 'Geit Stoofvlees 1kg'
            WHEN 5 THEN 'Kalkoen Filet 500g'
            WHEN 6 THEN 'Kalkoen Gehakt 500g'
            WHEN 7 THEN 'Eend Heel 2kg'
            WHEN 8 THEN 'Merguez Worst 400g'
            WHEN 9 THEN 'Mixed Grill 1kg'
            WHEN 10 THEN 'BBQ Pakket 2kg'
          END
      END,
      'TST-' || LPAD(i::TEXT, 3, '0'),
      '87' || LPAD(i::TEXT, 11, '0'),
      v_category_id,
      CASE WHEN i % 3 = 0 THEN 'kg' WHEN i % 3 = 1 THEN 'package' ELSE 'piece' END,
      (500 + (i * 50) + (random() * 500)::INTEGER), -- base_price in cents (5-15 EUR range)
      (300 + (i * 30) + (random() * 300)::INTEGER), -- cost in cents
      CASE WHEN i % 5 = 0 THEN 21 ELSE 9 END, -- tax rate
      50 + (random() * 100)::INTEGER, -- stock
      true,
      'Test product ' || i || ' voor document layout testing',
      true,
      v_user_id
    ) RETURNING id INTO v_product_id;
    
    v_product_ids := array_append(v_product_ids, v_product_id);
  END LOOP;

  -- Create order
  INSERT INTO orders (
    customer_id,
    order_date,
    status,
    delivery_notes,
    internal_notes,
    created_by
  ) VALUES (
    v_customer_id,
    CURRENT_DATE,
    'pending_payment',
    'Test bestelling voor document layout. Bezorgen voor 12:00.',
    'Dit is een test order met 30 items om PDF layouts te testen.',
    v_user_id
  ) RETURNING id INTO v_order_id;

  -- Create order items for all 30 products
  FOR i IN 1..30 LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      product_sku,
      unit_type,
      quantity,
      unit_price,
      tax_rate
    )
    SELECT 
      v_order_id,
      p.id,
      p.name,
      p.sku,
      p.unit_type,
      1 + (random() * 5)::INTEGER, -- quantity 1-6
      p.base_price,
      p.tax_rate
    FROM products p
    WHERE p.id = v_product_ids[i];
  END LOOP;

  RAISE NOTICE 'Created test customer: %', v_customer_id;
  RAISE NOTICE 'Created 30 test products';
  RAISE NOTICE 'Created test order: %', v_order_id;
END $$;
