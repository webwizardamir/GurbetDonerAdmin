WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-526', m.new_id, 'completed'::order_status, 'bank', 15500, 0, 0, 1395, 1395, 0, 16895, '2024-04-15'::date, NULL, 'WooCommerce #526', '2024-04-15T06:53:00.000Z'::timestamptz, '2024-04-15T06:53:00.000Z'::timestamptz
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
  SELECT 'WOO-527', m.new_id, 'completed'::order_status, NULL, 15500, 0, 0, 1395, 1395, 0, 16895, '2024-04-15'::date, NULL, 'WooCommerce #527', '2024-04-15T06:54:00.000Z'::timestamptz, '2024-04-15T06:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Dönerhuis De Gaarde'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-528', m.new_id, 'completed'::order_status, 'cash', 6200, 0, 0, 558, 558, 0, 6758, '2024-04-15'::date, NULL, 'WooCommerce #528', '2024-04-15T06:57:00.000Z'::timestamptz, '2024-04-15T06:57:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Lekker Jammie'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-529', m.new_id, 'completed'::order_status, NULL, 23778, 0, 0, 2142, 2142, 0, 25920, '2024-04-15'::date, NULL, 'WooCommerce #529', '2024-04-15T06:57:00.000Z'::timestamptz, '2024-04-15T06:57:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Yahya VOF'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 575::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 575::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-531', m.new_id, 'refunded'::order_status, NULL, 108004, 0, 0, 9724, 9724, 0, 117728, '2024-04-15'::date, NULL, 'WooCommerce #531', '2024-04-15T07:15:00.000Z'::timestamptz, '2024-04-15T07:15:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'EKO Supermarkt'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 0::decimal, 554::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 0::decimal, 500::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 0::decimal, 575::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 0::decimal, 590::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 0::decimal, 390::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 0::decimal, 590::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 0::decimal, 590::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 0::decimal, 380::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 0::decimal, 575::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 0::decimal, 600::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 0::decimal, 680::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 0::decimal, 700::int),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 0::decimal, 548::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 0::decimal, 548::int),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 0::decimal, 664::int),
  ('FALAFEL (0.8kg)', '5902082432197', 0::decimal, 405::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 0::decimal, 482::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 0::decimal, 575::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 0::decimal, 575::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-533', m.new_id, 'completed'::order_status, 'bank', 28000, 0, 0, 2520, 2520, 0, 30520, '2024-04-15'::date, NULL, 'WooCommerce #533', '2024-04-15T08:55:00.000Z'::timestamptz, '2024-04-15T08:55:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Jacks corner'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 16::decimal, 1750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-534', m.new_id, 'completed'::order_status, NULL, 31000, 0, 0, 2790, 2790, 0, 33790, '2024-04-15'::date, NULL, 'WooCommerce #534', '2024-04-15T12:37:00.000Z'::timestamptz, '2024-04-15T12:37:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'San Marina'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-535', m.new_id, 'completed'::order_status, 'bank', 15500, 0, 0, 1395, 1395, 0, 16895, '2024-04-16'::date, NULL, 'WooCommerce #535', '2024-04-16T06:24:00.000Z'::timestamptz, '2024-04-16T06:24:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Luifelbaan'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-536', m.new_id, 'completed'::order_status, NULL, 15500, 0, 0, 1395, 1395, 0, 16895, '2024-04-16'::date, NULL, 'WooCommerce #536', '2024-04-16T07:39:00.000Z'::timestamptz, '2024-04-16T07:39:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Saray PideHuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-537', m.new_id, 'completed'::order_status, NULL, 9300, 0, 0, 837, 837, 0, 10137, '2024-04-16'::date, NULL, 'WooCommerce #537', '2024-04-16T07:39:00.000Z'::timestamptz, '2024-04-16T07:39:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Massada Roelofarendsveen'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);
