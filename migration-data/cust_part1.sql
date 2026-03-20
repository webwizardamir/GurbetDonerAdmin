WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Orange Food Group B.V.', NULL, 'ssrzkn@gmail.com', NULL, 'Doctor Wiardi Beckmansingel 13', 'Vlaardingen', '3132CL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Orange Food Group B.V.', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Drean Kebab 1', NULL, 'dream@kebab.nl', NULL, 'Herenstraat 88A', 'Voorhout', '2215KK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Drean Kebab 1', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dream Kebab Katwijk', 'Dream Kebab Katwijk', 'Dreamkebab@katwijk.nl', NULL, 'Taatedam 2', 'Katwijk aan zee', '2225 BN', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Dreamkebab@katwijk.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dream Kebab Noordwijkerhout', 'Dream Kebab Noordwijkerhout', 'dreamkebab@noordwijkerhour.nl', NULL, 'Zeestraat 4', 'Noordwijkerhout', '2211XG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'dreamkebab@noordwijkerhour.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Sohbet bbq cafe Restaurant', 'Sohbet bbq cafe Restaurant', 'Sohbet@denhaag.nl', NULL, 'Calandkade 168', 'Den Haag', '2521AA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Sohbet@denhaag.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Bakkerij Hesse Place', 'Bakkerij Hesse Place', 'info@bakkerijhesseplace.nl', NULL, 'Hesseplaats 71', 'Rotterdam', '3069EA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'info@bakkerijhesseplace.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ak-AL Eethuis', 'Ak-AL Eethuis', 'akal-eethuis-alpenaanderijn@hotmail.com', NULL, 'HerenHof 287', 'Alpen aan den Rijn', '2402DL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'akal-eethuis-alpenaanderijn@hotmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Salama Doner Pizza', 'Salama Doner Pizza', 'Salama@gmail.com', NULL, 'Stevensbloem 7', 'Leiden', '2331JA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Salama@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ons Bakkertje de veen', 'Ons Bakkertje de veen', 'Ons@gmail.com', NULL, 'Noordeinde 13', 'Roelofarendsveen', '2371CM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Ons@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizzeria Roomburg', 'Pizzeria Roomburg', 'PizzeriaRoomburg@gmail.com', NULL, 'IJsselkade 43', 'Leiden', '2314VM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzeriaRoomburg@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza Bella Maria', 'Pizza Bella Maria', 'Pizzabellamaria@gmail.com', NULL, 'Van Zeggelenlaan 81', 'Den Haag', '2524 AC', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Pizzabellamaria@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ak-Mir Doner', 'Ak-Mir Doner', 'akmirdoner@gmail.com', NULL, 'Korevaarstraat 4', 'Leiden', '2311 JS', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'akmirdoner@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Bakkerij de Hazelaar', 'Bakkerij de Hazelaar', 'BakkerijdeHazelaar@gmail.com', NULL, 'Hazelaarstraat 10', 'Woerden', '3442 EN', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'BakkerijdeHazelaar@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Hoornes Supermarkt en Bakkerij', 'Hoornes Supermarkt en Bakkerij', 'HoornesSupermarktenBakkerij@gmail.com', NULL, 'Hoorneslaan 329', 'Katwijk aan Zee', '2221 GA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'HoornesSupermarktenBakkerij@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Massada Roelofarendsveen', 'Massada Roelofarendsveen', 'MassadaRoelofarendsveen@gmail.com', NULL, 'Noordplein 3', 'Roelofarendsveen', '2371 DA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'MassadaRoelofarendsveen@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Indoor SpeelParadijs ZuiderPark', 'Indoor SpeelParadijs ZuiderPark', 'INDOORSPEELPARADIJSZUIDERPARK@gmail.com', NULL, 'Mr. P. Droogleever Fortuynweg 79', 'Den Haag', '2533SP', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'INDOORSPEELPARADIJSZUIDERPARK@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('De Gouden Wok Zuiderpark', 'De Gouden Wok Zuiderpark', 'DeGoudenWokZuiderpark@gmail.com', NULL, 'Meester P. Droogleever Fortuynweg 69', 'Den Haag', '2533 SP', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'DeGoudenWokZuiderpark@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizzeria & Grillroom Hawaii Naaldwijk', 'Pizzeria & Grillroom Hawaii Naaldwijk', 'PizzeriaGrillroomHawaiiNaaldwijk@gmail.com', NULL, 'Pr. Julianastraat 22', 'Naaldwijk', '2671EK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzeriaGrillroomHawaiiNaaldwijk@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('De Rotonde Kebab', 'De Rotonde Kebab', 'DeRotondeKebab@gmail.com', NULL, 'Slotermeerlaan 3', 'Amsterdam', '1064GX', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'DeRotondeKebab@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza BellaDonna', 'Pizza BellaDonna', 'PizzaBellaDonna@gmail.com', NULL, 'Lijnbaan 293', 'Zoetermeer', '2728AH', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzaBellaDonna@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Alesta Food', 'Alesta Food', 'AlestaFood@gmail.com', NULL, 'Ambachtsherenpad 12, 2722 BS Zoetermeer', 'Zoetermeer', '2722 BS', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'AlestaFood@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Karadag Food', 'Karadag Food', 'KaradagFood@gmail.com', NULL, 'Meeuwenveld 16', 'Zoetermeer', '2727 AK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'KaradagFood@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Flames', 'Flames', 'Flameshoofdorp@gmail.com', NULL, 'Almkerkplein 2A', 'Hoofddorp', '2134 DR', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Flameshoofdorp@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('La Lupa', 'La Lupa', 'Lalupa@live.nl', NULL, 'Prins Bernhardstraat 58', 'Koudekerk aan den Rijn', '2396 GM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Lalupa@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ramses', 'Ramses', 'ramses@gmail.com', NULL, 'Schoolstraat 30', 'Den Haag', '2511 AX', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'ramses@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Eethuis Lage Veld', 'Eethuis Lage Veld', 'Lageveld@gmail.com', NULL, 'Parijsplein 12', 'Den Haag', '2548 VL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Lageveld@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Jacks corner', 'Jacks corner', 'Jackscorner@gmail.com', NULL, 'Leemansplein 544', 'Den Haag', '2521 EJ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Jackscorner@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dream Kebab Voorhout', 'Dream Kebab Voorhout', 'dream@kebab.nl', NULL, 'Herenstraat 88A', 'Voorhout', '2215KK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'dream@kebab.nl', id FROM new_cust;
