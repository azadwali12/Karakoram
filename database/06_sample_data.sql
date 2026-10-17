-- =====================================================================
-- File 06: Sample data
-- Dates are relative to the day you run this file (CURRENT_DATE), so
-- the demo always has upcoming treks, past treks and live bookings.
-- Every customer's password is:  password123
-- =====================================================================

-- Allow past dates for this session only (see fn_is_seeding in file 02)
SET app.seeding = 'on';

-- ---------------------------------------------------------------- Treks
INSERT INTO trek (trek_name, region, difficulty, max_altitude_m, duration_days, permit_required, base_price, description) VALUES
('K2 Base Camp & Gondogoro La', 'Baltistan',     'Extreme', 5585, 21, TRUE,  450000, 'Walk the Baltoro Glacier to Concordia and K2 Base Camp, returning over the Gondogoro La pass to Hushe.'),
('Fairy Meadows & Nanga Parbat Base Camp', 'Diamer', 'Moderate', 3967, 5, FALSE, 65000, 'Jeep to Tato, hike to Fairy Meadows, then on to Beyal Camp and Nanga Parbat (Rakhiot) Base Camp.'),
('Rakaposhi Base Camp', 'Nagar',                 'Moderate', 3300, 3, FALSE, 40000,  'Short trek from Minapin to Tagaphari with close views of Rakaposhi and the Minapin Glacier.'),
('Rush Lake', 'Nagar',                           'Hard',     4694, 8, FALSE, 120000, 'From Hopar over the Miar Glacier to one of the highest alpine lakes in the world.'),
('Snow Lake & Hispar La', 'Shigar / Nagar',      'Extreme', 5151, 18, TRUE,  380000, 'Biafo Glacier to Snow Lake and over Hispar La: one of the longest glacier systems outside the poles.'),
('Deosai Plains & Sheosar Lake', 'Skardu',       'Easy',     4114, 3, FALSE, 35000,  'High plateau camping, wildflowers and Himalayan brown bear territory.'),
('Patundas Meadows', 'Hunza',                    'Moderate', 4100, 4, FALSE, 55000,  'Cross the Passu Glacier to a high meadow with views of Passu Cones and Batura.'),
('Qurumbar Lake', 'Ghizer (Ishkoman / Yasin)',   'Hard',     4304, 6, FALSE, 70000,  'Remote high lake at the head of the Ishkoman valley, near the Wakhan border.');

-- --------------------------------------------------------------- Guides
INSERT INTO guide (full_name, phone, cnic, experience_years, languages, daily_rate) VALUES
('Ali Hassan',      '0355-4100001', '71501-1234561-1', 12, 'Urdu, English, Balti',         9000),
('Karim Baig',      '0355-4100002', '71101-1234562-3',  8, 'Urdu, English, Burushaski',    7500),
('Muhammad Sadiq',  '0355-4100003', '71501-1234563-5', 20, 'Urdu, English, Balti, French', 15000),
('Shah Nawaz',      '0355-4100004', '71201-1234564-7',  6, 'Urdu, English, Shina',         6500),
('Wali Khan',       '0355-4100005', '71401-1234565-9', 10, 'Urdu, English, Khowar, Burushaski', 8000),
('Ghulam Abbas',    '0355-4100006', '71501-1234566-1', 15, 'Urdu, English, Balti',         12000);

-- -------------------------------------------------------------- Porters
INSERT INTO porter (full_name, phone, max_load_kg, daily_rate) VALUES
('Hussain Ali',  '0355-5200001', 25, 3000),
('Ibrahim',      '0355-5200002', 25, 3000),
('Rehmat Ali',   '0355-5200003', 30, 3500),
('Akbar Hussain','0355-5200004', 25, 3000),
('Nadir Shah',   '0355-5200005', 25, 3000),
('Sultan',       '0355-5200006', 20, 2500),
('Qasim',        '0355-5200007', 30, 3500),
('Jaffar',       '0355-5200008', 25, 3000),
('Musa',         '0355-5200009', 25, 3000),
('Yousuf',       '0355-5200010', 25, 3000);

-- ------------------------------------------------------------ Equipment
INSERT INTO equipment (item_name, rent_price_per_trip, quantity_total, quantity_available) VALUES
('Four-season tent (2 person)', 15000, 20, 20),
('Sleeping bag (-20 C)',         4000, 40, 40),
('Down jacket',                  3500, 30, 30),
('Trekking poles (pair)',        1000, 40, 40),
('Crampons',                     2500, 20, 20),
('Duffel bag (90 L)',             800, 50, 50);

