WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3173', m.new_id, 'completed'::order_status, 'bank', 24750, 0, 0, 2228, 2228, 0, 26978, '2025-01-14'::date, NULL, 'WooCommerce #3173', '2025-01-14T07:51:00.000Z'::timestamptz, '2025-01-14T07:51:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Aps Burger'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 15::decimal, 1650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3174', m.new_id, 'completed'::order_status, 'bank', 8250, 0, 0, 743, 743, 0, 8993, '2025-01-14'::date, NULL, 'WooCommerce #3174', '2025-01-14T07:51:00.000Z'::timestamptz, '2025-01-14T07:51:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Alesta Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 5::decimal, 1650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3175', m.new_id, 'completed'::order_status, 'bank', 6600, 0, 0, 594, 594, 0, 7194, '2025-01-14'::date, NULL, 'WooCommerce #3175', '2025-01-14T07:52:00.000Z'::timestamptz, '2025-01-14T07:52:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'MD Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 4::decimal, 1650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3177', m.new_id, 'completed'::order_status, 'bank', 45750, 0, 0, 4118, 4118, 0, 49868, '2025-01-14'::date, NULL, 'WooCommerce #3177', '2025-01-14T07:53:00.000Z'::timestamptz, '2025-01-14T07:53:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizza Aro'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('EXTRA CRUNCH PATAT 9/9', NULL, 5::decimal, 1650::int),
  ('Mix - Shoarma ( Lam- kalkoen) (PL) (€6,50)', NULL, 40::decimal, 650::int),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 20::decimal, 575::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3178', m.new_id, 'completed'::order_status, 'bank', 19500, 0, 0, 1755, 1755, 0, 21255, '2025-01-14'::date, NULL, 'WooCommerce #3178', '2025-01-14T07:54:00.000Z'::timestamptz, '2025-01-14T07:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Karadag Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Mix Shoarma (NL)', NULL, 30::decimal, 650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3179', m.new_id, 'completed'::order_status, 'bank', 9300, 0, 0, 837, 837, 0, 10137, '2025-01-14'::date, NULL, 'WooCommerce #3179', '2025-01-14T07:54:00.000Z'::timestamptz, '2025-01-14T07:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Rania'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3180', m.new_id, 'completed'::order_status, 'bank', 90577, 0, 0, 8152, 8152, 0, 98729, '2025-01-17'::date, NULL, 'WooCommerce #3180', '2025-01-17T08:07:00.000Z'::timestamptz, '2025-01-17T08:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'JINGDONG RETAIL (NETHERLANDS) B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken Fillet Bites 800 GR', '5902082428688', 30::decimal, 599::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 30::decimal, 456::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 456::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 456::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 487::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 374::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('Natural Burger 800 GR', '5902082448723', 8::decimal, 599::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3182', m.new_id, 'completed'::order_status, 'bank', 49076, 0, 0, 4418, 4418, 0, 53494, '2025-01-15'::date, NULL, 'WooCommerce #3182', '2025-01-15T08:23:00.000Z'::timestamptz, '2025-01-15T08:23:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sultan Ahmet BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 8::decimal, 572::int),
  ('Adana 14 X 50 GR (700 GR)', '5902082411611', 10::decimal, 531::int),
  ('MANTI (0.8kg)', '5902082456094', 65::decimal, 299::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3183', m.new_id, 'completed'::order_status, 'cash', 109957, 8250, 8250, 9155, 9155, 0, 110862, '2025-01-15'::date, NULL, 'WooCommerce #3183', '2025-01-15T08:49:00.000Z'::timestamptz, '2025-01-15T08:49:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'JAF EN SLAGERIJ EN TOKO'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 7::decimal, 660::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('Adana 14 X 50 GR (700 GR)', '5902082411611', 10::decimal, 531::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 6::decimal, 669::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 374::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 487::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 456::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 456::int),
  ('EXTRA CRUNCH PATAT 9/9', NULL, 5::decimal, 0::int),
  ('Mix Shoarma (NL)', NULL, 10::decimal, 650::int),
  ('Chicken Fillet Bites 800 GR', '5902082428688', 10::decimal, 599::int),
  ('Natural Burger 800 GR', '5902082448723', 7::decimal, 599::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 456::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-3185', m.new_id, 'completed'::order_status, 'bank', 104254, 0, 0, 9383, 9383, 0, 113637, '2025-01-15'::date, NULL, 'WooCommerce #3185', '2025-01-15T12:30:00.000Z'::timestamptz, '2025-01-15T12:30:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Serdar Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken Fillet Bites 800 GR', '5902082428688', 20::decimal, 599::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 20::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 20::decimal, 614::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 20::decimal, 572::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 660::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 456::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 456::int),
  ('Adana 14 X 50 GR (700 GR)', '5902082411611', 20::decimal, 531::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 448::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669::int)
) AS v(pname, psku, qty, price);
