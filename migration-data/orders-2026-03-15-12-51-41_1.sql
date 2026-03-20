-- WooCommerce Import: orders-2026-03-15-12-51-41_1
-- Generated: 2026-03-15T12:08:09.290Z
-- Orders: 115, Customers: 56

BEGIN;

-- Mapping table for WooCommerce IDs to new UUIDs
CREATE TABLE IF NOT EXISTS woo_migration_map (
  entity_type TEXT NOT NULL,
  woo_id TEXT NOT NULL,
  new_id UUID NOT NULL,
  UNIQUE(entity_type, woo_id)
);

-- ========== CUSTOMERS ==========
-- Customer 1: Orange Food Group B.V.
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Orange Food Group B.V.', NULL, 'ssrzkn@gmail.com', NULL, 'Doctor Wiardi Beckmansingel 13', 'Vlaardingen', '3132CL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Orange Food Group B.V.', id FROM new_cust;

-- Customer 2: Drean Kebab 1
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Drean Kebab 1', NULL, 'dream@kebab.nl', NULL, 'Herenstraat 88A', 'Voorhout', '2215KK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Drean Kebab 1', id FROM new_cust;

-- Customer 3: Dream Kebab Katwijk
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dream Kebab Katwijk', 'Dream Kebab Katwijk', 'Dreamkebab@katwijk.nl', NULL, 'Taatedam 2', 'Katwijk aan zee', '2225 BN', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Dreamkebab@katwijk.nl', id FROM new_cust;

-- Customer 4: Dream Kebab Noordwijkerhout
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dream Kebab Noordwijkerhout', 'Dream Kebab Noordwijkerhout', 'dreamkebab@noordwijkerhour.nl', NULL, 'Zeestraat 4', 'Noordwijkerhout', '2211XG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'dreamkebab@noordwijkerhour.nl', id FROM new_cust;

-- Customer 5: Sohbet bbq cafe Restaurant
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Sohbet bbq cafe Restaurant', 'Sohbet bbq cafe Restaurant', 'Sohbet@denhaag.nl', NULL, 'Calandkade 168', 'Den Haag', '2521AA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Sohbet@denhaag.nl', id FROM new_cust;

-- Customer 6: Bakkerij Hesse Place
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Bakkerij Hesse Place', 'Bakkerij Hesse Place', 'info@bakkerijhesseplace.nl', NULL, 'Hesseplaats 71', 'Rotterdam', '3069EA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'info@bakkerijhesseplace.nl', id FROM new_cust;

-- Customer 7: Ak-AL Eethuis
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ak-AL Eethuis', 'Ak-AL Eethuis', 'akal-eethuis-alpenaanderijn@hotmail.com', NULL, 'HerenHof 287', 'Alpen aan den Rijn', '2402DL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'akal-eethuis-alpenaanderijn@hotmail.com', id FROM new_cust;

-- Customer 8: Salama Doner Pizza
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Salama Doner Pizza', 'Salama Doner Pizza', 'Salama@gmail.com', NULL, 'Stevensbloem 7', 'Leiden', '2331JA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Salama@gmail.com', id FROM new_cust;

-- Customer 9: Ons Bakkertje de veen
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ons Bakkertje de veen', 'Ons Bakkertje de veen', 'Ons@gmail.com', NULL, 'Noordeinde 13', 'Roelofarendsveen', '2371CM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Ons@gmail.com', id FROM new_cust;

-- Customer 10: Pizzeria Roomburg
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizzeria Roomburg', 'Pizzeria Roomburg', 'PizzeriaRoomburg@gmail.com', NULL, 'IJsselkade 43', 'Leiden', '2314VM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzeriaRoomburg@gmail.com', id FROM new_cust;

-- Customer 11: Pizza Bella Maria
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza Bella Maria', 'Pizza Bella Maria', 'Pizzabellamaria@gmail.com', NULL, 'Van Zeggelenlaan 81', 'Den Haag', '2524 AC', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Pizzabellamaria@gmail.com', id FROM new_cust;

-- Customer 12: Ak-Mir Doner
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ak-Mir Doner', 'Ak-Mir Doner', 'akmirdoner@gmail.com', NULL, 'Korevaarstraat 4', 'Leiden', '2311 JS', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'akmirdoner@gmail.com', id FROM new_cust;

-- Customer 13: Bakkerij de Hazelaar
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Bakkerij de Hazelaar', 'Bakkerij de Hazelaar', 'BakkerijdeHazelaar@gmail.com', NULL, 'Hazelaarstraat 10', 'Woerden', '3442 EN', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'BakkerijdeHazelaar@gmail.com', id FROM new_cust;

-- Customer 14: Hoornes Supermarkt en Bakkerij
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Hoornes Supermarkt en Bakkerij', 'Hoornes Supermarkt en Bakkerij', 'HoornesSupermarktenBakkerij@gmail.com', NULL, 'Hoorneslaan 329', 'Katwijk aan Zee', '2221 GA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'HoornesSupermarktenBakkerij@gmail.com', id FROM new_cust;

-- Customer 15: Massada Roelofarendsveen
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Massada Roelofarendsveen', 'Massada Roelofarendsveen', 'MassadaRoelofarendsveen@gmail.com', NULL, 'Noordplein 3', 'Roelofarendsveen', '2371 DA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'MassadaRoelofarendsveen@gmail.com', id FROM new_cust;

-- Customer 16: Indoor SpeelParadijs ZuiderPark
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Indoor SpeelParadijs ZuiderPark', 'Indoor SpeelParadijs ZuiderPark', 'INDOORSPEELPARADIJSZUIDERPARK@gmail.com', NULL, 'Mr. P. Droogleever Fortuynweg 79', 'Den Haag', '2533SP', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'INDOORSPEELPARADIJSZUIDERPARK@gmail.com', id FROM new_cust;