-- ------------------------------------------------------------ Customers
SELECT fn_register_customer('Ayesha Siddiqui', 'ayesha@example.com', '0300-1000001', '42101-1111111-1', 'Pakistani', 'Imran Siddiqui', '0300-2000001', 'password123');
SELECT fn_register_customer('Hamza Qureshi',   'hamza@example.com',  '0300-1000002', '42201-2222222-2', 'Pakistani', 'Sana Qureshi',   '0300-2000002', 'password123');
SELECT fn_register_customer('Emma Fischer',    'emma@example.com',   '+49-151-000003', 'C01X00T47',     'German',    'Lukas Fischer',  '+49-151-000099', 'password123');
SELECT fn_register_customer('Bilal Ahmed',     'bilal@example.com',  '0300-1000004', '35202-4444444-4', 'Pakistani', 'Ahmed Raza',     '0300-2000004', 'password123');
SELECT fn_register_customer('Zainab Hussain',  'zainab@example.com', '0300-1000005', '71501-5555555-5', 'Pakistani', 'Hussain Ali',    '0300-2000005', 'password123');
SELECT fn_register_customer('James Carter',    'james@example.com',  '+44-7700-900006', '533380006',    'British',   'Laura Carter',   '+44-7700-900099', 'password123');
SELECT fn_register_customer('Sara Malik',      'sara@example.com',   '0300-1000007', '37405-7777777-7', 'Pakistani', 'Tariq Malik',    '0300-2000007', 'password123');
SELECT fn_register_customer('Usman Tariq',     'usman@example.com',  '0300-1000008', '61101-8888888-8', 'Pakistani', 'Tariq Mehmood',  '0300-2000008', 'password123');

-- ----------------------------------------------------------- Departures
--  id  trek                start          guide
--   1  Fairy Meadows       60 days ago    Ali Hassan      (finished)
--   2  Deosai              35 days ago    Karim Baig      (finished)
--   3  Fairy Meadows       in 10 days     Ali Hassan
--   4  K2 Base Camp        in 45 days     Muhammad Sadiq
--   5  Rush Lake           in 20 days     Shah Nawaz
--   6  Qurumbar Lake       in 30 days     Wali Khan
--   7  Patundas            in 15 days     Karim Baig
--   8  Snow Lake           in 70 days     Ghulam Abbas
--   9  Rakaposhi BC        in 5 days      Karim Baig
--  10  Deosai              in 25 days     (no guide yet)
--  11  Fairy Meadows       in 40 days     Ali Hassan      (will be cancelled)
INSERT INTO departure (trek_id, guide_id, start_date, price_per_person, min_group_size, max_group_size) VALUES
(2, 1, CURRENT_DATE - 60,  62000, 4, 12),
(6, 2, CURRENT_DATE - 35,  35000, 3, 12),
(2, 1, CURRENT_DATE + 10,  65000, 4, 12),
(1, 3, CURRENT_DATE + 45, 450000, 4, 10),
(4, 4, CURRENT_DATE + 20, 120000, 3,  8),
(8, 5, CURRENT_DATE + 30,  72000, 3, 10),
(7, 2, CURRENT_DATE + 15,  55000, 2, 10),
(5, 6, CURRENT_DATE + 70, 380000, 4,  8),
(3, 2, CURRENT_DATE + 5,   40000, 2, 12),
(6, NULL, CURRENT_DATE + 25, 38000, 3, 12),
(2, 1, CURRENT_DATE + 40,  68000, 4, 12);

-- -------------------------------------------------------------- Porters
CALL sp_assign_porter(1, 1, 20);
CALL sp_assign_porter(1, 2, 20);
CALL sp_assign_porter(4, 1, 25);
CALL sp_assign_porter(4, 2, 25);
CALL sp_assign_porter(4, 3, 30);
CALL sp_assign_porter(4, 4, 25);
CALL sp_assign_porter(5, 5, 25);
CALL sp_assign_porter(5, 6, 20);
CALL sp_assign_porter(8, 7, 30);
CALL sp_assign_porter(8, 8, 25);
CALL sp_assign_porter(8, 9, 25);

-- -------------------------------------------- Bookings and payments
-- Past trek 1 (Fairy Meadows): two bookings, fully paid, then completed
CALL sp_create_booking(1, 1, 2, '[]');                                              -- booking 1
CALL sp_create_booking(2, 1, 3, '[{"equipment_id":4,"quantity":3}]');               -- booking 2
CALL sp_record_payment(1, ROUND(fn_booking_total(1) * 0.40, 2), 'JazzCash',      'Advance', 'JC-88120');
CALL sp_record_payment(1, fn_booking_total(1) - fn_booking_paid(1), 'Cash',      'Balance', NULL);
CALL sp_record_payment(2, ROUND(fn_booking_total(2) * 0.30, 2), 'Bank Transfer', 'Advance', 'MZN-55102');
CALL sp_record_payment(2, fn_booking_total(2) - fn_booking_paid(2), 'Bank Transfer', 'Balance', 'MZN-55940');
CALL sp_complete_departure(1);

