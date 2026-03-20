WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-815', m.new_id, 'completed'::order_status, NULL, 111442, 111442, 111442, 0, 0, 0, 0, '2024-05-15'::date, NULL, 'WooCommerce #815', '2024-05-15T10:25:00.000Z'::timestamptz, '2024-05-15T10:25:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'VHC Jongens BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 0::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 0::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 0::int),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 0::int),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 18::decimal, 0::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 10::decimal, 0::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 10::decimal, 0::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 10::decimal, 0::int),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 0::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 0::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 0::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 0::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 0::int),
  ('CHICKEN BURGER  ( 36x70 GR )', NULL, 2::decimal, 0::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 0::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 0::int),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 0::int),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 0::int),
  ('ONION RINGS (0.8kg)', '5902082461883', 10::decimal, 0::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 0::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 0::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 0::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-816', m.new_id, 'completed'::order_status, 'bank', 9300, 0, 0, 837, 837, 0, 10137, '2024-05-16'::date, NULL, 'WooCommerce #816', '2024-05-16T07:05:00.000Z'::timestamptz, '2024-05-16T07:05:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Dönerhuis De Gaarde'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-817', m.new_id, 'completed'::order_status, 'bank', 21000, 0, 0, 1890, 1890, 0, 22890, '2024-05-16'::date, NULL, 'WooCommerce #817', '2024-05-16T07:06:00.000Z'::timestamptz, '2024-05-16T07:06:00.000Z'::timestamptz
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
  SELECT 'WOO-818', m.new_id, 'completed'::order_status, 'bank', 21960, 0, 0, 1977, 1977, 0, 23937, '2024-05-16'::date, NULL, 'WooCommerce #818', '2024-05-16T07:07:00.000Z'::timestamptz, '2024-05-16T07:07:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Baran Broodjeszaak'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 12::decimal, 1550::int),
  ('CHICKEN NUGGETS TEMPURA', NULL, 3::decimal, 550::int),
  ('CRISPY WINGS Hot (0.8kg) horeca', NULL, 3::decimal, 570::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-821', m.new_id, 'completed'::order_status, 'cash', 6200, 0, 0, 558, 558, 0, 6758, '2024-05-16'::date, NULL, 'WooCommerce #821', '2024-05-16T07:15:00.000Z'::timestamptz, '2024-05-16T07:15:00.000Z'::timestamptz
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
  SELECT 'WOO-822', m.new_id, 'completed'::order_status, 'bank', 8852, 0, 0, 797, 797, 0, 9649, '2024-05-16'::date, NULL, 'WooCommerce #822', '2024-05-16T07:16:00.000Z'::timestamptz, '2024-05-16T07:16:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Pizzeria & Grillroom Hawaii Naaldwijk'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438::int),
  ('Excellence Patat', NULL, 2::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-823', m.new_id, 'completed'::order_status, 'cash', 6200, 0, 0, 558, 558, 0, 6758, '2024-05-16'::date, NULL, 'WooCommerce #823', '2024-05-16T07:18:00.000Z'::timestamptz, '2024-05-16T07:18:00.000Z'::timestamptz
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
  SELECT 'WOO-825', m.new_id, 'completed'::order_status, 'bank', 5091, 0, 0, 458, 458, 0, 5549, '2024-05-16'::date, NULL, 'WooCommerce #825', '2024-05-16T09:19:00.000Z'::timestamptz, '2024-05-16T09:19:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Yahya VOF'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 5::decimal, 527::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 4::decimal, 614::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-826', m.new_id, 'completed'::order_status, 'bank', 24648, 0, 0, 2219, 2219, 0, 26867, '2024-05-16'::date, NULL, 'WooCommerce #826', '2024-05-16T10:20:00.000Z'::timestamptz, '2024-05-16T10:20:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Supermarkt Houtwijk'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 5::decimal, 572::int),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 8::decimal, 669::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 14::decimal, 531::int),
  ('MANTI (0.8kg)', '5902082456094', 5::decimal, 468::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 3::decimal, 614::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-827', m.new_id, 'completed'::order_status, 'bank', 24800, 0, 0, 2232, 2232, 0, 27032, '2024-05-16'::date, NULL, 'WooCommerce #827', '2024-05-16T13:20:00.000Z'::timestamptz, '2024-05-16T13:20:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Saray PideHuis'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat', NULL, 16::decimal, 1550::int)
) AS v(pname, psku, qty, price);
