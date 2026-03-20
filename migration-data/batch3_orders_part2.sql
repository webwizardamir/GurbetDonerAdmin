WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-721', m.new_id, 'completed'::order_status, 'bank', 42701, 0, 0, 3844, 3844, 0, 46545, '2024-05-03'::date, NULL, 'WooCommerce #721', '2024-05-03T10:22:00.000Z'::timestamptz, '2024-05-03T10:22:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'EKO Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 456::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 456::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 5::decimal, 660::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 6::decimal, 669::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 5::decimal, 448::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-722', m.new_id, 'completed'::order_status, 'bank', 24707, 0, 0, 2222, 2222, 0, 26929, '2024-05-03'::date, NULL, 'WooCommerce #722', '2024-05-03T12:35:00.000Z'::timestamptz, '2024-05-03T12:35:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Can Market'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 5::decimal, 456::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 3::decimal, 527::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 3::decimal, 572::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 4::decimal, 426::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 456::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 6::decimal, 456::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-723', m.new_id, 'completed'::order_status, 'bank', 19265, 0, 0, 1733, 1733, 0, 20998, '2024-05-03'::date, NULL, 'WooCommerce #723', '2024-05-03T16:01:00.000Z'::timestamptz, '2024-05-03T16:01:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'MD Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 5::decimal, 572::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 3::decimal, 660::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 6::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 5::decimal, 614::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 4::decimal, 456::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 7::decimal, 456::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 5::decimal, 531::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-724', m.new_id, 'completed'::order_status, 'bank', 12305, 6153, 6153, 552, 552, 0, 6704, '2024-05-03'::date, NULL, 'WooCommerce #724', '2024-05-03T18:20:00.000Z'::timestamptz, '2024-05-03T18:20:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Oranje Oosterheem'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 2::decimal, 286::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 6::decimal, 244::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 5::decimal, 241::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 8::decimal, 266::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 3::decimal, 263::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-736', m.new_id, 'completed'::order_status, 'bank', 15000, 0, 0, 1350, 1350, 0, 16350, '2024-05-03'::date, NULL, 'WooCommerce #736', '2024-05-03T18:38:00.000Z'::timestamptz, '2024-05-03T18:38:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Nur Bakkerij'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1500::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-739', m.new_id, 'completed'::order_status, 'bank', 35000, 0, 0, 3150, 3150, 0, 38150, '2024-05-03'::date, NULL, 'WooCommerce #739', '2024-05-03T19:38:00.000Z'::timestamptz, '2024-05-03T19:38:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Jacks corner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 20::decimal, 1750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-743', m.new_id, 'completed'::order_status, 'bank', 61665, 0, 0, 5552, 5552, 0, 67217, '2024-05-04'::date, NULL, 'WooCommerce #743', '2024-05-04T09:30:00.000Z'::timestamptz, '2024-05-04T09:30:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'AG Emmoglu Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 487::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 5::decimal, 660::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 1::decimal, 603::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 448::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-745', m.new_id, 'completed'::order_status, 'bank', 12400, 0, 0, 1116, 1116, 0, 13516, '2024-05-06'::date, NULL, 'WooCommerce #745', '2024-05-06T06:31:00.000Z'::timestamptz, '2024-05-06T06:31:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sohbet'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-746', m.new_id, 'completed'::order_status, 'bank', 6500, 0, 0, 585, 585, 0, 7085, '2024-05-06'::date, NULL, 'WooCommerce #746', '2024-05-06T06:35:00.000Z'::timestamptz, '2024-05-06T06:35:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria Roomburg'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-747', m.new_id, 'completed'::order_status, 'bank', 17320, 0, 0, 1560, 1560, 0, 18880, '2024-05-06'::date, NULL, 'WooCommerce #747', '2024-05-06T06:36:00.000Z'::timestamptz, '2024-05-06T06:36:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Dönerhuis De Gaarde'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550::int),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475::int),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 1::decimal, 1595::int),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625::int)
) AS v(pname, psku, qty, price);
