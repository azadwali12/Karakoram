-- =====================================================================
-- Trekking & Expedition Management System
-- CS 341 Database Systems, Fall 2026
-- File 01: Tables and constraints (DDL)
-- =====================================================================
-- Entities (8): customer, trek, departure, booking, payment, guide,
--               porter, equipment
-- Bridge tables for many-to-many relationships (2):
--               departure_porter, booking_equipment
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- used to hash customer passwords

-- ---------------------------------------------------------------------
-- CUSTOMER: a person who books treks
-- ---------------------------------------------------------------------
CREATE TABLE customer (
    customer_id              SERIAL PRIMARY KEY,
    full_name                VARCHAR(100) NOT NULL,
    email                    VARCHAR(120) NOT NULL UNIQUE,
    phone                    VARCHAR(20)  NOT NULL,
    cnic_passport            VARCHAR(30)  NOT NULL UNIQUE,  -- needed for trekking permits
    nationality              VARCHAR(50)  NOT NULL DEFAULT 'Pakistani',
    emergency_contact_name   VARCHAR(100) NOT NULL,
    emergency_contact_phone  VARCHAR(20)  NOT NULL,
    password_hash            TEXT         NOT NULL,
    created_at               TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_customer_email CHECK (email LIKE '%_@_%._%')
);

-- ---------------------------------------------------------------------
-- GUIDE: leads a departure. One guide leads many departures over time.
-- ---------------------------------------------------------------------
CREATE TABLE guide (
    guide_id          SERIAL PRIMARY KEY,
    full_name         VARCHAR(100)  NOT NULL,
    phone             VARCHAR(20)   NOT NULL,
    cnic              VARCHAR(20)   NOT NULL UNIQUE,
    experience_years  INT           NOT NULL DEFAULT 0,
    languages         VARCHAR(150)  NOT NULL DEFAULT 'Urdu, English',
    daily_rate        NUMERIC(10,2) NOT NULL,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_guide_experience CHECK (experience_years >= 0),
    CONSTRAINT chk_guide_rate       CHECK (daily_rate > 0)
);

-- ---------------------------------------------------------------------
-- PORTER: carries loads on a departure
-- ---------------------------------------------------------------------
CREATE TABLE porter (
    porter_id    SERIAL PRIMARY KEY,
    full_name    VARCHAR(100)  NOT NULL,
    phone        VARCHAR(20)   NOT NULL,
    max_load_kg  INT           NOT NULL DEFAULT 25,
    daily_rate   NUMERIC(10,2) NOT NULL,
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_porter_load CHECK (max_load_kg BETWEEN 10 AND 40),
    CONSTRAINT chk_porter_rate CHECK (daily_rate > 0)
);

-- ---------------------------------------------------------------------
-- TREK: a route the company offers (e.g. K2 Base Camp)
-- ---------------------------------------------------------------------
CREATE TABLE trek (
    trek_id          SERIAL PRIMARY KEY,
    trek_name        VARCHAR(100)  NOT NULL UNIQUE,
    region           VARCHAR(60)   NOT NULL,
    difficulty       VARCHAR(10)   NOT NULL,
    max_altitude_m   INT           NOT NULL,
    duration_days    INT           NOT NULL,
    permit_required  BOOLEAN       NOT NULL DEFAULT FALSE,
    base_price       NUMERIC(10,2) NOT NULL,
    description      TEXT,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_trek_difficulty CHECK (difficulty IN ('Easy','Moderate','Hard','Extreme')),
    CONSTRAINT chk_trek_altitude   CHECK (max_altitude_m BETWEEN 500 AND 8611),
    CONSTRAINT chk_trek_duration   CHECK (duration_days BETWEEN 1 AND 60),
    CONSTRAINT chk_trek_price      CHECK (base_price > 0)
);

-- ---------------------------------------------------------------------
-- DEPARTURE: one dated run of a trek with a group (e.g. K2 BC, 5 July)
-- end date is NOT stored: it is start_date + trek.duration_days - 1
-- (storing it would be a derived value and could go out of sync)
-- ---------------------------------------------------------------------
CREATE TABLE departure (
    departure_id      SERIAL PRIMARY KEY,
    trek_id           INT           NOT NULL REFERENCES trek(trek_id) ON DELETE RESTRICT,
    guide_id          INT           REFERENCES guide(guide_id) ON DELETE SET NULL,  -- assigned later
    start_date        DATE          NOT NULL,
    price_per_person  NUMERIC(10,2) NOT NULL,   -- can differ from base price (season)
    min_group_size    INT           NOT NULL DEFAULT 2,
    max_group_size    INT           NOT NULL DEFAULT 12,
    status            VARCHAR(10)   NOT NULL DEFAULT 'Open',
    notes             TEXT,
    CONSTRAINT chk_dep_price  CHECK (price_per_person > 0),
    CONSTRAINT chk_dep_sizes  CHECK (min_group_size >= 1 AND max_group_size >= min_group_size),
    CONSTRAINT chk_dep_status CHECK (status IN ('Open','Closed','Cancelled','Completed')),
    CONSTRAINT uq_trek_start  UNIQUE (trek_id, start_date)
);

