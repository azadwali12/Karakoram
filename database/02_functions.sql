-- =====================================================================
-- File 02: Helper functions
-- Small reusable calculations used by triggers, procedures, views
-- and the application.
-- =====================================================================

-- Seeding switch: sample data for past treks would be blocked by the
-- "no booking in the past" rule. The seed file turns this on for its
-- own session only. The app never sets it.
CREATE OR REPLACE FUNCTION fn_is_seeding()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT COALESCE(current_setting('app.seeding', true), 'off') = 'on';
$$;

-- Last day of a departure = start date + trek length - 1
CREATE OR REPLACE FUNCTION fn_departure_end_date(p_departure_id INT)
RETURNS DATE LANGUAGE sql STABLE AS $$
    SELECT d.start_date + (t.duration_days - 1)
    FROM departure d
    JOIN trek t ON t.trek_id = d.trek_id
    WHERE d.departure_id = p_departure_id;
$$;

-- Seats taken on a departure (cancelled bookings do not count)
CREATE OR REPLACE FUNCTION fn_seats_booked(p_departure_id INT)
RETURNS INT LANGUAGE sql STABLE AS $$
    SELECT COALESCE(SUM(group_size), 0)::INT
    FROM booking
    WHERE departure_id = p_departure_id
      AND status <> 'Cancelled';
$$;

-- Full amount a booking costs: seats + rented equipment
CREATE OR REPLACE FUNCTION fn_booking_total(p_booking_id INT)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
    SELECT b.group_size * b.price_per_person
         + COALESCE((SELECT SUM(be.quantity * be.unit_price)
                     FROM booking_equipment be
                     WHERE be.booking_id = b.booking_id), 0)
    FROM booking b
    WHERE b.booking_id = p_booking_id;
$$;

-- Net amount paid so far (payments in minus refunds out)
CREATE OR REPLACE FUNCTION fn_booking_paid(p_booking_id INT)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
    SELECT COALESCE(SUM(CASE WHEN payment_type = 'Refund' THEN -amount ELSE amount END), 0)
    FROM payment
    WHERE booking_id = p_booking_id;
$$;

-- TRUE if a guide is already leading another (non-cancelled) departure
-- whose dates overlap [p_start, p_end]
CREATE OR REPLACE FUNCTION fn_guide_is_busy(p_guide_id INT, p_start DATE, p_end DATE,
                                            p_exclude_departure INT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM departure d
        JOIN trek t ON t.trek_id = d.trek_id
        WHERE d.guide_id = p_guide_id
          AND d.departure_id <> COALESCE(p_exclude_departure, -1)
          AND d.status <> 'Cancelled'
          AND d.start_date <= p_end
          AND d.start_date + (t.duration_days - 1) >= p_start
    );
$$;

-- Same check for porters
CREATE OR REPLACE FUNCTION fn_porter_is_busy(p_porter_id INT, p_start DATE, p_end DATE,
                                             p_exclude_departure INT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM departure_porter dp
        JOIN departure d ON d.departure_id = dp.departure_id
        JOIN trek t      ON t.trek_id = d.trek_id
        WHERE dp.porter_id = p_porter_id
          AND d.departure_id <> COALESCE(p_exclude_departure, -1)
          AND d.status <> 'Cancelled'
          AND d.start_date <= p_end
          AND d.start_date + (t.duration_days - 1) >= p_start
    );
$$;

-- Register a customer. Password is hashed with bcrypt; never stored as plain text.
CREATE OR REPLACE FUNCTION fn_register_customer(
    p_full_name VARCHAR, p_email VARCHAR, p_phone VARCHAR, p_cnic_passport VARCHAR,
    p_nationality VARCHAR, p_emergency_name VARCHAR, p_emergency_phone VARCHAR,
    p_password TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    v_id INT;
BEGIN
    IF length(p_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters';
    END IF;

    INSERT INTO customer (full_name, email, phone, cnic_passport, nationality,
                          emergency_contact_name, emergency_contact_phone, password_hash)
    VALUES (p_full_name, lower(p_email), p_phone, p_cnic_passport,
            COALESCE(NULLIF(p_nationality, ''), 'Pakistani'),
            p_emergency_name, p_emergency_phone, crypt(p_password, gen_salt('bf')))
    RETURNING customer_id INTO v_id;

    RETURN v_id;
END;
$$;

-- Log in: returns customer_id if email + password match, else NULL
CREATE OR REPLACE FUNCTION fn_customer_login(p_email VARCHAR, p_password TEXT)
RETURNS INT LANGUAGE sql STABLE AS $$
    SELECT customer_id
    FROM customer
    WHERE email = lower(p_email)
      AND password_hash = crypt(p_password, password_hash);
$$;
