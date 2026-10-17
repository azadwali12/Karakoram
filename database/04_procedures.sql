-- =====================================================================
-- File 04: Stored procedures
-- Multi-step business tasks. Each runs as one unit: if any step fails
-- (for example a trigger blocks it), every step is rolled back.
-- Call with:  CALL sp_name(...);
-- =====================================================================

-- ---------------------------------------------------------------------
-- P1. Create a booking with optional rented equipment, in one go.
--   p_equipment is a JSON list, e.g. '[{"equipment_id":1,"quantity":2}]'
--   Triggers T1 and T3 check seats, duplicates and stock.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_create_booking(
    p_customer_id   INT,
    p_departure_id  INT,
    p_group_size    INT,
    p_equipment     JSONB,
    INOUT p_booking_id INT DEFAULT NULL)
LANGUAGE plpgsql AS $$
DECLARE
    v_item JSONB;
BEGIN
    INSERT INTO booking (customer_id, departure_id, group_size, price_per_person)
    VALUES (p_customer_id, p_departure_id, p_group_size, 1)   -- real price set by trigger T1
    RETURNING booking_id INTO p_booking_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_equipment, '[]'::jsonb)) LOOP
        IF (v_item->>'quantity')::INT > 0 THEN
            INSERT INTO booking_equipment (booking_id, equipment_id, quantity, unit_price)
            VALUES (p_booking_id, (v_item->>'equipment_id')::INT,
                    (v_item->>'quantity')::INT, 0);              -- real price set by trigger T3
        END IF;
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- P2. Record a payment. Trigger T6 checks the amount, T7 confirms
--     the booking when the advance arrives.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_record_payment(
    p_booking_id   INT,
    p_amount       NUMERIC,
    p_method       VARCHAR,
    p_type         VARCHAR,
    p_reference    VARCHAR,
    INOUT p_payment_id INT DEFAULT NULL)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO payment (booking_id, amount, method, payment_type, reference_no)
    VALUES (p_booking_id, p_amount, p_method, p_type, NULLIF(p_reference, ''))
    RETURNING payment_id INTO p_payment_id;
END;
$$;

-- ---------------------------------------------------------------------
-- P3. Cancel a booking and refund under the cancellation policy:
--       30+ days before start  -> 90% of amount paid back
--       7 to 29 days           -> 50%
--       under 7 days           -> no refund
--     If the company cancels (p_by_company = TRUE), 100% is refunded.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_cancel_booking(
    p_booking_id   INT,
    p_by_company   BOOLEAN DEFAULT FALSE,
    INOUT p_refund NUMERIC DEFAULT NULL)
LANGUAGE plpgsql AS $$
DECLARE
    v_status     VARCHAR;
    v_start      DATE;
    v_days_left  INT;
    v_paid       NUMERIC;
    v_rate       NUMERIC;
BEGIN
    SELECT b.status, d.start_date INTO v_status, v_start
    FROM booking b JOIN departure d ON d.departure_id = b.departure_id
    WHERE b.booking_id = p_booking_id
    FOR UPDATE OF b;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Booking % not found', p_booking_id;
    END IF;
    IF v_status NOT IN ('Pending','Confirmed') THEN
        RAISE EXCEPTION 'Booking % is already %', p_booking_id, v_status;
    END IF;

    v_days_left := v_start - CURRENT_DATE;
    IF v_days_left <= 0 AND NOT p_by_company THEN
        RAISE EXCEPTION 'The trek has already started; booking cannot be cancelled';
    END IF;

    v_rate := CASE
                WHEN p_by_company     THEN 1.00
                WHEN v_days_left >= 30 THEN 0.90
                WHEN v_days_left >= 7  THEN 0.50
                ELSE 0
              END;

    v_paid   := fn_booking_paid(p_booking_id);
    p_refund := ROUND(v_paid * v_rate, 2);

    UPDATE booking SET status = 'Cancelled' WHERE booking_id = p_booking_id;  -- T2 returns gear

    IF p_refund > 0 THEN
        INSERT INTO payment (booking_id, amount, method, payment_type, reference_no)
        VALUES (p_booking_id, p_refund, 'Bank Transfer', 'Refund',
                'Refund ' || (v_rate * 100)::INT || '% - ' ||
                CASE WHEN p_by_company THEN 'company cancelled' ELSE v_days_left || ' days notice' END);
    END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- P4. Cancel a whole departure (bad weather, closed route, too few people):
