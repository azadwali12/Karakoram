// Routes for company staff (admin). Full CRUD on treks, departures,
// staff and equipment, plus bookings and payments for all customers.
import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();
router.use(requireRole('admin'));

// =====================================================================
// Screen: Admin Dashboard  (READ)
// =====================================================================
router.get('/dashboard', async (req, res) => {
  // Q20: headline numbers
  const stats = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM departure
         WHERE status IN ('Open','Closed') AND start_date >= CURRENT_DATE)  AS upcoming_departures,
       (SELECT COUNT(*) FROM booking WHERE status IN ('Pending','Confirmed')) AS active_bookings,
       (SELECT COUNT(*) FROM booking WHERE status = 'Pending')               AS pending_bookings,
       (SELECT COUNT(*) FROM customer)                                       AS customers,
       (SELECT COALESCE(SUM(CASE WHEN payment_type = 'Refund' THEN -amount ELSE amount END), 0)
          FROM payment
         WHERE payment_date >= date_trunc('month', CURRENT_DATE))            AS revenue_this_month,
       (SELECT COALESCE(SUM(balance_due), 0) FROM v_booking_summary
         WHERE status IN ('Pending','Confirmed'))                            AS outstanding_balance`
  );
  // Q21: departures in the next 30 days, with warning flags
  const upcoming = await query(
    `SELECT departure_id, trek_name, start_date, end_date, seats_booked, max_group_size,
            min_group_size, guide_name, porter_count, below_minimum, status
     FROM v_departure_overview
     WHERE status IN ('Open','Closed')
       AND start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
     ORDER BY start_date`
  );
  // Q22: revenue and demand per trek (view v_trek_performance)
  const performance = await query(
    `SELECT * FROM v_trek_performance ORDER BY net_revenue DESC`
  );
  // Q23: latest payments
  const payments = await query(
    `SELECT p.payment_id, p.booking_id, c.full_name, p.amount, p.payment_type,
            p.method, p.payment_date
     FROM payment p
     JOIN booking b  ON b.booking_id  = p.booking_id
     JOIN customer c ON c.customer_id = b.customer_id
     ORDER BY p.payment_date DESC
     LIMIT 8`
  );
  res.json({ stats, upcoming, performance, payments });
});

// =====================================================================
// Screen: Manage Treks  (CRUD)
// =====================================================================
// Q24
router.get('/treks', async (req, res) => {
  res.json(await query(
    `SELECT t.*, (SELECT COUNT(*) FROM departure d WHERE d.trek_id = t.trek_id) AS departure_count
     FROM trek t ORDER BY t.trek_name`));
});
// Q25
router.post('/treks', async (req, res) => {
  const b = req.body;
  res.status(201).json(await queryOne(
    `INSERT INTO trek (trek_name, region, difficulty, max_altitude_m, duration_days,
                       permit_required, base_price, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [b.trek_name, b.region, b.difficulty, b.max_altitude_m, b.duration_days,
     !!b.permit_required, b.base_price, b.description]));
});
// Q26
router.put('/treks/:id', async (req, res) => {
  const b = req.body;
  res.json(await queryOne(
    `UPDATE trek SET trek_name = $1, region = $2, difficulty = $3, max_altitude_m = $4,
            duration_days = $5, permit_required = $6, base_price = $7, description = $8,
            is_active = $9
     WHERE trek_id = $10 RETURNING *`,
    [b.trek_name, b.region, b.difficulty, b.max_altitude_m, b.duration_days,
     !!b.permit_required, b.base_price, b.description, b.is_active !== false, req.params.id]));
});
// Q27: blocked by the foreign key if the trek has departures
router.delete('/treks/:id', async (req, res) => {
  await query(`DELETE FROM trek WHERE trek_id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// =====================================================================
// Screen: Manage Departures  (CRUD + procedures)
// =====================================================================
// Q28: list, optional status filter
router.get('/departures', async (req, res) => {
  const { status = '' } = req.query;
  res.json(await query(
    `SELECT * FROM v_departure_overview
     WHERE ($1 = '' OR status = $1)
     ORDER BY start_date DESC`, [status]));
});

// Screen: Departure Details
router.get('/departures/:id', async (req, res) => {
  // Q29
  const dep = await queryOne(
    `SELECT * FROM v_departure_overview WHERE departure_id = $1`, [req.params.id]);
  if (!dep) return res.status(404).json({ error: 'Departure not found' });
  // Q30
  const porters = await query(
    `SELECT p.porter_id, p.full_name, p.phone, p.max_load_kg, dp.assigned_load_kg
     FROM departure_porter dp JOIN porter p ON p.porter_id = dp.porter_id
     WHERE dp.departure_id = $1 ORDER BY p.full_name`, [req.params.id]);
  // Q31
  const bookings = await query(
    `SELECT booking_id, customer_name, customer_phone, group_size, total_amount,
            amount_paid, balance_due, status
     FROM v_booking_summary WHERE departure_id = $1 ORDER BY booking_id`, [req.params.id]);
  // Q32: guides free on these dates (for the assign dropdown)
  const freeGuides = await query(
    `SELECT guide_id, full_name, experience_years, daily_rate
     FROM guide
     WHERE is_active
       AND NOT fn_guide_is_busy(guide_id, $1::date, $2::date, $3)
     ORDER BY full_name`, [dep.start_date, dep.end_date, dep.departure_id]);
  // Q33: porters free on these dates and not already on this departure
  const freePorters = await query(
    `SELECT porter_id, full_name, max_load_kg, daily_rate
     FROM porter p
     WHERE is_active
       AND NOT fn_porter_is_busy(porter_id, $1::date, $2::date, $3)
       AND NOT EXISTS (SELECT 1 FROM departure_porter dp
                       WHERE dp.departure_id = $3 AND dp.porter_id = p.porter_id)
     ORDER BY full_name`, [dep.start_date, dep.end_date, dep.departure_id]);
  res.json({ ...dep, porters, bookings, freeGuides, freePorters });
});

// Q34: create (trigger T4 checks guide and date)
router.post('/departures', async (req, res) => {
  const b = req.body;
  res.status(201).json(await queryOne(
    `INSERT INTO departure (trek_id, guide_id, start_date, price_per_person,
                            min_group_size, max_group_size, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [b.trek_id, b.guide_id || null, b.start_date, b.price_per_person,
     b.min_group_size, b.max_group_size, b.notes || null]));
});

