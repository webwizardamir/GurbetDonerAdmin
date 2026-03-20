WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4792', m.new_id, 'completed'::order_status, 'bank', 16500, 0, 0, 1485, 1485, 0, 17985, '2025-05-21'::date, NULL, 'WooCommerce #4792', '2025-05-21T06:55:00.000Z'::timestamptz, '2025-05-21T06:55:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Gunaydin Sulu Yemek Restaurant'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 10::decimal, 1650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4793', m.new_id, 'completed'::order_status, 'bank', 21000, 0, 0, 1890, 1890, 0, 22890, '2025-05-21'::date, NULL, 'WooCommerce #4793', '2025-05-21T06:55:00.000Z'::timestamptz, '2025-05-21T06:55:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij De Kampioen'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB', '5902082460350', 30::decimal, 700::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4794', m.new_id, 'completed'::order_status, 'bank', 16150, 0, 0, 1454, 1454, 0, 17604, '2025-05-23'::date, NULL, 'WooCommerce #4794', '2025-05-23T06:56:00.000Z'::timestamptz, '2025-05-23T06:56:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Serar''s'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM BEEF KEBAB', NULL, 2::decimal, 1875::int),
  ('Excellence Patat 9/9', NULL, 8::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4837', m.new_id, 'completed'::order_status, 'bank', 87021, 0, 0, 7832, 7832, 0, 94853, '2025-05-21'::date, NULL, 'WooCommerce #4837', '2025-05-21T09:41:00.000Z'::timestamptz, '2025-05-21T09:41:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Emigro B.V'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 30::decimal, 385::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 30::decimal, 572::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 487::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 18::decimal, 527::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 20::decimal, 614::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 20::decimal, 614::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 9::decimal, 499::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4839', m.new_id, 'completed'::order_status, 'bank', 22000, 0, 0, 1980, 1980, 0, 23980, '2025-05-22'::date, NULL, 'WooCommerce #4839', '2025-05-22T15:56:00.000Z'::timestamptz, '2025-05-22T15:56:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Rania'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 6::decimal, 1550::int),
  ('Kipfile Blokjes (NL)', NULL, 20::decimal, 635::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4841', m.new_id, 'completed'::order_status, 'cash', 272064, 0, 0, 0, 0, 0, 272064, '2025-05-22'::date, NULL, 'WooCommerce #4841', '2025-05-22T06:25:00.000Z'::timestamptz, '2025-05-22T06:25:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Meze Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Cordon Bleu ( Groothandel )', NULL, 80::decimal, 570::int),
  ('Adana Kebab 600 GR (Groothandel)', NULL, 36::decimal, 750::int),
  ('Chicken Nuggets Zoogets ( Groothandel )', NULL, 48::decimal, 510::int)
) AS v(pname, psku, qty, price);
