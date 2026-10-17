-- =====================================================================
-- File 03: Triggers
-- Each trigger enforces one or more business rules inside the database,
-- so the rules hold no matter which screen (or person) changes the data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- T1. Booking rules (BEFORE INSERT/UPDATE on booking)
--   R1  A booking can only be made on an 'Open' departure that has not started.
--   R2  The price per person is copied from the departure (customer cannot set it).
--   R3  Seats booked can never go above the departure's max group size.
--   R4  A customer can hold only one active booking on the same departure.
--   R5  Cancelled and Completed bookings are final.
--   R6  cancelled_at is filled automatically when a booking is cancelled.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_booking_rules()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_dep        departure%ROWTYPE;
    v_seats      INT;
BEGIN
    SELECT * INTO v_dep FROM departure WHERE departure_id = NEW.departure_id;

    IF TG_OP = 'INSERT' THEN
        -- R1
        IF v_dep.status <> 'Open' AND NOT fn_is_seeding() THEN
            RAISE EXCEPTION 'Departure % is not open for booking (status: %)',
                            NEW.departure_id, v_dep.status;
        END IF;
        IF v_dep.start_date <= CURRENT_DATE AND NOT fn_is_seeding() THEN
            RAISE EXCEPTION 'Departure % has already started; booking not allowed', NEW.departure_id;
        END IF;

        -- R2
        NEW.price_per_person := v_dep.price_per_person;

        -- R4
        IF EXISTS (SELECT 1 FROM booking
                   WHERE customer_id = NEW.customer_id
                     AND departure_id = NEW.departure_id
                     AND status IN ('Pending','Confirmed')) THEN
            RAISE EXCEPTION 'You already have an active booking on this departure';
        END IF;

        -- R3
        v_seats := fn_seats_booked(NEW.departure_id);
        IF v_seats + NEW.group_size > v_dep.max_group_size THEN
            RAISE EXCEPTION 'Not enough seats: % left on this departure, % requested',
                            v_dep.max_group_size - v_seats, NEW.group_size;
        END IF;

        IF NEW.status = 'Cancelled' THEN
            NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW());
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE ------------------------------------------------------------
    -- R5
    IF OLD.status IN ('Cancelled','Completed') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Booking % is % and cannot be changed', OLD.booking_id, OLD.status;
    END IF;

    -- Price and owner never change after creation
    NEW.price_per_person := OLD.price_per_person;
    NEW.customer_id      := OLD.customer_id;
    NEW.departure_id     := OLD.departure_id;

    -- R3 when group size is increased
    IF NEW.group_size > OLD.group_size AND NEW.status IN ('Pending','Confirmed') THEN
        v_seats := fn_seats_booked(NEW.departure_id) - OLD.group_size;
        IF v_seats + NEW.group_size > v_dep.max_group_size THEN
            RAISE EXCEPTION 'Not enough seats: % left on this departure',
                            v_dep.max_group_size - v_seats;
        END IF;
    END IF;

    -- R6
    IF NEW.status = 'Cancelled' AND OLD.status <> 'Cancelled' THEN
        NEW.cancelled_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_rules
BEFORE INSERT OR UPDATE ON booking
FOR EACH ROW EXECUTE FUNCTION trg_fn_booking_rules();

-- ---------------------------------------------------------------------
-- T1b. Deleting a booking (BEFORE DELETE on booking)
--   R26 Only an unpaid 'Pending' booking can be deleted. Anything else
--       must be cancelled, so the history stays.
--   Its equipment lines are removed first so stock goes back correctly.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_booking_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status <> 'Pending' OR EXISTS (SELECT 1 FROM payment WHERE booking_id = OLD.booking_id) THEN
        RAISE EXCEPTION 'Only unpaid Pending bookings can be deleted; cancel booking % instead',
                        OLD.booking_id;
    END IF;
    DELETE FROM booking_equipment WHERE booking_id = OLD.booking_id;  -- T3 returns stock
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_booking_delete
BEFORE DELETE ON booking
FOR EACH ROW EXECUTE FUNCTION trg_fn_booking_delete();

-- ---------------------------------------------------------------------
-- T2. Return rented gear to stock (AFTER UPDATE OF status on booking)
--   R7  When a booking is cancelled or completed, its rented equipment
--       goes back into stock.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_booking_return_equipment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IN ('Cancelled','Completed')
       AND OLD.status IN ('Pending','Confirmed') THEN
        UPDATE equipment e
        SET    quantity_available = e.quantity_available + be.quantity
        FROM   booking_equipment be
        WHERE  be.booking_id = NEW.booking_id
          AND  be.equipment_id = e.equipment_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_booking_return_equipment
AFTER UPDATE OF status ON booking
FOR EACH ROW EXECUTE FUNCTION trg_fn_booking_return_equipment();

