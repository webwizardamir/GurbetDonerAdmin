WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1012', m.new_id, 'completed'::order_status, 'bank', 31000, 0, 0, 2790, 2790, 0, 33790, '2024-06-11'::date, NULL, 'WooCommerce #1012', '2024-06-11T07:17:00.000Z'::timestamptz, '2024-06-11T07:17:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Saray PideHuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1013', m.new_id, 'completed'::order_status, 'bank', 6200, 0, 0, 558, 558, 0, 6758, '2024-06-11'::date, NULL, 'WooCommerce #1013', '2024-06-11T07:17:00.000Z'::timestamptz, '2024-06-11T07:17:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'MD Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1014', m.new_id, 'completed'::order_status, 'bank', 23732, 0, 0, 2136, 2136, 0, 25868, '2024-06-11'::date, NULL, 'WooCommerce #1014', '2024-06-11T11:47:00.000Z'::timestamptz, '2024-06-11T11:47:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Oranje Oosterheem'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 7::decimal, 487::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 8::decimal, 487::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 7::decimal, 572::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 3::decimal, 527::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 4::decimal, 660::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 6::decimal, 482::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1015', m.new_id, 'completed'::order_status, 'cash', 4650, 0, 0, 419, 419, 0, 5069, '2024-06-12'::date, NULL, 'WooCommerce #1015', '2024-06-12T14:41:00.000Z'::timestamptz, '2024-06-12T14:41:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Lekker Jammie'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 3::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1018', m.new_id, 'completed'::order_status, 'bank', 33327, 0, 0, 3000, 3000, 0, 36327, '2024-06-12'::date, NULL, 'WooCommerce #1018', '2024-06-12T09:11:00.000Z'::timestamptz, '2024-06-12T09:11:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Mirom supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 4::decimal, 456::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 3::decimal, 456::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 0::decimal, 527::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 6::decimal, 385::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 5::decimal, 487::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 3::decimal, 487::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 6::decimal, 614::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1021', m.new_id, 'completed'::order_status, 'cash', 26533, 0, 0, 2389, 2389, 0, 28922, '2024-06-12'::date, NULL, 'WooCommerce #1021', '2024-06-12T10:34:00.000Z'::timestamptz, '2024-06-12T10:34:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 5::decimal, 614::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 6::decimal, 487::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 621::int),
  ('CHICKEN BURGER (18x70 GR)(Supermarket)', '5902082460145', 4::decimal, 485::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 2::decimal, 482::int),
  ('FALAFEL (0.8kg)', '5902082432197', 4::decimal, 374::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 4::decimal, 385::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 3::decimal, 527::int),
  ('CHICKEN KIPCORN ( 0,8 GR ) Horeca', NULL, 3::decimal, 500::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1022', m.new_id, 'completed'::order_status, 'cash', 34541, 0, 0, 3110, 3110, 0, 37651, '2024-06-12'::date, NULL, 'WooCommerce #1022', '2024-06-12T12:46:00.000Z'::timestamptz, '2024-06-12T12:46:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Hoornes Supermarkt en Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 6::decimal, 487::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 4::decimal, 669::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 6::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 6::decimal, 614::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 3::decimal, 572::int),
  ('MANTI (0.8kg)', '5902082456094', 9::decimal, 468::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 4::decimal, 527::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 7::decimal, 487::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1024', m.new_id, 'completed'::order_status, 'cash', 6200, 0, 0, 558, 558, 0, 6758, '2024-06-12'::date, NULL, 'WooCommerce #1024', '2024-06-12T15:59:00.000Z'::timestamptz, '2024-06-12T15:59:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Serar''s'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1025', m.new_id, 'completed'::order_status, 'bank', 21000, 0, 0, 1890, 1890, 0, 22890, '2024-06-13'::date, NULL, 'WooCommerce #1025', '2024-06-13T07:26:00.000Z'::timestamptz, '2024-06-13T07:26:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Jacks corner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 12::decimal, 1750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1026', m.new_id, 'completed'::order_status, 'bank', 7750, 0, 0, 698, 698, 0, 8448, '2024-06-13'::date, NULL, 'WooCommerce #1026', '2024-06-13T07:33:00.000Z'::timestamptz, '2024-06-13T07:33:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Dönerhuis De Gaarde'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550::int)
) AS v(pname, psku, qty, price);
