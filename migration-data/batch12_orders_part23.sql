WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4003', m.new_id, 'completed'::order_status, 'bank', 10850, 0, 0, 977, 977, 0, 11827, '2025-03-25'::date, NULL, 'WooCommerce #4003', '2025-03-25T07:48:00.000Z'::timestamptz, '2025-03-25T07:48:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'De Luifelbaan'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Excellence Patat 9/9', NULL, 7::decimal, 1550::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4005', m.new_id, 'completed'::order_status, 'bank', 154000, 0, 0, 13860, 13860, 0, 167860, '2025-03-30'::date, NULL, 'WooCommerce #4005', '2025-03-30T09:08:00.000Z'::timestamptz, '2025-03-30T09:08:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Baronie Doner Place'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 88::decimal, 1750::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4006', m.new_id, 'completed'::order_status, 'bank', 22840, 0, 0, 2056, 2056, 0, 24896, '2025-04-01'::date, NULL, 'WooCommerce #4006', '2025-04-01T11:11:00.000Z'::timestamptz, '2025-04-01T11:11:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Oranje Oosterheem'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Chicken Fillet Bites (0.8kg)', '5902082428688', 10::decimal, 599::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 499::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4007', m.new_id, 'completed'::order_status, 'bank', 25020, 0, 0, 2252, 2252, 0, 27272, '2025-04-01'::date, NULL, 'WooCommerce #4007', '2025-04-01T11:34:00.000Z'::timestamptz, '2025-04-01T11:34:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'MD'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 20::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int),
  ('EXTRA CRUNCH PATAT 9/9', NULL, 4::decimal, 1650::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4008', m.new_id, 'completed'::order_status, 'bank', 20973, 0, 0, 1888, 1888, 0, 22861, '2025-03-26'::date, NULL, 'WooCommerce #4008', '2025-03-26T14:55:00.000Z'::timestamptz, '2025-03-26T14:55:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'ZAM ZAM XL'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int),
  ('CEVAPCICI (0.75kg)', '5902082415183', 6::decimal, 621::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4009', m.new_id, 'completed'::order_status, 'bank', 24958, 0, 0, 2246, 2246, 0, 27204, '2025-03-26'::date, NULL, 'WooCommerce #4009', '2025-03-26T15:13:00.000Z'::timestamptz, '2025-03-26T15:13:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Sultan Ahmet BV'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 448::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 8::decimal, 531::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4010', m.new_id, 'completed'::order_status, 'bank', 27750, 0, 0, 2498, 2498, 0, 30248, '2025-03-26'::date, NULL, 'WooCommerce #4010', '2025-03-26T07:54:00.000Z'::timestamptz, '2025-03-26T07:54:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'L.A. American Food'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 12::decimal, 1750::int),
  ('Mix Shoarma (NL)', NULL, 10::decimal, 675::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4012', m.new_id, 'completed'::order_status, 'bank', 47790, 0, 0, 4301, 4301, 0, 52091, '2025-03-26'::date, NULL, 'WooCommerce #4012', '2025-03-26T09:39:00.000Z'::timestamptz, '2025-03-26T09:39:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Horesca Horecavo B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4013', m.new_id, 'completed'::order_status, 'bank', 91358, 0, 0, 8222, 8222, 0, 99580, '2025-03-26'::date, NULL, 'WooCommerce #4013', '2025-03-26T10:17:00.000Z'::timestamptz, '2025-03-26T10:17:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Emigro B.V'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 20::decimal, 531::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 20::decimal, 499::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 20::decimal, 437::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 660::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 20::decimal, 614::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 20::decimal, 614::int),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 22::decimal, 527::int),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 487::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 20::decimal, 385::int)
) AS v(pname, psku, qty, price);

WITH new_ord AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, discount, tax_amount, tax, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-4014', m.new_id, 'completed'::order_status, 'bank', 120801, 0, 0, 10871, 10871, 0, 131672, '2025-03-26'::date, NULL, 'WooCommerce #4014', '2025-03-26T13:30:00.000Z'::timestamptz, '2025-03-26T13:30:00.000Z'::timestamptz
  FROM woo_migration_map m WHERE m.entity_type = 'customer' AND m.woo_id = 'Birlik B.V.'
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total, total)
SELECT o.id, NULL, v.pname, v.psku, 'piece', v.qty, v.price, 0, 0, 9.00, ROUND(v.price * v.qty * 0.09)::int, (v.price * v.qty)::int, (v.price * v.qty)::int
FROM new_ord o, (VALUES
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527::int),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 30::decimal, 531::int),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425::int),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 499::int),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437::int),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 448::int),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 20::decimal, 660::int),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 20::decimal, 572::int),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 20::decimal, 614::int),
  ('CHILI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487::int),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 456::int),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 456::int),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 456::int),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 20::decimal, 385::int),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 456::int),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 20::decimal, 614::int)
) AS v(pname, psku, qty, price);
