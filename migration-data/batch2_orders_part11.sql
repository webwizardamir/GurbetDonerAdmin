WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-622', m.new_id, 'completed'::order_status, 'bank', 14250, 0, 0, 1283, 1283, 0, 15533, '2024-04-26'::date, NULL, 'WooCommerce #622', '2024-04-26T08:06:00.000Z'::timestamptz, '2024-04-26T08:06:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Alesta Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int),
  ('Excellence Patat', NULL, 5::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-623', m.new_id, 'completed'::order_status, 'bank', 23250, 0, 0, 2093, 2093, 0, 25343, '2024-04-26'::date, NULL, 'WooCommerce #623', '2024-04-26T09:07:00.000Z'::timestamptz, '2024-04-26T09:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Saray PideHuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-625', m.new_id, 'completed'::order_status, 'bank', 6200, 0, 0, 558, 558, 0, 6758, '2024-04-25'::date, NULL, 'WooCommerce #625', '2024-04-25T16:11:00.000Z'::timestamptz, '2024-04-25T16:11:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Rania'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-627', m.new_id, 'completed'::order_status, 'bank', 129537, 0, 0, 11659, 11659, 0, 141196, '2024-04-25'::date, NULL, 'WooCommerce #627', '2024-04-25T16:21:00.000Z'::timestamptz, '2024-04-25T16:21:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Birlik B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN BURGER (18x70 GR)(Supermarket)', '5902082460145', 2::decimal, 485::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 20::decimal, 300::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 456::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 456::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 456::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 456::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 456::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 4::decimal, 448::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 5::decimal, 527::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 4::decimal, 487::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 374::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 7::decimal, 624::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 660::int),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 603::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-631', m.new_id, 'completed'::order_status, 'bank', 19900, 0, 0, 1791, 1791, 0, 21691, '2024-04-26'::date, NULL, 'WooCommerce #631', '2024-04-26T06:43:00.000Z'::timestamptz, '2024-04-26T06:43:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Dönerhuis De Gaarde'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-632', m.new_id, 'completed'::order_status, NULL, 96000, 0, 0, 20160, 20160, 0, 116160, '2024-04-26'::date, NULL, 'WooCommerce #632', '2024-04-26T07:07:00.000Z'::timestamptz, '2024-04-26T07:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Bakkerij Hesse Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Emmer Frisia Basissaus 25% 10 Liter', NULL, 64::decimal, 1500::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-634', m.new_id, 'completed'::order_status, 'bank', 9345, 0, 0, 842, 842, 0, 10187, '2024-04-27'::date, NULL, 'WooCommerce #634', '2024-04-27T08:11:00.000Z'::timestamptz, '2024-04-27T08:11:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Rotonde Kebab'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('AKCABAAT KOFTE (45*45gr)', NULL, 1::decimal, 1595::int),
  ('Excellence Patat', NULL, 5::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-635', m.new_id, 'completed'::order_status, 'bank', 32269, 0, 0, 2904, 2904, 0, 35173, '2024-04-27'::date, NULL, 'WooCommerce #635', '2024-04-27T10:51:00.000Z'::timestamptz, '2024-04-27T10:51:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Supermarkt Joud'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 4::decimal, 385::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 3::decimal, 487::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 2::decimal, 572::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 2::decimal, 660::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 3::decimal, 456::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 7::decimal, 437::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 4::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 6::decimal, 614::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 3::decimal, 456::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 3::decimal, 300::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 3::decimal, 425::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 2::decimal, 448::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 2::decimal, 482::int),
  ('CHICKEN BURGER  ( 36x70 GR )', NULL, 4::decimal, 1000::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 4::decimal, 487::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 4::decimal, 487::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 2::decimal, 456::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 3::decimal, 426::int),
  ('FALAFEL (0.8kg)', '5902082432197', 2::decimal, 374::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-637', m.new_id, 'completed'::order_status, 'bank', 5900, 0, 0, 531, 531, 0, 6431, '2024-04-27'::date, NULL, 'WooCommerce #637', '2024-04-27T13:03:00.000Z'::timestamptz, '2024-04-27T13:03:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Rania'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken Chica Spicy (€5,90)', '5902082462613', 4::decimal, 1475::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-639', m.new_id, 'completed'::order_status, 'bank', 24800, 0, 0, 2232, 2232, 0, 27032, '2024-04-28'::date, NULL, 'WooCommerce #639', '2024-04-28T12:53:00.000Z'::timestamptz, '2024-04-28T12:53:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'HerenHofEethuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 16::decimal, 1550::int)
) AS v(pname, psku, qty, price);