--     every active booking is cancelled with a full refund.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_cancel_departure(p_departure_id INT, p_reason TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_booking RECORD;
    v_refund  NUMERIC;
BEGIN
    FOR v_booking IN SELECT booking_id FROM booking
                     WHERE departure_id = p_departure_id
                       AND status IN ('Pending','Confirmed') LOOP
        CALL sp_cancel_booking(v_booking.booking_id, TRUE, v_refund);
    END LOOP;

    UPDATE departure
    SET status = 'Cancelled',
        notes  = concat_ws(E'\n', notes, 'Cancelled on ' || CURRENT_DATE || ': ' || p_reason)
    WHERE departure_id = p_departure_id;
END;
$$;

-- ---------------------------------------------------------------------
-- P5. Delay a departure by some days (weather, landslide, permit delay).
--     Trigger T4 re-checks that the guide and porters are free on the
--     new dates; if not, the whole delay is rolled back.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_delay_departure(p_departure_id INT, p_days INT, p_reason TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status FROM departure WHERE departure_id = p_departure_id;
    IF v_status NOT IN ('Open','Closed') THEN
        RAISE EXCEPTION 'Only Open or Closed departures can be delayed (this one is %)', v_status;
    END IF;
    IF p_days NOT BETWEEN 1 AND 14 THEN
        RAISE EXCEPTION 'Delay must be between 1 and 14 days';
    END IF;

    UPDATE departure
    SET start_date = start_date + p_days,
        notes      = concat_ws(E'\n', notes,
                     'Delayed ' || p_days || ' day(s) on ' || CURRENT_DATE || ': ' || p_reason)
    WHERE departure_id = p_departure_id;
END;
$$;

-- ---------------------------------------------------------------------
-- P6. Close out a departure after the trek ends.
--     Confirmed bookings -> Completed (gear returned by T2).
--     Pending bookings (advance never paid) -> Cancelled as no-shows.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_complete_departure(p_departure_id INT)
LANGUAGE plpgsql AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status FROM departure WHERE departure_id = p_departure_id;
    IF v_status NOT IN ('Open','Closed') THEN
        RAISE EXCEPTION 'Departure % is %', p_departure_id, v_status;
    END IF;
    IF fn_departure_end_date(p_departure_id) >= CURRENT_DATE AND NOT fn_is_seeding() THEN
        RAISE EXCEPTION 'Trek has not finished yet (ends %)', fn_departure_end_date(p_departure_id);
    END IF;

    UPDATE booking SET status = 'Completed'
    WHERE departure_id = p_departure_id AND status = 'Confirmed';

    UPDATE booking SET status = 'Cancelled'
    WHERE departure_id = p_departure_id AND status = 'Pending';

    UPDATE departure SET status = 'Completed' WHERE departure_id = p_departure_id;
END;
$$;

-- ---------------------------------------------------------------------
-- P7. Assign (or change) the guide of a departure. T4 checks clashes.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_assign_guide(p_departure_id INT, p_guide_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE departure SET guide_id = p_guide_id WHERE departure_id = p_departure_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Departure % not found', p_departure_id;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- P8. Assign a porter to a departure. T5 checks clashes and load.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_assign_porter(p_departure_id INT, p_porter_id INT, p_load_kg INT)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO departure_porter (departure_id, porter_id, assigned_load_kg)
    VALUES (p_departure_id, p_porter_id, p_load_kg);
END;
$$;
