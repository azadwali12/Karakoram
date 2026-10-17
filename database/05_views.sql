-- =====================================================================
-- File 05: Views
-- Saved queries that join several tables, so the app reads one simple
-- "table" instead of repeating long joins on every screen.
-- =====================================================================

-- V1. Every departure with its trek, dates, guide and seat count.
--     Used by: Browse Treks, Trek Details, Admin Departures, Dashboard
CREATE OR REPLACE VIEW v_departure_overview AS
SELECT d.departure_id,
       d.trek_id,
       t.trek_name,
       t.region,
       t.difficulty,
       t.max_altitude_m,
       t.duration_days,
       d.start_date,
       d.start_date + (t.duration_days - 1)               AS end_date,
       d.price_per_person,
       d.min_group_size,
       d.max_group_size,
       fn_seats_booked(d.departure_id)                    AS seats_booked,
       d.max_group_size - fn_seats_booked(d.departure_id) AS seats_left,
       d.status,
       d.guide_id,
       g.full_name                                        AS guide_name,
       (SELECT COUNT(*) FROM departure_porter dp
        WHERE dp.departure_id = d.departure_id)::INT      AS porter_count,
       -- warning flag: starts within 14 days and still below minimum group size
       (d.status = 'Open'
        AND d.start_date - CURRENT_DATE BETWEEN 0 AND 14
        AND fn_seats_booked(d.departure_id) < d.min_group_size) AS below_minimum,
       d.notes
FROM departure d
JOIN trek t       ON t.trek_id  = d.trek_id
LEFT JOIN guide g ON g.guide_id = d.guide_id;

-- V2. Every booking with money totals.
--     Used by: My Bookings, Admin Bookings, Payments
CREATE OR REPLACE VIEW v_booking_summary AS
SELECT b.booking_id,
       b.customer_id,
       c.full_name                                AS customer_name,
       c.email                                    AS customer_email,
       c.phone                                    AS customer_phone,
       b.departure_id,
       t.trek_name,
       d.start_date,
       d.start_date + (t.duration_days - 1)       AS end_date,
       b.group_size,
       b.price_per_person,
       b.group_size * b.price_per_person          AS seats_amount,
       fn_booking_total(b.booking_id) - b.group_size * b.price_per_person AS equipment_amount,
       fn_booking_total(b.booking_id)             AS total_amount,
       fn_booking_paid(b.booking_id)              AS amount_paid,
       CASE WHEN b.status = 'Cancelled' THEN 0
            ELSE fn_booking_total(b.booking_id) - fn_booking_paid(b.booking_id)
       END                                        AS balance_due,
       b.status,
       b.booking_date,
       b.cancelled_at
FROM booking b
JOIN customer c  ON c.customer_id  = b.customer_id
JOIN departure d ON d.departure_id = b.departure_id
JOIN trek t      ON t.trek_id      = d.trek_id;

-- V3. Upcoming work for each guide and porter (staff schedule).
--     Used by: Admin Staff screens
CREATE OR REPLACE VIEW v_staff_schedule AS
SELECT 'Guide'::TEXT AS role, g.guide_id AS staff_id, g.full_name,
       v.departure_id, v.trek_name, v.start_date, v.end_date, v.status
FROM guide g
JOIN v_departure_overview v ON v.guide_id = g.guide_id
WHERE v.status IN ('Open','Closed')
UNION ALL
SELECT 'Porter', p.porter_id, p.full_name,
       v.departure_id, v.trek_name, v.start_date, v.end_date, v.status
FROM porter p
JOIN departure_porter dp    ON dp.porter_id   = p.porter_id
JOIN v_departure_overview v ON v.departure_id = dp.departure_id
WHERE v.status IN ('Open','Closed');

-- V4. Revenue and demand per trek.
--     Used by: Admin Dashboard
CREATE OR REPLACE VIEW v_trek_performance AS
SELECT t.trek_id,
       t.trek_name,
       t.region,
       COUNT(DISTINCT d.departure_id)                                   AS departures,
       COUNT(b.booking_id) FILTER (WHERE b.status <> 'Cancelled')       AS bookings,
       COALESCE(SUM(b.group_size) FILTER (WHERE b.status <> 'Cancelled'), 0) AS trekkers,
       COALESCE(SUM(fn_booking_paid(b.booking_id)), 0)                  AS net_revenue
FROM trek t
LEFT JOIN departure d ON d.trek_id      = t.trek_id
LEFT JOIN booking b   ON b.departure_id = d.departure_id
GROUP BY t.trek_id, t.trek_name, t.region;