-- ---------------------------------------------------------------------
-- DEPARTURE_PORTER: porters hired for a departure (M:N)
-- ---------------------------------------------------------------------
CREATE TABLE departure_porter (
    departure_id  INT NOT NULL REFERENCES departure(departure_id) ON DELETE CASCADE,
    porter_id     INT NOT NULL REFERENCES porter(porter_id)       ON DELETE RESTRICT,
    assigned_load_kg INT NOT NULL DEFAULT 20,
    PRIMARY KEY (departure_id, porter_id),
    CONSTRAINT chk_dp_load CHECK (assigned_load_kg > 0)
);

-- ---------------------------------------------------------------------
-- BOOKING: a customer reserves seats on a departure
-- price_per_person is copied at booking time so later price changes
-- do not change what the customer agreed to pay.
-- ---------------------------------------------------------------------
CREATE TABLE booking (
    booking_id        SERIAL PRIMARY KEY,
    customer_id       INT           NOT NULL REFERENCES customer(customer_id)   ON DELETE RESTRICT,
    departure_id      INT           NOT NULL REFERENCES departure(departure_id) ON DELETE RESTRICT,
    group_size        INT           NOT NULL,
    price_per_person  NUMERIC(10,2) NOT NULL,
    booking_date      TIMESTAMP     NOT NULL DEFAULT NOW(),
    status            VARCHAR(10)   NOT NULL DEFAULT 'Pending',
    cancelled_at      TIMESTAMP,
    CONSTRAINT chk_booking_size   CHECK (group_size BETWEEN 1 AND 20),
    CONSTRAINT chk_booking_price  CHECK (price_per_person > 0),
    CONSTRAINT chk_booking_status CHECK (status IN ('Pending','Confirmed','Cancelled','Completed')),
    CONSTRAINT chk_booking_cancel CHECK ((status = 'Cancelled') = (cancelled_at IS NOT NULL))
);

-- ---------------------------------------------------------------------
-- EQUIPMENT: gear the company rents out (tents, sleeping bags...)
-- ---------------------------------------------------------------------
CREATE TABLE equipment (
    equipment_id        SERIAL PRIMARY KEY,
    item_name           VARCHAR(80)   NOT NULL UNIQUE,
    rent_price_per_trip NUMERIC(10,2) NOT NULL,
    quantity_total      INT           NOT NULL,
    quantity_available  INT           NOT NULL,
    CONSTRAINT chk_eq_price CHECK (rent_price_per_trip >= 0),
    CONSTRAINT chk_eq_qty   CHECK (quantity_total >= 0
                                   AND quantity_available BETWEEN 0 AND quantity_total)
);

-- ---------------------------------------------------------------------
-- BOOKING_EQUIPMENT: gear rented with a booking (M:N)
-- ---------------------------------------------------------------------
CREATE TABLE booking_equipment (
    booking_id    INT           NOT NULL REFERENCES booking(booking_id)     ON DELETE CASCADE,
    equipment_id  INT           NOT NULL REFERENCES equipment(equipment_id) ON DELETE RESTRICT,
    quantity      INT           NOT NULL,
    unit_price    NUMERIC(10,2) NOT NULL,   -- price at time of rental
    PRIMARY KEY (booking_id, equipment_id),
    CONSTRAINT chk_be_qty   CHECK (quantity > 0),
    CONSTRAINT chk_be_price CHECK (unit_price >= 0)
);

-- ---------------------------------------------------------------------
-- PAYMENT: money in (Advance/Balance) or out (Refund) for a booking
-- ---------------------------------------------------------------------
CREATE TABLE payment (
    payment_id    SERIAL PRIMARY KEY,
    booking_id    INT           NOT NULL REFERENCES booking(booking_id) ON DELETE RESTRICT,
    amount        NUMERIC(10,2) NOT NULL,
    payment_date  TIMESTAMP     NOT NULL DEFAULT NOW(),
    method        VARCHAR(20)   NOT NULL,
    payment_type  VARCHAR(10)   NOT NULL,
    reference_no  VARCHAR(50),
    CONSTRAINT chk_pay_amount CHECK (amount > 0),
    CONSTRAINT chk_pay_method CHECK (method IN ('Cash','Bank Transfer','JazzCash','Easypaisa','Card')),
    CONSTRAINT chk_pay_type   CHECK (payment_type IN ('Advance','Balance','Refund'))
);

-- Indexes on foreign keys used in joins and filters
CREATE INDEX idx_departure_trek   ON departure(trek_id);
CREATE INDEX idx_departure_guide  ON departure(guide_id);
CREATE INDEX idx_departure_start  ON departure(start_date);
CREATE INDEX idx_booking_customer ON booking(customer_id);
CREATE INDEX idx_booking_departure ON booking(departure_id);
CREATE INDEX idx_payment_booking  ON payment(booking_id);