// Q35: edit price, group sizes, open/close for booking, notes.
// Dates change only through the delay procedure; cancel/complete through procedures.
router.put('/departures/:id', async (req, res) => {
  const b = req.body;
  if (!['Open', 'Closed'].includes(b.status)) {
    return res.status(400).json({ error: 'Use the Cancel or Complete buttons for those statuses' });
  }
  res.json(await queryOne(
    `UPDATE departure
     SET price_per_person = $1, min_group_size = $2, max_group_size = $3,
         status = $4, notes = $5
     WHERE departure_id = $6 RETURNING *`,
    [b.price_per_person, b.min_group_size, b.max_group_size, b.status,
     b.notes || null, req.params.id]));
});

// Q36: delete (foreign key blocks it if bookings exist)
router.delete('/departures/:id', async (req, res) => {
  await query(`DELETE FROM departure WHERE departure_id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// Q37-Q42: stored procedures
router.post('/departures/:id/guide', async (req, res) => {
  await query(`CALL sp_assign_guide($1, $2)`, [req.params.id, req.body.guide_id]);
  res.json({ ok: true });
});
router.post('/departures/:id/porters', async (req, res) => {
  await query(`CALL sp_assign_porter($1, $2, $3)`,
    [req.params.id, req.body.porter_id, req.body.assigned_load_kg]);
  res.json({ ok: true });
});
router.delete('/departures/:id/porters/:porterId', async (req, res) => {
  await query(`DELETE FROM departure_porter WHERE departure_id = $1 AND porter_id = $2`,
    [req.params.id, req.params.porterId]);
  res.json({ ok: true });
});
router.post('/departures/:id/delay', async (req, res) => {
  await query(`CALL sp_delay_departure($1, $2, $3)`,
    [req.params.id, req.body.days, req.body.reason]);
  res.json({ ok: true });
});
router.post('/departures/:id/cancel', async (req, res) => {
  await query(`CALL sp_cancel_departure($1, $2)`, [req.params.id, req.body.reason]);
  res.json({ ok: true });
});
router.post('/departures/:id/complete', async (req, res) => {
  await query(`CALL sp_complete_departure($1)`, [req.params.id]);
  res.json({ ok: true });
});

// =====================================================================
// Screen: Manage Guides  (CRUD)
// =====================================================================
// Q43
router.get('/guides', async (req, res) => {
  res.json(await query(
    `SELECT g.*,
            (SELECT COUNT(*) FROM departure d
              WHERE d.guide_id = g.guide_id AND d.status IN ('Open','Closed')) AS upcoming_treks
     FROM guide g ORDER BY g.full_name`));
});
// Q44
router.post('/guides', async (req, res) => {
  const b = req.body;
  res.status(201).json(await queryOne(
    `INSERT INTO guide (full_name, phone, cnic, experience_years, languages, daily_rate)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [b.full_name, b.phone, b.cnic, b.experience_years, b.languages, b.daily_rate]));
});
// Q45
router.put('/guides/:id', async (req, res) => {
  const b = req.body;
  res.json(await queryOne(
    `UPDATE guide SET full_name = $1, phone = $2, cnic = $3, experience_years = $4,
            languages = $5, daily_rate = $6, is_active = $7
     WHERE guide_id = $8 RETURNING *`,
    [b.full_name, b.phone, b.cnic, b.experience_years, b.languages, b.daily_rate,
     b.is_active !== false, req.params.id]));
});
// Q46 (departures keep their history: guide_id becomes NULL)
router.delete('/guides/:id', async (req, res) => {
  await query(`DELETE FROM guide WHERE guide_id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// =====================================================================
// Screen: Manage Porters  (CRUD)
// =====================================================================
// Q47
router.get('/porters', async (req, res) => {
  res.json(await query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM departure_porter dp
               JOIN departure d ON d.departure_id = dp.departure_id
              WHERE dp.porter_id = p.porter_id AND d.status IN ('Open','Closed')) AS upcoming_treks
     FROM porter p ORDER BY p.full_name`));
});
// Q48
router.post('/porters', async (req, res) => {
  const b = req.body;
  res.status(201).json(await queryOne(
    `INSERT INTO porter (full_name, phone, max_load_kg, daily_rate)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [b.full_name, b.phone, b.max_load_kg, b.daily_rate]));
});
// Q49
router.put('/porters/:id', async (req, res) => {
  const b = req.body;
  res.json(await queryOne(
    `UPDATE porter SET full_name = $1, phone = $2, max_load_kg = $3, daily_rate = $4,
            is_active = $5
     WHERE porter_id = $6 RETURNING *`,
    [b.full_name, b.phone, b.max_load_kg, b.daily_rate, b.is_active !== false, req.params.id]));
});
// Q50 (blocked by foreign key if the porter has worked a trek)
router.delete('/porters/:id', async (req, res) => {
  await query(`DELETE FROM porter WHERE porter_id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// Screen: Staff Schedule  (READ)  Q51
router.get('/schedule', async (req, res) => {
  res.json(await query(
    `SELECT * FROM v_staff_schedule ORDER BY start_date, role, full_name`));
});

// =====================================================================
// Screen: Manage Equipment  (CRUD)
// =====================================================================
// Q52
router.get('/equipment', async (req, res) => {
  res.json(await query(
    `SELECT e.*, e.quantity_total - e.quantity_available AS rented_out
     FROM equipment e ORDER BY e.item_name`));
});
// Q53
router.post('/equipment', async (req, res) => {
  const b = req.body;
  res.status(201).json(await queryOne(
    `INSERT INTO equipment (item_name, rent_price_per_trip, quantity_total, quantity_available)
     VALUES ($1, $2, $3, $3) RETURNING *`,
    [b.item_name, b.rent_price_per_trip, b.quantity_total]));
});
// Q54: changing total stock moves available stock by the same amount;
//      the CHECK constraint stops total going below what is rented out.
router.put('/equipment/:id', async (req, res) => {
  const b = req.body;
  res.json(await queryOne(
    `UPDATE equipment
     SET item_name = $1, rent_price_per_trip = $2,
         quantity_available = quantity_available + ($3 - quantity_total),
         quantity_total = $3
     WHERE equipment_id = $4 RETURNING *`,
    [b.item_name, b.rent_price_per_trip, b.quantity_total, req.params.id]));
});
// Q55
router.delete('/equipment/:id', async (req, res) => {
  await query(`DELETE FROM equipment WHERE equipment_id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// =====================================================================
// Screen: Bookings & Payments  (READ, CREATE payment, cancel)
// =====================================================================
// Q56
router.get('/bookings', async (req, res) => {
  const { status = '', search = '' } = req.query;
  res.json(await query(
    `SELECT * FROM v_booking_summary
     WHERE ($1 = '' OR status = $1)
       AND ($2 = '' OR customer_name ILIKE '%' || $2 || '%' OR trek_name ILIKE '%' || $2 || '%')
     ORDER BY booking_date DESC`, [status, search]));
});
// Q57 (same detail queries as the customer side, without the owner check)
router.get('/bookings/:id', async (req, res) => {
  const summary = await queryOne(
    `SELECT * FROM v_booking_summary WHERE booking_id = $1`, [req.params.id]);
  if (!summary) return res.status(404).json({ error: 'Booking not found' });
  const equipment = await query(
    `SELECT e.item_name, be.quantity, be.unit_price, be.quantity * be.unit_price AS line_total
     FROM booking_equipment be JOIN equipment e ON e.equipment_id = be.equipment_id
     WHERE be.booking_id = $1 ORDER BY e.item_name`, [req.params.id]);
  const payments = await query(
    `SELECT payment_id, amount, payment_date, method, payment_type, reference_no
     FROM payment WHERE booking_id = $1 ORDER BY payment_date`, [req.params.id]);
  res.json({ ...summary, equipment, payments });
});
// Q58: record a payment taken at the office (cash, bank transfer...)
router.post('/bookings/:id/payments', async (req, res) => {
  const { amount, method, payment_type, reference_no } = req.body;
  const row = await queryOne(
    `CALL sp_record_payment($1, $2, $3, $4, $5, NULL)`,
    [req.params.id, amount, method, payment_type, reference_no || '']);
  res.status(201).json({ payment_id: row.p_payment_id });
});
// Q59: cancel on behalf of the customer (normal refund policy)
router.post('/bookings/:id/cancel', async (req, res) => {
  const row = await queryOne(`CALL sp_cancel_booking($1, FALSE, NULL)`, [req.params.id]);
  res.json({ refund: row.p_refund });
});

// =====================================================================
// Screen: Customers  (READ, DELETE)
// =====================================================================
// Q60
router.get('/customers', async (req, res) => {
  res.json(await query(
    `SELECT c.customer_id, c.full_name, c.email, c.phone, c.cnic_passport, c.nationality,
            c.emergency_contact_name, c.emergency_contact_phone, c.created_at,
            COUNT(b.booking_id) FILTER (WHERE b.status <> 'Cancelled') AS bookings,
            COALESCE(SUM(fn_booking_paid(b.booking_id)), 0)            AS total_paid
     FROM customer c
     LEFT JOIN booking b ON b.customer_id = c.customer_id
     GROUP BY c.customer_id
     ORDER BY c.full_name`));
});
// Q61 (blocked by foreign key if the customer has bookings)
router.delete('/customers/:id', async (req, res) => {
  await query(`DELETE FROM customer WHERE customer_id = $1`, [req.params.id]);
  res.json({ ok: true });
});

export default router;