-- Customer 17: De Gouden Wok Zuiderpark
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('De Gouden Wok Zuiderpark', 'De Gouden Wok Zuiderpark', 'DeGoudenWokZuiderpark@gmail.com', NULL, 'Meester P. Droogleever Fortuynweg 69', 'Den Haag', '2533 SP', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'DeGoudenWokZuiderpark@gmail.com', id FROM new_cust;

-- Customer 18: Pizzeria & Grillroom Hawaii Naaldwijk
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizzeria & Grillroom Hawaii Naaldwijk', 'Pizzeria & Grillroom Hawaii Naaldwijk', 'PizzeriaGrillroomHawaiiNaaldwijk@gmail.com', NULL, 'Pr. Julianastraat 22', 'Naaldwijk', '2671EK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzeriaGrillroomHawaiiNaaldwijk@gmail.com', id FROM new_cust;

-- Customer 19: De Rotonde Kebab
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('De Rotonde Kebab', 'De Rotonde Kebab', 'DeRotondeKebab@gmail.com', NULL, 'Slotermeerlaan 3', 'Amsterdam', '1064GX', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'DeRotondeKebab@gmail.com', id FROM new_cust;

-- Customer 20: Pizza BellaDonna
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza BellaDonna', 'Pizza BellaDonna', 'PizzaBellaDonna@gmail.com', NULL, 'Lijnbaan 293', 'Zoetermeer', '2728AH', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzaBellaDonna@gmail.com', id FROM new_cust;

-- Customer 21: Alesta Food
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Alesta Food', 'Alesta Food', 'AlestaFood@gmail.com', NULL, 'Ambachtsherenpad 12, 2722 BS Zoetermeer', 'Zoetermeer', '2722 BS', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'AlestaFood@gmail.com', id FROM new_cust;

-- Customer 22: Karadag Food
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Karadag Food', 'Karadag Food', 'KaradagFood@gmail.com', NULL, 'Meeuwenveld 16', 'Zoetermeer', '2727 AK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'KaradagFood@gmail.com', id FROM new_cust;

-- Customer 23: Flames
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Flames', 'Flames', 'Flameshoofdorp@gmail.com', NULL, 'Almkerkplein 2A', 'Hoofddorp', '2134 DR', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Flameshoofdorp@gmail.com', id FROM new_cust;

-- Customer 24: La Lupa
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('La Lupa', 'La Lupa', 'Lalupa@live.nl', NULL, 'Prins Bernhardstraat 58', 'Koudekerk aan den Rijn', '2396 GM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Lalupa@live.nl', id FROM new_cust;

-- Customer 25: Ramses
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ramses', 'Ramses', 'ramses@gmail.com', NULL, 'Schoolstraat 30', 'Den Haag', '2511 AX', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'ramses@gmail.com', id FROM new_cust;

-- Customer 26: Eethuis Lage Veld
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Eethuis Lage Veld', 'Eethuis Lage Veld', 'Lageveld@gmail.com', NULL, 'Parijsplein 12', 'Den Haag', '2548 VL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Lageveld@gmail.com', id FROM new_cust;

-- Customer 27: Jacks corner
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Jacks corner', 'Jacks corner', 'Jackscorner@gmail.com', NULL, 'Leemansplein 544', 'Den Haag', '2521 EJ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Jackscorner@gmail.com', id FROM new_cust;

-- Customer 28: Dream Kebab Voorhout
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dream Kebab Voorhout', 'Dream Kebab Voorhout', 'dream@kebab.nl', NULL, 'Herenstraat 88A', 'Voorhout', '2215KK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'dream@kebab.nl', id FROM new_cust;

-- Customer 29: Pizza Aro
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza Aro', 'Pizza Aro', 'PizzaAro@gmail.com', NULL, 'Wattstraat 7A', 'Zoetermeer', '2723 PZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzaAro@gmail.com', id FROM new_cust;

-- Customer 30: Keizer Snacks
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Keizer Snacks', 'Keizer Snacks', 'keizersnacks@gmail.com', NULL, 'Keizerstraat 356a', 'Den Haag', '2586 SH', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'keizersnacks@gmail.com', id FROM new_cust;

-- Customer 31: Doner en Zo
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Doner en Zo', 'Doner en Zo', 'donerzo@gmail.com', NULL, 'Westpolderstraat 82', 'Berkel en Rodenrijs', '2652 KW', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'donerzo@gmail.com', id FROM new_cust;

-- Customer 32: Baran cafe turks restaurant
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Baran cafe turks restaurant', 'Baran cafe turks restaurant', 'Barancafeturksrestaurant@gmail.com', NULL, 'Quirinegang 83', 'Zoetermeer', '2719 CG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Barancafeturksrestaurant@gmail.com', id FROM new_cust;

-- Customer 33: Eetcafe Elif
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Eetcafe Elif', 'Eetcafe Elif', 'EetcafeElif@gmail.com', NULL, 'Dedemsvaartweg', 'Den Haag', '2545 AX', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'EetcafeElif@gmail.com', id FROM new_cust;

-- Customer 34: Luiten Food
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Luiten Food', NULL, 'Rick@luitenfood.com', '0031 71 580 8020', 'Klaverblad 11', 'Leidschendam', '2266 JK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Luiten Food', id FROM new_cust;

-- Customer 35: Sultan Ahmet BV
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Sultan Ahmet BV', 'Sultan Ahmet BV', 'SultanAhmetBV@gmail.com', NULL, 'Watermolen 6', 'Leiden', '2317 ST', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SultanAhmetBV@gmail.com', id FROM new_cust;

-- Customer 36: San Marina
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('San Marina', 'San Marina', 'sanmarina@gmail.com', NULL, 'Gerrit Achterberghove', 'Zoetermeer', '2717 XZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'sanmarina@gmail.com', id FROM new_cust;

-- Customer 37: Seryana
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Seryana', 'Seryana', 'Seryana@gmail.com', NULL, 'Hoogstraat 3', 'Gouda', '2801 HG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Seryana@gmail.com', id FROM new_cust;

-- Customer 38: Saray PideHuis
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Saray PideHuis', 'Saray PideHuis', 'SarayPideHuis@gmail.com', NULL, 'Steenstraat 20', 'Leiden', '2312 BW', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SarayPideHuis@gmail.com', id FROM new_cust;

-- Customer 39: Ak-Al Bakkerij Herenstraat
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ak-Al Bakkerij Herenstraat', 'Ak-Al Bakkerij Herenstraat', 'Ak-AlBakkerijHerenstraat@gmail.com', NULL, 'Herenstraat 4', 'Leiden', '2313 AK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Ak-AlBakkerijHerenstraat@gmail.com', id FROM new_cust;

-- Customer 40: ZAM ZAM XL
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('ZAM ZAM XL', 'ZAM ZAM XL', 'ZamZamXl@gmail.com', NULL, 'Raamsteeg 73', 'Leiden', '2311 PM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'ZamZamXl@gmail.com', id FROM new_cust;

-- Customer 41: baba de shoarmakoning
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('baba de shoarmakoning', 'baba de shoarmakoning', 'babadeshoarmakoningbeverwijk@gmail.com', NULL, 'Kuenenplein 3', 'Beverwijk', '1944 RK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'babadeshoarmakoningbeverwijk@gmail.com', id FROM new_cust;

-- Customer 42: Snackbar Onder Den Toren
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Snackbar Onder Den Toren', 'Snackbar Onder Den Toren', 'SnackbarOnderDenToren@gmail.com', NULL, 'Voorstraat 3', 'Wijk aan Zee', '1949 BG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SnackbarOnderDenToren@gmail.com', id FROM new_cust;

-- Customer 43: EetCafe De haven
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('EetCafe De haven', 'EetCafe De haven', 'Eetcafedehaven@gmail.com', NULL, 'Calandakade 170', 'Den Haag', '2521AA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Eetcafedehaven@gmail.com', id FROM new_cust;

-- Customer 44: Dicle
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dicle', 'Dicle', 'Dicle@live.nl', NULL, 'Kempstraat 17', 'Den Haag', '2572 GA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Dicle@live.nl', id FROM new_cust;

-- Customer 45: Efe Woerden
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Efe Woerden', 'Efe Woerden', 'EfeWoerden@gmail.com', NULL, 'Tournoysveld 111', 'Woerden', '3443 ES', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'EfeWoerden@gmail.com', id FROM new_cust;

-- Customer 46: Oranje Oosterheem
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Oranje Oosterheem', 'Oranje Oosterheem', 'Oranjesupermarket@live.nl', NULL, 'Westerschelde 364', 'Zoetermeer', '2721 NN', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Oranjesupermarket@live.nl', id FROM new_cust;

-- Customer 47: MD Food
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('MD Food', 'MD Food', 'MdFood@live.nl', NULL, 'Petuniatuin 8', 'Zoetermeer', '2724 NA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'MdFood@live.nl', id FROM new_cust;

-- Customer 48: Can Market
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Can Market', 'Can Market', 'CanSupermarkt@gmail.com', NULL, 'Kon. Wilhelminalaan 68-70', 'Gorinchem', '4205 EZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'CanSupermarkt@gmail.com', id FROM new_cust;

-- Customer 49: Baronie Doner Place
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Baronie Doner Place', 'Baronie Doner Place', 'BaronieDonerPlace@live.nl', NULL, 'Baronie 100', 'Alphen aan den Rijn', '2404 XH', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'BaronieDonerPlace@live.nl', id FROM new_cust;

-- Customer 50: Food Staion
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Food Staion', 'Food Staion', 'FoodStation@gmail.com', NULL, 'Stieltjesweg 232', 'Delft', '2628 CK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'FoodStation@gmail.com', id FROM new_cust;

-- Customer 51: Snackbar Downtown
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Snackbar Downtown', 'Snackbar Downtown', 'Downtown@live.nl', NULL, 'Breestraat 3 A', 'Leiden', '2311 CG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Downtown@live.nl', id FROM new_cust;

-- Customer 52: Pizza Express
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza Express', 'Pizza Express', 'PizzaExpressvoorschoten@gmail.com', NULL, 'Schoolstraat 103', 'Voorschoten', '2251 BG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzaExpressvoorschoten@gmail.com', id FROM new_cust;

-- Customer 53: bakkerij Bereket
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('bakkerij Bereket', 'bakkerij Bereket', 'Bakkerijbereketdenhaag@gmail.com', NULL, 'Paul Krugerlaan 36 -40', 'Den Haag', '2571 HK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Bakkerijbereketdenhaag@gmail.com', id FROM new_cust;

-- Customer 54: Durum Evi
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Durum Evi', 'Durum Evi', 'DurumEvitandir@gmail.com', NULL, 'Paul Krugerplein 7', 'Den Haag', '2571 HT', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'DurumEvitandir@gmail.com', id FROM new_cust;

-- Customer 55: Supermarkt Joud
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Supermarkt Joud', 'Supermarkt Joud', 'SupermarktJoud@gmail.com', NULL, 'Venneperstraat 12', 'Nieuw-Vennep', '2151 AR', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SupermarktJoud@gmail.com', id FROM new_cust;

-- Customer 56: Pizzeria & Grillroom Bomonti
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizzeria & Grillroom Bomonti', 'Pizzeria & Grillroom Bomonti', 'PizzeriaGrillroomBomonti@gmail.com', NULL, 'Van Staverenstraat 24', 'Reeuwijk', '2811 TL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzeriaGrillroomBomonti@gmail.com', id FROM new_cust;

-- ========== ORDERS ==========
-- Order WOO-217 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Orange Food Group B.V.'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-217', cust.new_id, 'completed'::order_status, NULL, 96608, 0, 8699, 0, 105307, '2024-03-08'::date, NULL, 'Imported from WooCommerce order #217', '2024-03-08T10:13:00.000Z'::timestamptz, '2024-03-08T10:13:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460),
  ('CRISPY TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625),
  ('CRISPY TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 2::decimal, 548),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 2::decimal, 580),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 1::decimal, 680),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 2::decimal, 712),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 4::decimal, 700),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-221 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Drean Kebab 1'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-221', cust.new_id, 'completed'::order_status, NULL, 12400, 0, 1116, 0, 13516, '2024-03-11'::date, NULL, 'Imported from WooCommerce order #221', '2024-03-11T08:06:00.000Z'::timestamptz, '2024-03-11T08:06:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-222 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Dreamkebab@katwijk.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-222', cust.new_id, 'completed'::order_status, NULL, 23160, 0, 2084, 0, 25244, '2024-03-11'::date, NULL, 'Imported from WooCommerce order #222', '2024-03-11T08:10:00.000Z'::timestamptz, '2024-03-11T08:10:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550),
  ('CHICKEN SCHNITZEL', NULL, 8::decimal, 825),
  ('CHICKEN WINGS CLASSIC', NULL, 8::decimal, 520)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-223 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'dreamkebab@noordwijkerhour.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-223', cust.new_id, 'completed'::order_status, NULL, 27400, 0, 2466, 0, 29866, '2024-03-11'::date, NULL, 'Imported from WooCommerce order #223', '2024-03-11T08:32:00.000Z'::timestamptz, '2024-03-11T08:32:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550),
  ('CRISPY TENDERS  CLASSIC', NULL, 8::decimal, 775),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 4::decimal, 550),
  ('CHICKEN SCHNITZEL', NULL, 8::decimal, 825)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-225 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Sohbet@denhaag.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-225', cust.new_id, 'completed'::order_status, NULL, 10850, 0, 977, 0, 11827, '2024-03-11'::date, NULL, 'Imported from WooCommerce order #225', '2024-03-11T08:43:00.000Z'::timestamptz, '2024-03-11T08:43:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 7::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-227 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'info@bakkerijhesseplace.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-227', cust.new_id, 'completed'::order_status, NULL, 30000, 0, 2700, 0, 32700, '2024-03-11'::date, NULL, 'Imported from WooCommerce order #227', '2024-03-11T09:25:00.000Z'::timestamptz, '2024-03-11T09:25:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1500)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-229 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'akal-eethuis-alpenaanderijn@hotmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-229', cust.new_id, 'completed'::order_status, NULL, 108386, 0, 9755, 0, 118141, '2024-03-12'::date, NULL, 'Imported from WooCommerce order #229', '2024-03-12T08:35:00.000Z'::timestamptz, '2024-03-12T08:35:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 40::decimal, 1625),
  ('Kipfile geseneden PAPRICA (€5,75)', '5902082461319', 12::decimal, 1438),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 1::decimal, 580),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 2::decimal, 1595),
  ('CHICKEN WINGS CLASSIC', NULL, 16::decimal, 520),
  ('CHICKEN WINGS BARBECUE', NULL, 16::decimal, 600),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 4::decimal, 550),
  ('FALAFEL', NULL, 4::decimal, 560)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-230 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Salama@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-230', cust.new_id, 'completed'::order_status, NULL, 15150, 0, 1364, 0, 16514, '2024-03-12'::date, NULL, 'Imported from WooCommerce order #230', '2024-03-12T08:48:00.000Z'::timestamptz, '2024-03-12T08:48:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550),
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 2::decimal, 1375)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-232 (refunded)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Ons@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-232', cust.new_id, 'refunded'::order_status, NULL, 13000, 0, 1170, 0, 14170, '2024-03-12'::date, NULL, 'Imported from WooCommerce order #232', '2024-03-12T08:53:00.000Z'::timestamptz, '2024-03-12T08:53:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 0::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-233 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzeriaRoomburg@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-233', cust.new_id, 'completed'::order_status, NULL, 12000, 0, 1080, 0, 13080, '2024-03-12'::date, NULL, 'Imported from WooCommerce order #233', '2024-03-12T09:53:00.000Z'::timestamptz, '2024-03-12T09:53:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 4::decimal, 1375),
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-234 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Pizzabellamaria@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-234', cust.new_id, 'completed'::order_status, NULL, 15500, 0, 1395, 0, 16895, '2024-03-12'::date, NULL, 'Imported from WooCommerce order #234', '2024-03-12T12:57:00.000Z'::timestamptz, '2024-03-12T12:57:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-236 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'akmirdoner@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-236', cust.new_id, 'completed'::order_status, NULL, 24960, 0, 2247, 0, 27207, '2024-03-12'::date, NULL, 'Imported from WooCommerce order #236', '2024-03-12T13:07:00.000Z'::timestamptz, '2024-03-12T13:07:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625),
  ('Excellence Patat', NULL, 1::decimal, 1550),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 8::decimal, 550),
  ('Chicken CRISPY WINGS', NULL, 8::decimal, 575),
  ('CHICKEN WINGS CLASSIC', NULL, 8::decimal, 520),
  ('CHICKEN TENDERS CLASSIC (FORMED)', NULL, 1::decimal, 750),
  ('CRISPY BURGER', NULL, 1::decimal, 850),
  ('CHICKEN SCHNITZEL', NULL, 1::decimal, 825),
  ('CRISPY TENDERS  CLASSIC', NULL, 8::decimal, 775)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-238 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'BakkerijdeHazelaar@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-238', cust.new_id, 'completed'::order_status, NULL, 46500, 0, 4185, 0, 50685, '2024-03-13'::date, NULL, 'Imported from WooCommerce order #238', '2024-03-13T08:27:00.000Z'::timestamptz, '2024-03-13T08:27:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 30::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-240 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'HoornesSupermarktenBakkerij@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-240', cust.new_id, 'completed'::order_status, NULL, 6200, 0, 558, 0, 6758, '2024-03-13'::date, NULL, 'Imported from WooCommerce order #240', '2024-03-13T14:03:00.000Z'::timestamptz, '2024-03-13T14:03:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-244 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'MassadaRoelofarendsveen@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-244', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 17660, 0, 1589, 0, 19249, '2024-03-13'::date, NULL, 'Imported from WooCommerce order #244', '2024-03-13T15:13:00.000Z'::timestamptz, '2024-03-13T15:13:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('CHICKEN KIPCORN', NULL, 8::decimal, 620)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-245 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'INDOORSPEELPARADIJSZUIDERPARK@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-245', cust.new_id, 'completed'::order_status, NULL, 41900, 0, 3771, 0, 45671, '2024-03-14'::date, NULL, 'Imported from WooCommerce order #245', '2024-03-14T08:23:00.000Z'::timestamptz, '2024-03-14T08:23:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 48::decimal, 550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-246 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'DeGoudenWokZuiderpark@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-246', cust.new_id, 'completed'::order_status, NULL, 34840, 0, 3136, 0, 37976, '2024-03-14'::date, NULL, 'Imported from WooCommerce order #246', '2024-03-14T08:42:00.000Z'::timestamptz, '2024-03-14T08:42:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('ONION RINGS', NULL, 8::decimal, 430),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 18::decimal, 700),
  ('CRISPY TENDERS  CLASSIC', NULL, 8::decimal, 775),
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 8::decimal, 550),
  ('Pizza Meat 1kg', '5902082461517', 10::decimal, 820),
  ('Sliced and Roasted Sucuk Kebab', '5902082462316', 10::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-251 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzeriaGrillroomHawaiiNaaldwijk@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-251', cust.new_id, 'completed'::order_status, NULL, 20347, 0, 1832, 0, 22179, '2024-03-13'::date, NULL, 'Imported from WooCommerce order #251', '2024-03-13T17:00:00.000Z'::timestamptz, '2024-03-13T17:00:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625),
  ('Kipfile geseneden PAPRICA (€5,75)', '5902082461319', 4::decimal, 1438),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 1::decimal, 1595)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-252 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'DeRotondeKebab@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-252', cust.new_id, 'completed'::order_status, NULL, 49525, 0, 4458, 0, 53983, '2024-03-13'::date, NULL, 'Imported from WooCommerce order #252', '2024-03-13T17:04:00.000Z'::timestamptz, '2024-03-13T17:04:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN NUGGETS CLASSIC TEMPURA', NULL, 8::decimal, 550),
  ('CRISPY TENDERS  CLASSIC', NULL, 1::decimal, 775),
  ('CHICKEN WINGS CLASSIC', NULL, 8::decimal, 520),
  ('FALAFEL', NULL, 8::decimal, 560),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 3::decimal, 1595),
  ('Excellence Patat', NULL, 5::decimal, 1550),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600),
  ('CHICKEN TENDERS CLASSIC (FORMED)', NULL, 8::decimal, 750),
  ('CRISPY BURGER', NULL, 8::decimal, 850)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-255 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzaBellaDonna@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-255', cust.new_id, 'completed'::order_status, NULL, 15185, 0, 1367, 0, 16552, '2024-03-14'::date, NULL, 'Imported from WooCommerce order #255', '2024-03-14T15:51:00.000Z'::timestamptz, '2024-03-14T15:51:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 4::decimal, 1375),
  ('FALAFEL', NULL, 1::decimal, 560),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 1::decimal, 580),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 1::decimal, 300),
  ('Chicken CRISPY WINGS', NULL, 1::decimal, 575),
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550),
  ('CHICKEN KIPCORN', NULL, 1::decimal, 620)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-258 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'AlestaFood@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-258', cust.new_id, 'completed'::order_status, NULL, 70490, 0, 6345, 0, 76835, '2024-03-14'::date, NULL, 'Imported from WooCommerce order #258', '2024-03-14T16:39:00.000Z'::timestamptz, '2024-03-14T16:39:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550),
  ('CHICKEN SCHNITZEL', NULL, 8::decimal, 825),
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550),
  ('Kentucky TENDERS  HOT', NULL, 16::decimal, 850),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 30::decimal, 590),
  ('Chicken CRISPY WINGS', NULL, 8::decimal, 575),
  ('CHICKEN WINGS CLASSIC', NULL, 2::decimal, 520)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-269 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'KaradagFood@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-269', cust.new_id, 'completed'::order_status, NULL, 2995, 0, 271, 0, 3266, '2024-03-15'::date, NULL, 'Imported from WooCommerce order #269', '2024-03-15T11:54:00.000Z'::timestamptz, '2024-03-15T11:54:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Kentucky TENDERS  CLASSIC', NULL, 1::decimal, 775),
  ('Kentucky TENDERS  HOT', NULL, 1::decimal, 850),
  ('CHICKEN KIPCORN', NULL, 1::decimal, 620),
  ('CHICKEN TENDERS CLASSIC (FORMED)', NULL, 1::decimal, 750)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-270 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Flameshoofdorp@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-270', cust.new_id, 'completed'::order_status, NULL, 36000, 0, 3240, 0, 39240, '2024-03-16'::date, NULL, 'Imported from WooCommerce order #270', '2024-03-16T16:23:00.000Z'::timestamptz, '2024-03-16T16:23:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 12::decimal, 1375),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 12::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-271 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Lalupa@live.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-271', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 8320, 0, 749, 0, 9069, '2024-03-16'::date, NULL, 'Imported from WooCommerce order #271', '2024-03-16T16:26:00.000Z'::timestamptz, '2024-03-16T16:26:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 4::decimal, 1875),
  ('Pizza Meat 1kg', '5902082461517', 1::decimal, 820)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-272 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'akal-eethuis-alpenaanderijn@hotmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-272', cust.new_id, 'completed'::order_status, 'cash'::payment_method, 2400, 0, 216, 0, 2616, '2024-03-17'::date, NULL, 'Imported from WooCommerce order #272', '2024-03-17T16:33:00.000Z'::timestamptz, '2024-03-17T16:33:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-273 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'ramses@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-273', cust.new_id, 'completed'::order_status, NULL, 32500, 0, 2925, 0, 35425, '2024-03-18'::date, NULL, 'Imported from WooCommerce order #273', '2024-03-18T08:18:00.000Z'::timestamptz, '2024-03-18T08:18:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 0),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 0),
  ('Kipfile geseneden PAPRICA (€5,75)', '5902082461319', 1::decimal, 0),
  ('FALAFEL', NULL, 1::decimal, 0),
  ('CHICKEN TENDERS CLASSIC (FORMED)', NULL, 1::decimal, 0),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 1::decimal, 0),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 20::decimal, 1625),
  ('CHICKEN WINGS CLASSIC', NULL, 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-274 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Lageveld@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-274', cust.new_id, 'completed'::order_status, NULL, 3000, 0, 270, 0, 3270, '2024-03-18'::date, NULL, 'Imported from WooCommerce order #274', '2024-03-18T08:33:00.000Z'::timestamptz, '2024-03-18T08:33:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625),
  ('Kipfile geseneden NATURAL (€5,50)', '5902082461364', 1::decimal, 1375)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-275 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Jackscorner@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-275', cust.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-18'::date, NULL, 'Imported from WooCommerce order #275', '2024-03-18T08:36:00.000Z'::timestamptz, '2024-03-18T08:36:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-277 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'dream@kebab.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-277', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 26050, 0, 2345, 0, 28395, '2024-03-18'::date, NULL, 'Imported from WooCommerce order #277', '2024-03-18T11:21:00.000Z'::timestamptz, '2024-03-18T11:21:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Chicken WINGS CRISPY', NULL, 8::decimal, 575),
  ('Excellence Patat', NULL, 11::decimal, 1550),
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-278 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Sohbet@denhaag.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-278', cust.new_id, 'completed'::order_status, NULL, 12400, 0, 1116, 0, 13516, '2024-03-19'::date, NULL, 'Imported from WooCommerce order #278', '2024-03-19T09:09:00.000Z'::timestamptz, '2024-03-19T09:09:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-280 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzaAro@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-280', cust.new_id, 'completed'::order_status, NULL, 43452, 0, 3911, 0, 47363, '2024-03-19'::date, NULL, 'Imported from WooCommerce order #280', '2024-03-19T09:20:00.000Z'::timestamptz, '2024-03-19T09:20:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438),
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 4::decimal, 1375),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 16::decimal, 1625),
  ('Excellence Patat', NULL, 4::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-281 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'keizersnacks@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-281', cust.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-19'::date, NULL, 'Imported from WooCommerce order #281', '2024-03-19T09:23:00.000Z'::timestamptz, '2024-03-19T09:23:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN SCHNITZEL', NULL, 1::decimal, 0),
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 0),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 1::decimal, 0),
  ('CRISPY BURGER', NULL, 1::decimal, 0),
  ('FALAFEL', NULL, 1::decimal, 0),
  ('Excellence Patat', NULL, 1::decimal, 0),
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 1::decimal, 0),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 0),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 1::decimal, 0),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-282 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Salama@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-282', cust.new_id, 'completed'::order_status, NULL, 10850, 0, 977, 0, 11827, '2024-03-19'::date, NULL, 'Imported from WooCommerce order #282', '2024-03-19T09:28:00.000Z'::timestamptz, '2024-03-19T09:28:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 7::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-283 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'donerzo@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-283', cust.new_id, 'completed'::order_status, NULL, 3510, 0, 316, 0, 3826, '2024-03-19'::date, NULL, 'Imported from WooCommerce order #283', '2024-03-19T14:01:00.000Z'::timestamptz, '2024-03-19T14:01:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550),
  ('Kentucky TENDERS  CLASSIC', NULL, 1::decimal, 775),
  ('FALAFEL', NULL, 1::decimal, 560),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-291 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Barancafeturksrestaurant@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-291', cust.new_id, 'completed'::order_status, NULL, 3535, 0, 318, 0, 3853, '2024-03-20'::date, NULL, 'Imported from WooCommerce order #291', '2024-03-20T08:58:00.000Z'::timestamptz, '2024-03-20T08:58:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550),
  ('FALAFEL', NULL, 1::decimal, 560),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625),
  ('MANTI', NULL, 1::decimal, 800)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-295 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'EetcafeElif@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-295', cust.new_id, 'completed'::order_status, NULL, 8425, 0, 760, 0, 9185, '2024-03-20'::date, NULL, 'Imported from WooCommerce order #295', '2024-03-20T10:07:00.000Z'::timestamptz, '2024-03-20T10:07:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CRISPY BURGER', NULL, 1::decimal, 850),
  ('Kentucky TENDERS  CLASSIC', NULL, 1::decimal, 775),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 2::decimal, 1625),
  ('CHEESE STICKS (MOZZARELLA STICKS)', NULL, 2::decimal, 1000),
  ('Excellence Patat', NULL, 1::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-298 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Luiten Food'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-298', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 6400000, 0, 576000, 0, 6976000, '2024-03-20'::date, NULL, 'Imported from WooCommerce order #298', '2024-03-20T14:06:00.000Z'::timestamptz, '2024-03-20T14:06:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Kip doner ( 250 GR )Zonder E621', NULL, 8000::decimal, 800)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-300 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'SultanAhmetBV@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-300', cust.new_id, 'completed'::order_status, NULL, 159989, 0, 14406, 0, 174395, '2024-03-20'::date, NULL, 'Imported from WooCommerce order #300', '2024-03-20T14:19:00.000Z'::timestamptz, '2024-03-20T14:19:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN BURGER (18x70 GR)(Supermarket)', '5902082460145', 4::decimal, 580),
  ('CHICKEN BURGER (36x70 GR)(Supermarket)', '5902082460152', 6::decimal, 725),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 575),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 575),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 575),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 612),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 482),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 678),
  ('ONION RINGS (0.8kg)', '5902082461883', 9::decimal, 504),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 10::decimal, 680),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', -2::decimal, 300),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-301 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'HoornesSupermarktenBakkerij@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-301', cust.new_id, 'completed'::order_status, NULL, 48545, 0, 4370, 0, 52915, '2024-03-20'::date, NULL, 'Imported from WooCommerce order #301', '2024-03-20T15:00:00.000Z'::timestamptz, '2024-03-20T15:00:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 13::decimal, 680),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700),
  ('Excellence Patat', NULL, 6::decimal, 1550),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-302 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'akmirdoner@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-302', cust.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-20'::date, NULL, 'Imported from WooCommerce order #302', '2024-03-20T15:47:00.000Z'::timestamptz, '2024-03-20T15:47:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-304 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'sanmarina@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-304', cust.new_id, 'completed'::order_status, NULL, 35060, 0, 3155, 0, 38215, '2024-03-21'::date, NULL, 'Imported from WooCommerce order #304', '2024-03-21T11:37:00.000Z'::timestamptz, '2024-03-21T11:37:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Pizza Meat 1kg', '5902082461517', 8::decimal, 820),
  ('Excellence Patat', NULL, 10::decimal, 1550),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-305 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Pizzabellamaria@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-305', cust.new_id, 'completed'::order_status, NULL, 11712, 0, 1054, 0, 12766, '2024-03-21'::date, NULL, 'Imported from WooCommerce order #305', '2024-03-21T11:40:00.000Z'::timestamptz, '2024-03-21T11:40:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('INEGOL KOFTE (CEVAPCICI 25gr) 1Kg', NULL, 8::decimal, 745),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-306 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Seryana@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-306', cust.new_id, 'completed'::order_status, NULL, 25060, 0, 2256, 0, 27316, '2024-03-22'::date, NULL, 'Imported from WooCommerce order #306', '2024-03-22T08:20:00.000Z'::timestamptz, '2024-03-22T08:20:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 1::decimal, 580),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 1::decimal, 300),
  ('CHICKEN WINGS CLASSIC', NULL, 1::decimal, 520),
  ('CRISPY BURGER', NULL, 1::decimal, 850),
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550),
  ('FALAFEL', NULL, 1::decimal, 560),
  ('Excellence Patat', NULL, 14::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-307 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'SarayPideHuis@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-307', cust.new_id, 'completed'::order_status, NULL, 18200, 0, 1638, 0, 19838, '2024-03-22'::date, NULL, 'Imported from WooCommerce order #307', '2024-03-22T08:35:00.000Z'::timestamptz, '2024-03-22T08:35:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN BURGER  ( 36x70 GR )', NULL, 2::decimal, 1000),
  ('Mexicano ( 12*140GR)', '5902082460084', 8::decimal, 600),
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 4::decimal, 1375),
  ('Chicken Chica Hot (€5,90)', '5902082462613', 4::decimal, 1475)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-309 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'DeRotondeKebab@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-309', cust.new_id, 'completed'::order_status, NULL, 17320, 0, 1559, 0, 18879, '2024-03-22'::date, NULL, 'Imported from WooCommerce order #309', '2024-03-22T08:39:00.000Z'::timestamptz, '2024-03-22T08:39:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('AKCABAAT KOFTE (45*45gr)', NULL, 6::decimal, 1595),
  ('Excellence Patat', NULL, 5::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-311 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Ak-AlBakkerijHerenstraat@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-311', cust.new_id, 'completed'::order_status, NULL, 9300, 0, 837, 0, 10137, '2024-03-22'::date, NULL, 'Imported from WooCommerce order #311', '2024-03-22T10:38:00.000Z'::timestamptz, '2024-03-22T10:38:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-320 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Orange Food Group B.V.'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-320', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 44709, 0, 4024, 0, 48733, '2024-03-22'::date, NULL, 'Imported from WooCommerce order #320', '2024-03-22T14:32:00.000Z'::timestamptz, '2024-03-22T14:32:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 3::decimal, 456),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 5::decimal, 482),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 7::decimal, 385),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 6::decimal, 614),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 4::decimal, 614),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 3::decimal, 527),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 5::decimal, 487),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 5::decimal, 572),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 2::decimal, 660),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 8::decimal, 624),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 4::decimal, 531),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 4::decimal, 669),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-321 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'HoornesSupermarktenBakkerij@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-321', cust.new_id, 'completed'::order_status, NULL, 6500, 0, 585, 0, 7085, '2024-03-23'::date, NULL, 'Imported from WooCommerce order #321', '2024-03-23T12:27:00.000Z'::timestamptz, '2024-03-23T12:27:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-322 (refunded)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'info@bakkerijhesseplace.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-322', cust.new_id, 'refunded'::order_status, NULL, 46500, 0, 0, 0, 46500, '2024-03-24'::date, NULL, 'Imported from WooCommerce order #322', '2024-03-24T11:19:00.000Z'::timestamptz, '2024-03-24T11:19:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 0::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-323 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'ramses@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-323', cust.new_id, 'completed'::order_status, NULL, 39000, 0, 3510, 0, 42510, '2024-03-24'::date, NULL, 'Imported from WooCommerce order #323', '2024-03-24T16:36:00.000Z'::timestamptz, '2024-03-24T16:36:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 24::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-325 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'ZamZamXl@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-325', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 130977, 0, 11788, 0, 142765, '2024-03-24'::date, NULL, 'Imported from WooCommerce order #325', '2024-03-24T16:39:00.000Z'::timestamptz, '2024-03-24T16:39:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 374),
  ('ONION RINGS (0.8kg)', '5902082461883', 10::decimal, 426),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 11::decimal, 624),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 660),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 0),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 456),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 456),
  ('CHICKEN BURGER (18x70 GR)(Supermarket)', '5902082460145', 5::decimal, 485),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 1::decimal, 300),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 456),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 456),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 456),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 448),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 487),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 621)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-326 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'dreamkebab@noordwijkerhour.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-326', cust.new_id, 'completed'::order_status, NULL, 29035, 0, 2613, 0, 31648, '2024-03-24'::date, NULL, 'Imported from WooCommerce order #326', '2024-03-24T17:13:00.000Z'::timestamptz, '2024-03-24T17:13:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550),
  ('CHICKEN WINGS CLASSIC', NULL, 8::decimal, 520),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-327 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Dreamkebab@katwijk.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-327', cust.new_id, 'completed'::order_status, NULL, 27410, 0, 2467, 0, 29877, '2024-03-24'::date, NULL, 'Imported from WooCommerce order #327', '2024-03-24T17:16:00.000Z'::timestamptz, '2024-03-24T17:16:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550),
  ('CHICKEN WINGS CLASSIC', NULL, 8::decimal, 520)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-328 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'dream@kebab.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-328', cust.new_id, 'completed'::order_status, NULL, 17125, 0, 1541, 0, 18666, '2024-03-24'::date, NULL, 'Imported from WooCommerce order #328', '2024-03-24T17:17:00.000Z'::timestamptz, '2024-03-24T17:17:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-331 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'babadeshoarmakoningbeverwijk@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-331', cust.new_id, 'completed'::order_status, NULL, 9413, 0, 848, 0, 10261, '2024-03-25'::date, NULL, 'Imported from WooCommerce order #331', '2024-03-25T12:49:00.000Z'::timestamptz, '2024-03-25T12:49:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 1::decimal, 1438),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625),
  ('Mexicano ( 12*140GR)', '5902082460084', 1::decimal, 600),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 1::decimal, 580),
  ('CHICKEN NUGGETS TEMPURA', NULL, 1::decimal, 550),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 1::decimal, 1595),
  ('Excellence Patat', NULL, 1::decimal, 1550),
  ('SLICED AND ROASTED PREMIUM BEEF KEBAB (€7,75)', NULL, 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-332 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'SnackbarOnderDenToren@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-332', cust.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-25'::date, NULL, 'Imported from WooCommerce order #332', '2024-03-25T12:52:00.000Z'::timestamptz, '2024-03-25T12:52:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 1::decimal, 0),
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 1::decimal, 0),
  ('SLICED AND ROASTED PREMIUM BEEF KEBAB (€7,75)', NULL, 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-334 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'sanmarina@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-334', cust.new_id, 'completed'::order_status, NULL, 23250, 0, 2093, 0, 25343, '2024-03-25'::date, NULL, 'Imported from WooCommerce order #334', '2024-03-25T12:55:00.000Z'::timestamptz, '2024-03-25T12:55:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-335 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Sohbet@denhaag.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-335', cust.new_id, 'completed'::order_status, NULL, 13950, 0, 1256, 0, 15206, '2024-03-25'::date, NULL, 'Imported from WooCommerce order #335', '2024-03-25T13:16:00.000Z'::timestamptz, '2024-03-25T13:16:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 9::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-336 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Eetcafedehaven@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-336', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 10150, 0, 914, 0, 11064, '2024-03-25'::date, NULL, 'Imported from WooCommerce order #336', '2024-03-25T13:20:00.000Z'::timestamptz, '2024-03-25T13:20:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-337 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Salama@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-337', cust.new_id, 'completed'::order_status, NULL, 10850, 0, 977, 0, 11827, '2024-03-25'::date, NULL, 'Imported from WooCommerce order #337', '2024-03-25T17:43:00.000Z'::timestamptz, '2024-03-25T17:43:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 7::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-338 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'MassadaRoelofarendsveen@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-338', cust.new_id, 'completed'::order_status, NULL, 14250, 0, 1283, 0, 15533, '2024-03-25'::date, NULL, 'Imported from WooCommerce order #338', '2024-03-25T17:44:00.000Z'::timestamptz, '2024-03-25T17:44:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('Excellence Patat', NULL, 5::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-339 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Flameshoofdorp@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-339', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 11000, 0, 990, 0, 11990, '2024-03-25'::date, NULL, 'Imported from WooCommerce order #339', '2024-03-25T17:46:00.000Z'::timestamptz, '2024-03-25T17:46:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 8::decimal, 1375)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-342 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Dicle@live.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-342', cust.new_id, 'completed'::order_status, NULL, 23900, 0, 2151, 0, 26051, '2024-03-26'::date, NULL, 'Imported from WooCommerce order #342', '2024-03-26T07:38:00.000Z'::timestamptz, '2024-03-26T07:38:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 12::decimal, 1625),
  ('Mexicano ( 12*140GR)', '5902082460084', 4::decimal, 600),
  ('CHICKEN BURGER  ( 36x70 GR )', NULL, 2::decimal, 1000)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-343 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Jackscorner@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-343', cust.new_id, 'completed'::order_status, NULL, 14000, 0, 1260, 0, 15260, '2024-03-26'::date, NULL, 'Imported from WooCommerce order #343', '2024-03-26T07:41:00.000Z'::timestamptz, '2024-03-26T07:41:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 8::decimal, 1750)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-344 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'SultanAhmetBV@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-344', cust.new_id, 'completed'::order_status, NULL, 11190, 0, 1008, 0, 12198, '2024-03-26'::date, NULL, 'Imported from WooCommerce order #344', '2024-03-26T10:26:00.000Z'::timestamptz, '2024-03-26T10:26:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 3::decimal, 625),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 3::decimal, 625),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 3::decimal, 300)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-348 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'BakkerijdeHazelaar@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-348', cust.new_id, 'completed'::order_status, NULL, 46500, 0, 4185, 0, 50685, '2024-03-27'::date, NULL, 'Imported from WooCommerce order #348', '2024-03-27T07:06:00.000Z'::timestamptz, '2024-03-27T07:06:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 30::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-349 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'EfeWoerden@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-349', cust.new_id, 'completed'::order_status, NULL, 15500, 0, 1395, 0, 16895, '2024-03-27'::date, NULL, 'Imported from WooCommerce order #349', '2024-03-27T07:09:00.000Z'::timestamptz, '2024-03-27T07:09:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-350 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Oranjesupermarket@live.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-350', cust.new_id, 'completed'::order_status, NULL, 51884, 0, 4671, 0, 56555, '2024-03-27'::date, NULL, 'Imported from WooCommerce order #350', '2024-03-27T07:13:00.000Z'::timestamptz, '2024-03-27T07:13:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 10::decimal, 680),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-351 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'MdFood@live.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-351', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 81586, 0, 7346, 0, 88932, '2024-03-27'::date, NULL, 'Imported from WooCommerce order #351', '2024-03-27T07:20:00.000Z'::timestamptz, '2024-03-27T07:20:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 678),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 405),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 560),
  ('Excellence Patat', NULL, 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-352 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'CanSupermarkt@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-352', cust.new_id, 'completed'::order_status, NULL, 152394, 0, 13722, 0, 166116, '2024-03-27'::date, NULL, 'Imported from WooCommerce order #352', '2024-03-27T07:29:00.000Z'::timestamptz, '2024-03-27T07:29:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 8::decimal, 580),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 575),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 575),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 575),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 612),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 12::decimal, 575),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 678),
  ('ONION RINGS (0.8kg)', '5902082461883', 4::decimal, 504),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 14::decimal, 680),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 640),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 560),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-353 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'info@bakkerijhesseplace.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-353', cust.new_id, 'completed'::order_status, NULL, 153264, 0, 13801, 0, 167065, '2024-03-27'::date, NULL, 'Imported from WooCommerce order #353', '2024-03-27T07:38:00.000Z'::timestamptz, '2024-03-27T07:38:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 8::decimal, 580),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 700),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 10::decimal, 575),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 575),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 575),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 544),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 460),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 612),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 482),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 625),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 548),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 548),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 7::decimal, 575),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 10::decimal, 678),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 405),
  ('FALAFEL', NULL, 10::decimal, 560),
  ('CHICKEN WINGS CLASSIC', NULL, 1::decimal, 0),
  ('ONION RINGS (0.8kg)', '5902082461883', 1::decimal, 504),
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 560),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 11::decimal, 680)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-384 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'HoornesSupermarktenBakkerij@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-384', cust.new_id, 'completed'::order_status, NULL, 15550, 0, 1400, 0, 16950, '2024-03-28'::date, NULL, 'Imported from WooCommerce order #384', '2024-03-28T08:50:00.000Z'::timestamptz, '2024-03-28T08:50:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-385 (cancelled)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzeriaGrillroomHawaiiNaaldwijk@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-385', cust.new_id, 'cancelled'::order_status, NULL, 16902, 0, 0, 0, 16902, '2024-03-28'::date, NULL, 'Imported from WooCommerce order #385', '2024-03-28T08:52:00.000Z'::timestamptz, '2024-03-28T08:52:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 3::decimal, 1550),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-386 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'EetcafeElif@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-386', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 8200, 0, 738, 0, 8938, '2024-03-28'::date, NULL, 'Imported from WooCommerce order #386', '2024-03-28T08:54:00.000Z'::timestamptz, '2024-03-28T08:54:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Kentucky TENDERS  CLASSIC', NULL, 8::decimal, 775),
  ('CHEESE STICKS (MOZZARELLA STICKS)', NULL, 2::decimal, 1000)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-387 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'BaronieDonerPlace@live.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-387', cust.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-03-28'::date, NULL, 'Imported from WooCommerce order #387', '2024-03-28T08:57:00.000Z'::timestamptz, '2024-03-28T08:57:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,50)', '5902082460350', 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-389 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'HoornesSupermarktenBakkerij@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-389', cust.new_id, 'completed'::order_status, NULL, 13040, 0, 1174, 0, 14214, '2024-03-28'::date, NULL, 'Imported from WooCommerce order #389', '2024-03-28T12:57:00.000Z'::timestamptz, '2024-03-28T12:57:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 654)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-393 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Seryana@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-393', cust.new_id, 'completed'::order_status, NULL, 15500, 0, 1395, 0, 16895, '2024-03-29'::date, NULL, 'Imported from WooCommerce order #393', '2024-03-29T09:03:00.000Z'::timestamptz, '2024-03-29T09:03:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 10::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-394 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'donerzo@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-394', cust.new_id, 'completed'::order_status, NULL, 1475, 0, 133, 0, 1608, '2024-03-29'::date, NULL, 'Imported from WooCommerce order #394', '2024-03-29T09:05:00.000Z'::timestamptz, '2024-03-29T09:05:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-395 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'FoodStation@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-395', cust.new_id, 'completed'::order_status, NULL, 4613, 0, 415, 0, 5028, '2024-03-29'::date, NULL, 'Imported from WooCommerce order #395', '2024-03-29T09:14:00.000Z'::timestamptz, '2024-03-29T09:14:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 1::decimal, 1438),
  ('Excellence Patat', NULL, 1::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-396 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Downtown@live.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-396', cust.new_id, 'completed'::order_status, NULL, 4650, 0, 419, 0, 5069, '2024-03-29'::date, NULL, 'Imported from WooCommerce order #396', '2024-03-29T09:15:00.000Z'::timestamptz, '2024-03-29T09:15:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 3::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-398 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Ak-AlBakkerijHerenstraat@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-398', cust.new_id, 'completed'::order_status, NULL, 9300, 0, 837, 0, 10137, '2024-03-29'::date, NULL, 'Imported from WooCommerce order #398', '2024-03-29T13:56:00.000Z'::timestamptz, '2024-03-29T13:56:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-399 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzeriaGrillroomHawaiiNaaldwijk@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-399', cust.new_id, 'completed'::order_status, NULL, 16902, 0, 1522, 0, 18424, '2024-03-29'::date, NULL, 'Imported from WooCommerce order #399', '2024-03-29T16:13:00.000Z'::timestamptz, '2024-03-29T16:13:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 3::decimal, 1550),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-402 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'info@bakkerijhesseplace.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-402', cust.new_id, 'completed'::order_status, NULL, 46500, 0, 4185, 0, 50685, '2024-03-29'::date, NULL, 'Imported from WooCommerce order #402', '2024-03-29T16:58:00.000Z'::timestamptz, '2024-03-29T16:58:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 30::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-403 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzeriaRoomburg@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-403', cust.new_id, 'completed'::order_status, NULL, 5500, 0, 495, 0, 5995, '2024-03-29'::date, NULL, 'Imported from WooCommerce order #403', '2024-03-29T19:19:00.000Z'::timestamptz, '2024-03-29T19:19:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 4::decimal, 1375)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-405 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Flameshoofdorp@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-405', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 24000, 0, 2160, 0, 26160, '2024-03-31'::date, NULL, 'Imported from WooCommerce order #405', '2024-03-31T12:26:00.000Z'::timestamptz, '2024-03-31T12:26:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Chicken Chica NATURAL (€5,50)', '5902082461364', 8::decimal, 1375),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-407 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'dreamkebab@noordwijkerhour.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-407', cust.new_id, 'completed'::order_status, NULL, 31560, 0, 2840, 0, 34400, '2024-04-01'::date, NULL, 'Imported from WooCommerce order #407', '2024-04-01T06:34:00.000Z'::timestamptz, '2024-04-01T06:34:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1550),
  ('FALAFEL', NULL, 1::decimal, 560)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-408 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'dream@kebab.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-408', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 12400, 0, 1116, 0, 13516, '2024-04-01'::date, NULL, 'Imported from WooCommerce order #408', '2024-04-01T06:35:00.000Z'::timestamptz, '2024-04-01T06:35:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-409 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'ramses@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-409', cust.new_id, 'completed'::order_status, NULL, 32500, 0, 2925, 0, 35425, '2024-04-01'::date, NULL, 'Imported from WooCommerce order #409', '2024-04-01T06:37:00.000Z'::timestamptz, '2024-04-01T06:37:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 20::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-412 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzaExpressvoorschoten@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-412', cust.new_id, 'completed'::order_status, NULL, 99812, 0, 8984, 0, 108796, '2024-04-01'::date, NULL, 'Imported from WooCommerce order #412', '2024-04-01T06:49:00.000Z'::timestamptz, '2024-04-01T06:49:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1550),
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 12::decimal, 1750),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 720),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 590),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 575),
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 575),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('Pizza Meat 1kg', '5902082461517', 8::decimal, 820),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-413 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Bakkerijbereketdenhaag@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-413', cust.new_id, 'completed'::order_status, NULL, 31000, 0, 2790, 0, 33790, '2024-04-01'::date, NULL, 'Imported from WooCommerce order #413', '2024-04-01T07:00:00.000Z'::timestamptz, '2024-04-01T07:00:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 20::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-415 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'SarayPideHuis@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-415', cust.new_id, 'completed'::order_status, NULL, 9300, 0, 837, 0, 10137, '2024-04-01'::date, NULL, 'Imported from WooCommerce order #415', '2024-04-01T10:04:00.000Z'::timestamptz, '2024-04-01T10:04:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 6::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-417 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'SultanAhmetBV@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-417', cust.new_id, 'completed'::order_status, NULL, 31112, 0, 2800, 0, 33912, '2024-04-01'::date, NULL, 'Imported from WooCommerce order #417', '2024-04-01T10:16:00.000Z'::timestamptz, '2024-04-01T10:16:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 5::decimal, 625),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 7::decimal, 625),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 7::decimal, 460),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 3::decimal, 548),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 4::decimal, 544),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 4::decimal, 720),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 4::decimal, 640),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 3::decimal, 300),
  ('CEVAPCICI (45*18GR) (0.81kg)', '5902082415183', 4::decimal, 678),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 5::decimal, 654)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-421 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'DurumEvitandir@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-421', cust.new_id, 'completed'::order_status, NULL, 23250, 0, 2093, 0, 25343, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #421', '2024-04-02T07:46:00.000Z'::timestamptz, '2024-04-02T07:46:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-422 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Sohbet@denhaag.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-422', cust.new_id, 'completed'::order_status, NULL, 12400, 0, 1116, 0, 13516, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #422', '2024-04-02T07:50:00.000Z'::timestamptz, '2024-04-02T07:50:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 8::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-423 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Eetcafedehaven@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-423', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 4650, 0, 419, 0, 5069, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #423', '2024-04-02T07:50:00.000Z'::timestamptz, '2024-04-02T07:50:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 3::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-424 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Jackscorner@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-424', cust.new_id, 'completed'::order_status, NULL, 35000, 0, 3150, 0, 38150, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #424', '2024-04-02T07:52:00.000Z'::timestamptz, '2024-04-02T07:52:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('SLICED AND ROASTED PREMIUM CHICKEN KEBAB (€7,00)', '5902082460350', 20::decimal, 1750)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-425 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzaAro@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-425', cust.new_id, 'completed'::order_status, NULL, 29602, 0, 2665, 0, 32267, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #425', '2024-04-02T07:55:00.000Z'::timestamptz, '2024-04-02T07:55:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438),
  ('Excellence Patat', NULL, 7::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-427 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Salama@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-427', cust.new_id, 'completed'::order_status, NULL, 7750, 0, 698, 0, 8448, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #427', '2024-04-02T07:57:00.000Z'::timestamptz, '2024-04-02T07:57:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-428 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'SupermarktJoud@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-428', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 122900, 0, 11062, 0, 133962, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #428', '2024-04-02T07:58:00.000Z'::timestamptz, '2024-04-02T07:58:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 4::decimal, 485),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 10::decimal, 531),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 10::decimal, 669),
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 10::decimal, 456),
  ('CRISPY WINGS Hot (0.8kg)', '5902082428022', 10::decimal, 456),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 10::decimal, 456),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 10::decimal, 456),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 10::decimal, 482),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 10::decimal, 437),
  ('CHICKEN FINGERS (0.8kg)', '5902082428053', 10::decimal, 448),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 10::decimal, 425),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 10::decimal, 614),
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 12::decimal, 487),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527),
  ('FALAFEL (0.8kg)', '5902082432197', 10::decimal, 374),
  ('ONION RINGS (0.8kg)', '5902082461883', 10::decimal, 426),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 18::decimal, 624),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 10::decimal, 660),
  ('SLICED AND ROASTED CHICKEN KEBAB (0,8GR)', '5902082427971', 10::decimal, 572),
  ('MANTI (0.8kg)', '5902082456094', 10::decimal, 468),
  ('Mexicano ( 6 * 140 GR )', '5902082460077', 10::decimal, 300),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 10::decimal, 385),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 11::decimal, 527)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-430 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'SarayPideHuis@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-430', cust.new_id, 'completed'::order_status, NULL, 26045, 0, 2345, 0, 28390, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #430', '2024-04-02T13:34:00.000Z'::timestamptz, '2024-04-02T13:34:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550),
  ('AKCABAAT KOFTE (45*45gr)', NULL, 1::decimal, 1595),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 1::decimal, 425),
  ('Kentucky TENDERS  CLASSIC', NULL, 1::decimal, 775)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-431 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'sanmarina@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-431', cust.new_id, 'completed'::order_status, NULL, 24875, 0, 2239, 0, 27114, '2024-04-02'::date, NULL, 'Imported from WooCommerce order #431', '2024-04-02T13:40:00.000Z'::timestamptz, '2024-04-02T13:40:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 15::decimal, 1550),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 1::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-432 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzeriaGrillroomBomonti@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-432', cust.new_id, 'completed'::order_status, NULL, 27087, 0, 2438, 0, 29525, '2024-04-04'::date, NULL, 'Imported from WooCommerce order #432', '2024-04-04T08:24:00.000Z'::timestamptz, '2024-04-04T08:24:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Pizza Meat 1kg', '5902082461517', 8::decimal, 820),
  ('CRISPY PANKO SHRIMPS (0.4kg)', '5902082454632', 10::decimal, 680),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-433 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'EetcafeElif@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-433', cust.new_id, 'completed'::order_status, NULL, 13650, 0, 1229, 0, 14879, '2024-04-04'::date, NULL, 'Imported from WooCommerce order #433', '2024-04-04T08:28:00.000Z'::timestamptz, '2024-04-04T08:28:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625),
  ('CHEESE NUGGETS', NULL, 11::decimal, 650)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-434 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'akal-eethuis-alpenaanderijn@hotmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-434', cust.new_id, 'completed'::order_status, NULL, 0, 0, 0, 0, 0, '2024-04-04'::date, NULL, 'Imported from WooCommerce order #434', '2024-04-04T08:31:00.000Z'::timestamptz, '2024-04-04T08:31:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 1::decimal, 0)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-435 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Dicle@live.nl'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-435', cust.new_id, 'completed'::order_status, NULL, 10600, 0, 954, 0, 11554, '2024-04-04'::date, NULL, 'Imported from WooCommerce order #435', '2024-04-04T08:32:00.000Z'::timestamptz, '2024-04-04T08:32:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN NUGGETS TEMPURA', NULL, 8::decimal, 550),
  ('Excellence Patat', NULL, 4::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-437 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Seryana@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-437', cust.new_id, 'completed'::order_status, NULL, 5660, 0, 509, 0, 6169, '2024-04-04'::date, NULL, 'Imported from WooCommerce order #437', '2024-04-04T08:42:00.000Z'::timestamptz, '2024-04-04T08:42:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('FALAFEL', NULL, 5::decimal, 500),
  ('CHICKEN BURGER  ( 18x70 GR )', NULL, 2::decimal, 580),
  ('CRISPY BURGER', NULL, 2::decimal, 700),
  ('Mexicano ( 12*140GR)', '5902082460084', 1::decimal, 600)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-442 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'ZamZamXl@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-442', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 37405, 0, 3369, 0, 40774, '2024-04-04'::date, NULL, 'Imported from WooCommerce order #442', '2024-04-04T11:11:00.000Z'::timestamptz, '2024-04-04T11:11:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHILLI-CHEESE NUGGETS  (0.6kg)', '5902082461876', 8::decimal, 487),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 4::decimal, 660),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 10::decimal, 614),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 5::decimal, 385),
  ('CHICKEN WINGS BARBEQUE (0.8kg)', '5902082428015', 2::decimal, 456),
  ('CHICKEN WINGS CLASSIC (0.8kg)', '5902082427995', 2::decimal, 456),
  ('CHICKEN WINGS HOT (0.8kg)', '5902082428008', 2::decimal, 456),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 4::decimal, 437),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 4::decimal, 482),
  ('FALAFEL (0.8kg)', '5902082432197', 4::decimal, 374),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 2::decimal, 527),
  ('ADANA KEBAB (12*50 GR)', '5902082428305', 5::decimal, 531),
  ('AKCABAAT KOFTE  (18*45GR)', '5902082411628', 5::decimal, 669),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 2::decimal, 425),
  ('ONION RINGS (0.8kg)', '5902082461883', 2::decimal, 426)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-447 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'PizzaAro@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-447', cust.new_id, 'completed'::order_status, NULL, 18752, 0, 1688, 0, 20440, '2024-04-05'::date, NULL, 'Imported from WooCommerce order #447', '2024-04-05T08:12:00.000Z'::timestamptz, '2024-04-05T08:12:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625),
  ('Chicken Chica PAPRIKA (€5,75)', '5902082461319', 4::decimal, 1438)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-448 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'sanmarina@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-448', cust.new_id, 'completed'::order_status, NULL, 13000, 0, 1170, 0, 14170, '2024-04-05'::date, NULL, 'Imported from WooCommerce order #448', '2024-04-05T08:13:00.000Z'::timestamptz, '2024-04-05T08:13:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 8::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-449 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'DeGoudenWokZuiderpark@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-449', cust.new_id, 'completed'::order_status, NULL, 13200, 0, 1188, 0, 14388, '2024-04-05'::date, NULL, 'Imported from WooCommerce order #449', '2024-04-05T08:14:00.000Z'::timestamptz, '2024-04-05T08:14:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Sliced and Roasted Sucuk Kebab (0,8 GR)', '5902082462316', 10::decimal, 664),
  ('Pizza Meat 1kg', '5902082461517', 8::decimal, 820)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-450 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'INDOORSPEELPARADIJSZUIDERPARK@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-450', cust.new_id, 'completed'::order_status, NULL, 35100, 0, 3159, 0, 38259, '2024-04-05'::date, NULL, 'Imported from WooCommerce order #450', '2024-04-05T08:17:00.000Z'::timestamptz, '2024-04-05T08:17:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CHICKEN BURGER  ( 36x70 GR )', NULL, 2::decimal, 1000),
  ('Excellence Patat', NULL, 10::decimal, 1550),
  ('CHICKEN NUGGETS TEMPURA', NULL, 32::decimal, 550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-451 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'babadeshoarmakoningbeverwijk@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-451', cust.new_id, 'completed'::order_status, NULL, 8395, 0, 756, 0, 9151, '2024-04-05'::date, NULL, 'Imported from WooCommerce order #451', '2024-04-05T08:19:00.000Z'::timestamptz, '2024-04-05T08:19:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 4::decimal, 1550),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 1::decimal, 720),
  ('ADANA KEBAB (17*118 GR)', NULL, 1::decimal, 1475)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-452 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'AlestaFood@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-452', cust.new_id, 'completed'::order_status, NULL, 14250, 0, 1283, 0, 15533, '2024-04-05'::date, NULL, 'Imported from WooCommerce order #452', '2024-04-05T08:22:00.000Z'::timestamptz, '2024-04-05T08:22:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550),
  ('Mix - SHAWARMA (%20 Lam-%80 kalkoen) (€6,50)', NULL, 4::decimal, 1625)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-453 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Ak-AlBakkerijHerenstraat@gmail.com'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-453', cust.new_id, 'completed'::order_status, NULL, 7750, 0, 698, 0, 8448, '2024-04-05'::date, NULL, 'Imported from WooCommerce order #453', '2024-04-05T14:07:00.000Z'::timestamptz, '2024-04-05T14:07:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('Excellence Patat', NULL, 5::decimal, 1550)
) AS v(product_name, product_sku, quantity, unit_price);