-- ---------------------------------------------------------------------
-- T3. Equipment stock (on booking_equipment)
--   R8  Gear can only be rented if enough is in stock; stock goes down
--       when rented and back up if the rental line is removed.
--   R9  Rental price is copied from the equipment table.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_equipment_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_status     VARCHAR;
    v_available  INT;
    v_change     INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT status INTO v_status FROM booking WHERE booking_id = OLD.booking_id;
        -- Only give stock back if the booking still held it
        IF v_status IN ('Pending','Confirmed') THEN
            UPDATE equipment SET quantity_available = quantity_available + OLD.quantity
            WHERE equipment_id = OLD.equipment_id;
        END IF;
        RETURN OLD;
    END IF;

    SELECT status INTO v_status FROM booking WHERE booking_id = NEW.booking_id;
    IF v_status NOT IN ('Pending','Confirmed') THEN
        RAISE EXCEPTION 'Cannot change equipment on a % booking', v_status;
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT rent_price_per_trip INTO NEW.unit_price
        FROM equipment WHERE equipment_id = NEW.equipment_id;
        v_change := NEW.quantity;
    ELSE
        NEW.unit_price := OLD.unit_price;
        v_change := NEW.quantity - OLD.quantity;
    END IF;

    SELECT quantity_available INTO v_available
    FROM equipment WHERE equipment_id = NEW.equipment_id
    FOR UPDATE;   -- lock the row so two bookings cannot take the last item together

    IF v_change > v_available THEN
        RAISE EXCEPTION 'Only % unit(s) of this item in stock', v_available;
    END IF;

    UPDATE equipment SET quantity_available = quantity_available - v_change
    WHERE equipment_id = NEW.equipment_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_equipment_stock
BEFORE INSERT OR UPDATE OF quantity OR DELETE ON booking_equipment
FOR EACH ROW EXECUTE FUNCTION trg_fn_equipment_stock();

-- ---------------------------------------------------------------------
-- T4. Departure rules (BEFORE INSERT/UPDATE on departure)
--   R10 A guide cannot lead two departures whose dates overlap.
--   R11 Only active guides can be assigned.
--   R12 If the dates move (weather delay), assigned porters must also be free.
--   R13 Max group size cannot be set below seats already booked.
--   R14 Cancelled and Completed departures are final.
--   R15 A departure cannot be cancelled while it still has active bookings
--       (use sp_cancel_departure, which refunds customers first).
--   R16 New departures must start in the future.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_departure_rules()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_duration  INT;
    v_end       DATE;
    v_porter    RECORD;
BEGIN
    SELECT duration_days INTO v_duration FROM trek WHERE trek_id = NEW.trek_id;
    v_end := NEW.start_date + (v_duration - 1);

    IF TG_OP = 'INSERT' THEN
        IF NEW.start_date <= CURRENT_DATE AND NOT fn_is_seeding() THEN
            RAISE EXCEPTION 'A new departure must start after today';   -- R16
        END IF;
    ELSE
        IF OLD.status IN ('Cancelled','Completed') AND NEW.status <> OLD.status THEN
            RAISE EXCEPTION 'Departure % is % and cannot be reopened',
                            OLD.departure_id, OLD.status;               -- R14
        END IF;

        IF NEW.max_group_size < fn_seats_booked(NEW.departure_id) THEN
            RAISE EXCEPTION 'Max group size cannot be below seats already booked (%)',
                            fn_seats_booked(NEW.departure_id);          -- R13
        END IF;

        IF NEW.status = 'Cancelled' AND OLD.status <> 'Cancelled'
           AND EXISTS (SELECT 1 FROM booking
                       WHERE departure_id = NEW.departure_id
                         AND status IN ('Pending','Confirmed')) THEN
            RAISE EXCEPTION 'Departure has active bookings; use sp_cancel_departure to cancel and refund';  -- R15
        END IF;
    END IF;

    -- R10, R11: check guide when assigned, changed, or dates moved
    IF NEW.guide_id IS NOT NULL AND NEW.status <> 'Cancelled'
       AND (TG_OP = 'INSERT'
            OR NEW.guide_id   IS DISTINCT FROM OLD.guide_id
            OR NEW.start_date IS DISTINCT FROM OLD.start_date) THEN

        IF NOT (SELECT is_active FROM guide WHERE guide_id = NEW.guide_id) THEN
            RAISE EXCEPTION 'Guide % is not active', NEW.guide_id;
        END IF;

        IF fn_guide_is_busy(NEW.guide_id, NEW.start_date, v_end,
                            CASE WHEN TG_OP = 'UPDATE' THEN NEW.departure_id END) THEN
            RAISE EXCEPTION 'Guide % is already leading another trek between % and %',
                            NEW.guide_id, NEW.start_date, v_end;
        END IF;
    END IF;

    -- R12: dates moved, re-check every porter on this departure
    IF TG_OP = 'UPDATE' AND NEW.start_date IS DISTINCT FROM OLD.start_date THEN
        FOR v_porter IN SELECT porter_id FROM departure_porter
                        WHERE departure_id = NEW.departure_id LOOP
            IF fn_porter_is_busy(v_porter.porter_id, NEW.start_date, v_end, NEW.departure_id) THEN
                RAISE EXCEPTION 'Porter % is busy on the new dates (% to %)',
                                v_porter.porter_id, NEW.start_date, v_end;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_departure_rules