-- Past trek 2 (Deosai): one booking with gear, completed
CALL sp_create_booking(3, 2, 4, '[{"equipment_id":1,"quantity":2},{"equipment_id":2,"quantity":4}]');  -- booking 3
CALL sp_record_payment(3, ROUND(fn_booking_total(3) * 0.50, 2), 'Card', 'Advance', 'VISA-2231');
CALL sp_record_payment(3, fn_booking_total(3) - fn_booking_paid(3), 'Card', 'Balance', 'VISA-2290');
CALL sp_complete_departure(2);

-- Give the past bookings and payments realistic dates (they were created "today").
-- The read-only payment trigger is paused only for this fix-up.
ALTER TABLE payment DISABLE TRIGGER trg_payment_readonly;
UPDATE booking SET booking_date = CURRENT_DATE - 100 WHERE booking_id IN (1, 2);
UPDATE booking SET booking_date = CURRENT_DATE - 70  WHERE booking_id = 3;
UPDATE payment SET payment_date = CURRENT_DATE - 95 + (payment_id * INTERVAL '1 day') WHERE booking_id IN (1, 2) AND payment_type = 'Advance';
UPDATE payment SET payment_date = CURRENT_DATE - 61 WHERE booking_id IN (1, 2) AND payment_type = 'Balance';
UPDATE payment SET payment_date = CURRENT_DATE - 68 WHERE booking_id = 3 AND payment_type = 'Advance';
UPDATE payment SET payment_date = CURRENT_DATE - 36 WHERE booking_id = 3 AND payment_type = 'Balance';
ALTER TABLE payment ENABLE TRIGGER trg_payment_readonly;

SET app.seeding = 'off';   -- from here on, every normal rule applies

-- Departure 3 (Fairy Meadows, in 10 days): only 2 people, not yet paid -> below minimum warning
CALL sp_create_booking(4, 3, 2, '[]');                                              -- booking 4

-- Departure 4 (K2 Base Camp)
CALL sp_create_booking(5, 4, 2, '[{"equipment_id":2,"quantity":2},{"equipment_id":3,"quantity":2},{"equipment_id":5,"quantity":2}]');  -- booking 5
CALL sp_record_payment(5, ROUND(fn_booking_total(5) * 0.30, 2), 'Bank Transfer', 'Advance', 'HBL-77001');
CALL sp_create_booking(6, 4, 1, '[{"equipment_id":5,"quantity":1}]');               -- booking 6
CALL sp_record_payment(6, ROUND(fn_booking_total(6) * 0.50, 2), 'Card', 'Advance', 'VISA-9012');
CALL sp_record_payment(6, fn_booking_total(6) - fn_booking_paid(6), 'Card', 'Balance', 'VISA-9077');

-- Departure 5 (Rush Lake)
CALL sp_create_booking(1, 5, 3, '[{"equipment_id":1,"quantity":2}]');               -- booking 7
CALL sp_record_payment(7, ROUND(fn_booking_total(7) * 0.35, 2), 'Easypaisa', 'Advance', 'EP-44120');

-- Departure 6 (Qurumbar Lake)
CALL sp_create_booking(7, 6, 2, '[]');                                              -- booking 8
CALL sp_record_payment(8, fn_booking_total(8), 'Bank Transfer', 'Advance', 'UBL-30011');
CALL sp_create_booking(2, 6, 4, '[{"equipment_id":6,"quantity":4}]');               -- booking 9 (pending)

-- Departure 7 (Patundas)
CALL sp_create_booking(8, 7, 5, '[{"equipment_id":4,"quantity":5}]');               -- booking 10
CALL sp_record_payment(10, ROUND(fn_booking_total(10) * 0.30, 2), 'JazzCash', 'Advance', 'JC-90233');

-- Departure 9 (Rakaposhi, in 5 days): almost full (11 of 12)
CALL sp_create_booking(3, 9, 6, '[]');                                              -- booking 11
CALL sp_record_payment(11, fn_booking_total(11), 'Card', 'Advance', 'VISA-4410');
CALL sp_create_booking(5, 9, 5, '[]');                                              -- booking 12
CALL sp_record_payment(12, ROUND(fn_booking_total(12) * 0.40, 2), 'Easypaisa', 'Advance', 'EP-51007');

-- Departure 8 (Snow Lake): customer pays advance, then cancels 70 days out -> 90% refund
CALL sp_create_booking(4, 8, 2, '[{"equipment_id":5,"quantity":2}]');               -- booking 13
CALL sp_record_payment(13, ROUND(fn_booking_total(13) * 0.30, 2), 'Bank Transfer', 'Advance', 'MCB-12001');
CALL sp_cancel_booking(13);

-- Departure 11 (Fairy Meadows, in 40 days): company cancels (road closed) -> 100% refund
CALL sp_create_booking(6, 11, 2, '[]');                                             -- booking 14
CALL sp_record_payment(14, ROUND(fn_booking_total(14) * 0.30, 2), 'Card', 'Advance', 'VISA-6620');
CALL sp_cancel_departure(11, 'Karakoram Highway closed at Tato by landslide');