-- Order WOO-456 (completed)
WITH cust AS (
  SELECT new_id FROM woo_migration_map WHERE entity_type = 'customer' AND woo_id = 'Orange Food Group B.V.'
), new_order AS (
  INSERT INTO orders (order_number, customer_id, status, payment_method, subtotal, discount_amount, tax_amount, delivery_fee, total, order_date, delivery_notes, internal_notes, created_at, updated_at)
  SELECT 'WOO-456', cust.new_id, 'completed'::order_status, 'bank'::payment_method, 32699, 0, 2943, 0, 35642, '2024-04-05'::date, NULL, 'Imported from WooCommerce order #456', '2024-04-05T16:23:00.000Z'::timestamptz, '2024-04-05T16:23:00.000Z'::timestamptz
  FROM cust
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_type, quantity, unit_price, cost_cents, discount_amount, tax_rate, tax_amount, line_total)
SELECT new_order.id,
  NULL,
  v.product_name,
  v.product_sku,
  'piece',
  v.quantity,
  v.unit_price,
  0,
  0,
  9.00,
  ROUND(v.unit_price * v.quantity * 0.09)::int,
  ROUND(v.unit_price * v.quantity)::int
FROM new_order, (VALUES
  ('CRISPY WINGS CLASSIC (0.8kg)', '5902082432210', 5::decimal, 456),
  ('CRISPY BURGER (0.8kg)', '5902082427957', 7::decimal, 482),
  ('CHICKEN NUGGETS CLASSIC (0.8kg)', '5902082428039', 1::decimal, 385),
  ('Kentucky TENDERS CLASSIC (0.8kg)', '5902082467564', 1::decimal, 614),
  ('Kentucky TENDERS HOT (0.8kg)', '5902082427896', 3::decimal, 614),
  ('CHEESE NUGGETS (0.7kg)', '5902082428299', 1::decimal, 527),
  ('CHEESE STICKS (MOZZARELLA STICKS) (0.6kg)', '5902082428282', 2::decimal, 487),
  ('CHICKEN SCHNITZEL (0.8kg)', '5902082427834', 4::decimal, 425),
  ('SLICED AND ROASTED BEEF KEBAB (0,8GR)', '5902082427988', 6::decimal, 660),
  ('CHICKEN KIPCORN (0.8kg)', '5902082427919', 4::decimal, 437)
) AS v(product_name, product_sku, quantity, unit_price);

COMMIT;

-- Verification queries:
-- SELECT COUNT(*) FROM customers;
-- SELECT COUNT(*) FROM orders;
-- SELECT COUNT(*) FROM order_items;
-- SELECT COUNT(*) FROM woo_migration_map;