BEFORE INSERT OR UPDATE ON departure
FOR EACH ROW EXECUTE FUNCTION trg_fn_departure_rules();

-- ---------------------------------------------------------------------
-- T5. Porter assignment (BEFORE INSERT/UPDATE on departure_porter)
--   R17 A porter cannot work two departures whose dates overlap.
--   R18 Assigned load cannot be more than the porter's max load.
--   R19 Only active porters, and only on Open/Closed departures.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_porter_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_porter  porter%ROWTYPE;
    v_dep     departure%ROWTYPE;
BEGIN
    SELECT * INTO v_porter FROM porter    WHERE porter_id    = NEW.porter_id;
    SELECT * INTO v_dep    FROM departure WHERE departure_id = NEW.departure_id;

    IF NOT v_porter.is_active THEN
        RAISE EXCEPTION 'Porter % is not active', NEW.porter_id;
    END IF;
    IF v_dep.status NOT IN ('Open','Closed') AND NOT fn_is_seeding() THEN
        RAISE EXCEPTION 'Cannot assign porters to a % departure', v_dep.status;
    END IF;
    IF NEW.assigned_load_kg > v_porter.max_load_kg THEN
        RAISE EXCEPTION 'Load % kg is above this porter''s limit of % kg',
                        NEW.assigned_load_kg, v_porter.max_load_kg;
    END IF;
    IF TG_OP = 'INSERT'
       AND fn_porter_is_busy(NEW.porter_id, v_dep.start_date,
                             fn_departure_end_date(NEW.departure_id), NEW.departure_id) THEN
        RAISE EXCEPTION 'Porter % is already working on another trek on these dates', NEW.porter_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_porter_assignment
BEFORE INSERT OR UPDATE ON departure_porter
FOR EACH ROW EXECUTE FUNCTION trg_fn_porter_assignment();

-- ---------------------------------------------------------------------
-- T6. Payment rules (BEFORE INSERT on payment)
--   R20 No payments on a cancelled booking (only refunds).
--   R21 The first payment must be an 'Advance' of at least 30% of the total.
--   R22 Total paid can never go above the booking total.
--   R23 A refund can never be more than what was paid.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_payment_rules()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_status  VARCHAR;
    v_total   NUMERIC;
    v_paid    NUMERIC;
BEGIN
    SELECT status INTO v_status FROM booking WHERE booking_id = NEW.booking_id FOR UPDATE;
    v_total := fn_booking_total(NEW.booking_id);
    v_paid  := fn_booking_paid(NEW.booking_id);

    IF NEW.payment_type = 'Refund' THEN
        IF NEW.amount > v_paid THEN
            RAISE EXCEPTION 'Refund (%) is more than amount paid (%)', NEW.amount, v_paid;   -- R23
        END IF;
        RETURN NEW;
    END IF;

    IF v_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Booking % is cancelled; payments not accepted', NEW.booking_id;      -- R20
    END IF;
    IF v_status = 'Completed' AND NOT fn_is_seeding() THEN
        RAISE EXCEPTION 'Booking % is already completed', NEW.booking_id;
    END IF;

    IF v_paid = 0 THEN                                                                       -- R21
        IF NEW.payment_type <> 'Advance' THEN
            RAISE EXCEPTION 'The first payment must be an Advance';
        END IF;
        IF NEW.amount < ROUND(v_total * 0.30, 2) THEN
            RAISE EXCEPTION 'Advance must be at least 30%% of the total (minimum %)',
                            ROUND(v_total * 0.30, 2);
        END IF;
    ELSIF NEW.payment_type = 'Advance' THEN
        RAISE EXCEPTION 'Advance already paid; record this as a Balance payment';
    END IF;

    IF v_paid + NEW.amount > v_total THEN                                                    -- R22
        RAISE EXCEPTION 'Payment is more than the balance due (%)', v_total - v_paid;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_rules
BEFORE INSERT ON payment
FOR EACH ROW EXECUTE FUNCTION trg_fn_payment_rules();

-- ---------------------------------------------------------------------
-- T7. Auto-confirm booking (AFTER INSERT on payment)
--   R24 A 'Pending' booking becomes 'Confirmed' once the advance is paid.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_payment_confirm()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.payment_type = 'Advance' THEN
        UPDATE booking SET status = 'Confirmed'
        WHERE booking_id = NEW.booking_id AND status = 'Pending';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_payment_confirm
AFTER INSERT ON payment
FOR EACH ROW EXECUTE FUNCTION trg_fn_payment_confirm();

-- ---------------------------------------------------------------------
-- T8. Payments are a financial record: they are never edited or deleted.
--   R25 Mistakes are fixed with a Refund row, not by changing history.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_payment_readonly()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Payments cannot be edited or deleted; record a refund instead';
END;
$$;

CREATE TRIGGER trg_payment_readonly
BEFORE UPDATE OR DELETE ON payment
FOR EACH ROW EXECUTE FUNCTION trg_fn_payment_readonly();
