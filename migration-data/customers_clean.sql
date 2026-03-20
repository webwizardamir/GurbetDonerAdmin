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
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza Aro', 'Pizza Aro', 'PizzaAro@gmail.com', NULL, 'Wattstraat 7A', 'Zoetermeer', '2723 PZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzaAro@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Keizer Snacks', 'Keizer Snacks', 'keizersnacks@gmail.com', NULL, 'Keizerstraat 356a', 'Den Haag', '2586 SH', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'keizersnacks@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Doner en Zo', 'Doner en Zo', 'donerzo@gmail.com', NULL, 'Westpolderstraat 82', 'Berkel en Rodenrijs', '2652 KW', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'donerzo@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Baran cafe turks restaurant', 'Baran cafe turks restaurant', 'Barancafeturksrestaurant@gmail.com', NULL, 'Quirinegang 83', 'Zoetermeer', '2719 CG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Barancafeturksrestaurant@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Eetcafe Elif', 'Eetcafe Elif', 'EetcafeElif@gmail.com', NULL, 'Dedemsvaartweg', 'Den Haag', '2545 AX', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'EetcafeElif@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Luiten Food', NULL, 'Rick@luitenfood.com', '0031 71 580 8020', 'Klaverblad 11', 'Leidschendam', '2266 JK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Luiten Food', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Sultan Ahmet BV', 'Sultan Ahmet BV', 'SultanAhmetBV@gmail.com', NULL, 'Watermolen 6', 'Leiden', '2317 ST', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SultanAhmetBV@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('San Marina', 'San Marina', 'sanmarina@gmail.com', NULL, 'Gerrit Achterberghove', 'Zoetermeer', '2717 XZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'sanmarina@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Seryana', 'Seryana', 'Seryana@gmail.com', NULL, 'Hoogstraat 3', 'Gouda', '2801 HG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Seryana@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Saray PideHuis', 'Saray PideHuis', 'SarayPideHuis@gmail.com', NULL, 'Steenstraat 20', 'Leiden', '2312 BW', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SarayPideHuis@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Ak-Al Bakkerij Herenstraat', 'Ak-Al Bakkerij Herenstraat', 'Ak-AlBakkerijHerenstraat@gmail.com', NULL, 'Herenstraat 4', 'Leiden', '2313 AK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Ak-AlBakkerijHerenstraat@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('ZAM ZAM XL', 'ZAM ZAM XL', 'ZamZamXl@gmail.com', NULL, 'Raamsteeg 73', 'Leiden', '2311 PM', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'ZamZamXl@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('baba de shoarmakoning', 'baba de shoarmakoning', 'babadeshoarmakoningbeverwijk@gmail.com', NULL, 'Kuenenplein 3', 'Beverwijk', '1944 RK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'babadeshoarmakoningbeverwijk@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Snackbar Onder Den Toren', 'Snackbar Onder Den Toren', 'SnackbarOnderDenToren@gmail.com', NULL, 'Voorstraat 3', 'Wijk aan Zee', '1949 BG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SnackbarOnderDenToren@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('EetCafe De haven', 'EetCafe De haven', 'Eetcafedehaven@gmail.com', NULL, 'Calandakade 170', 'Den Haag', '2521AA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Eetcafedehaven@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Dicle', 'Dicle', 'Dicle@live.nl', NULL, 'Kempstraat 17', 'Den Haag', '2572 GA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Dicle@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Efe Woerden', 'Efe Woerden', 'EfeWoerden@gmail.com', NULL, 'Tournoysveld 111', 'Woerden', '3443 ES', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'EfeWoerden@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Oranje Oosterheem', 'Oranje Oosterheem', 'Oranjesupermarket@live.nl', NULL, 'Westerschelde 364', 'Zoetermeer', '2721 NN', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Oranjesupermarket@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('MD Food', 'MD Food', 'MdFood@live.nl', NULL, 'Petuniatuin 8', 'Zoetermeer', '2724 NA', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'MdFood@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Can Market', 'Can Market', 'CanSupermarkt@gmail.com', NULL, 'Kon. Wilhelminalaan 68-70', 'Gorinchem', '4205 EZ', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'CanSupermarkt@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Baronie Doner Place', 'Baronie Doner Place', 'BaronieDonerPlace@live.nl', NULL, 'Baronie 100', 'Alphen aan den Rijn', '2404 XH', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'BaronieDonerPlace@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Food Staion', 'Food Staion', 'FoodStation@gmail.com', NULL, 'Stieltjesweg 232', 'Delft', '2628 CK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'FoodStation@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Snackbar Downtown', 'Snackbar Downtown', 'Downtown@live.nl', NULL, 'Breestraat 3 A', 'Leiden', '2311 CG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Downtown@live.nl', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizza Express', 'Pizza Express', 'PizzaExpressvoorschoten@gmail.com', NULL, 'Schoolstraat 103', 'Voorschoten', '2251 BG', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzaExpressvoorschoten@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('bakkerij Bereket', 'bakkerij Bereket', 'Bakkerijbereketdenhaag@gmail.com', NULL, 'Paul Krugerlaan 36 -40', 'Den Haag', '2571 HK', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'Bakkerijbereketdenhaag@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Durum Evi', 'Durum Evi', 'DurumEvitandir@gmail.com', NULL, 'Paul Krugerplein 7', 'Den Haag', '2571 HT', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'DurumEvitandir@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Supermarkt Joud', 'Supermarkt Joud', 'SupermarktJoud@gmail.com', NULL, 'Venneperstraat 12', 'Nieuw-Vennep', '2151 AR', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'SupermarktJoud@gmail.com', id FROM new_cust;
WITH new_cust AS (
  INSERT INTO customers (company_name, contact_person, email, phone, billing_street, billing_city, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_postal_code, shipping_country, shipping_same_as_billing)
  VALUES ('Pizzeria & Grillroom Bomonti', 'Pizzeria & Grillroom Bomonti', 'PizzeriaGrillroomBomonti@gmail.com', NULL, 'Van Staverenstraat 24', 'Reeuwijk', '2811 TL', 'NL', NULL, NULL, NULL, 'NL', TRUE)
  RETURNING id
)
INSERT INTO woo_migration_map (entity_type, woo_id, new_id)
SELECT 'customer', 'PizzeriaGrillroomBomonti@gmail.com', id FROM new_cust;
