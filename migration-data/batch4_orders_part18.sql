WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1189', m.new_id, 'completed'::order_status, 'bank', 23300, 0, 0, 2097, 2097, 0, 25397, '2024-07-05'::date, NULL, 'WooCommerce #1189', '2024-07-05T06:44:00.000Z'::timestamptz, '2024-07-05T06:44:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dream Kebab Katwijk'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 12::decimal, 1550::int),
  ('FALAFEL', NULL, 10::decimal, 470::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1190', m.new_id, 'completed'::order_status, 'bank', 27950, 0, 0, 2516, 2516, 0, 30466, '2024-07-05'::date, NULL, 'WooCommerce #1190', '2024-07-05T06:45:00.000Z'::timestamptz, '2024-07-05T06:45:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dream Kebab Noordwijkerhout'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550::int),
  ('FALAFEL', NULL, 10::decimal, 470::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1191', m.new_id, 'completed'::order_status, 'bank', 12100, 0, 0, 1089, 1089, 0, 13189, '2024-07-05'::date, NULL, 'WooCommerce #1191', '2024-07-05T06:46:00.000Z'::timestamptz, '2024-07-05T06:46:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Rania'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int),
  ('Chicken Chica Spicy (€5,90)', '5902082462613', 4::decimal, 1475::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1192', m.new_id, 'completed'::order_status, 'bank', 22000, 0, 0, 1980, 1980, 0, 23980, '2024-07-05'::date, NULL, 'WooCommerce #1192', '2024-07-05T06:46:00.000Z'::timestamptz, '2024-07-05T06:46:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Snackbar Onder Den Toren'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 4::decimal, 1750::int),
  ('SLICED AND ROASTED PREMIUM BEEF KEBAB (€7,50)', NULL, 8::decimal, 1875::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1193', m.new_id, 'completed'::order_status, 'bank', 15500, 0, 0, 1395, 1395, 0, 16895, '2024-07-05'::date, NULL, 'WooCommerce #1193', '2024-07-05T06:47:00.000Z'::timestamptz, '2024-07-05T06:47:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Dream Kebab Voorhout'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1195', m.new_id, 'completed'::order_status, 'bank', 23250, 0, 0, 2093, 2093, 0, 25343, '2024-07-05'::date, NULL, 'WooCommerce #1195', '2024-07-05T14:06:00.000Z'::timestamptz, '2024-07-05T14:06:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'San Marina'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1196', m.new_id, 'completed'::order_status, 'bank', 56481, 0, 0, 5084, 5084, 0, 61565, '2024-07-05'::date, NULL, 'WooCommerce #1196', '2024-07-05T14:13:00.000Z'::timestamptz, '2024-07-05T14:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Supermarkt Joud'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 4::decimal, 580::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 4::decimal, 527::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 5::decimal, 487::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 5::decimal, 456::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 4::decimal, 448::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 7::decimal, 385::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 5::decimal, 456::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 5::decimal, 300::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 4::decimal, 572::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 5::decimal, 456::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 5::decimal, 456::int),
  ('CHICKEN KIPCORN ( 0,8 GR ) Horeca', NULL, 5::decimal, 500::int),
  ('FALAFEL (0.8kg)', '5902082432197', 5::decimal, 374::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 3::decimal, 425::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 3::decimal, 482::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 2::decimal, 426::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1197', m.new_id, 'completed'::order_status, 'bank', 12400, 0, 0, 1116, 1116, 0, 13516, '2024-07-06'::date, NULL, 'WooCommerce #1197', '2024-07-06T17:11:00.000Z'::timestamptz, '2024-07-06T17:11:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Nur Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1198', m.new_id, 'completed'::order_status, 'bank', 31490, 0, 0, 2835, 2835, 0, 34325, '2024-07-08'::date, NULL, 'WooCommerce #1198', '2024-07-08T05:42:00.000Z'::timestamptz, '2024-07-08T05:42:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'AG Emmoglu Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 8::decimal, 621::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 374::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-1199', m.new_id, 'completed'::order_status, 'bank', 11650, 0, 0, 1049, 1049, 0, 12699, '2024-07-08'::date, NULL, 'WooCommerce #1199', '2024-07-08T05:58:00.000Z'::timestamptz, '2024-07-08T05:58:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Babas Restaurant'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 3::decimal, 1550::int),
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 4::decimal, 1750::int)
) AS v(pname, psku, qty, price);
