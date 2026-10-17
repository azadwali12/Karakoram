// Routes for a logged-in customer: their profile and their bookings.
// Every query filters by req.user.id so a customer only sees their own data.
import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();
router.use(requireRole('customer'));

// Make sure the booking belongs to the logged-in customer
async function ownBooking(req, res) {
  const b = await queryOne(
    `SELECT booking_id FROM booking WHERE booking_id = $1 AND customer_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!b) res.status(404).json({ error: 'Booking not found' });
  return b;
}

// ---------------------------------------------------------------------
// Screen: My Profile  (READ, UPDATE)
// ---------------------------------------------------------------------
// Q8: read own profile (password hash is never sent)
router.get('/me', async (req, res) => {
  const me = await queryOne(
    `SELECT customer_id, full_name, email, phone, cnic_passport, nationality,
            emergency_contact_name, emergency_contact_phone, created_at
     FROM customer WHERE customer_id = $1`,
    [req.user.id]
  );
  res.json(me);
});

// Q9: update contact details
router.put('/me', async (req, res) => {
  const b = req.body;
  const me = await queryOne(
    `UPDATE customer
     SET full_name = $1, phone = $2, nationality = $3,
         emergency_contact_name = $4, emergency_contact_phone = $5
     WHERE customer_id = $6
     RETURNING customer_id, full_name, email, phone, cnic_passport, nationality,
               emergency_contact_name, emergency_contact_phone`,
    [b.full_name, b.phone, b.nationality, b.emergency_contact_name,
     b.emergency_contact_phone, req.user.id]
  );
  res.json(me);
});

// Q10: change password (old password must match)
router.put('/me/password', async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const row = await queryOne(
    `UPDATE customer
     SET password_hash = crypt($1, gen_salt('bf'))
     WHERE customer_id = $2
       AND password_hash = crypt($3, password_hash)
     RETURNING customer_id`,
    [new_password, req.user.id, old_password]
  );
  if (!row) return res.status(400).json({ error: 'Current password is wrong' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Screen: My Bookings  (READ)
// Q11: all of the customer's bookings with totals from v_booking_summary
// ---------------------------------------------------------------------
router.get('/bookings', async (req, res) => {
  const rows = await query(
    `SELECT * FROM v_booking_summary
     WHERE customer_id = $1
     ORDER BY start_date DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// ---------------------------------------------------------------------
// Screen: Booking Details  (READ)
// Q12: booking summary, Q13: rented equipment, Q14: payment history
// ---------------------------------------------------------------------
router.get('/bookings/:id', async (req, res) => {
  if (!(await ownBooking(req, res))) return;
  const summary = await queryOne(
    `SELECT * FROM v_booking_summary WHERE booking_id = $1`, [req.params.id]);
  const equipment = await query(
    `SELECT e.item_name, be.quantity, be.unit_price, be.quantity * be.unit_price AS line_total
     FROM booking_equipment be
     JOIN equipment e ON e.equipment_id = be.equipment_id
     WHERE be.booking_id = $1
     ORDER BY e.item_name`, [req.params.id]);
  const payments = await query(
    `SELECT payment_id, amount, payment_date, method, payment_type, reference_no
     FROM payment WHERE booking_id = $1 ORDER BY payment_date`, [req.params.id]);
  res.json({ ...summary, equipment, payments });
});

// ---------------------------------------------------------------------
// Screen: Book a Trek  (CREATE)
// Q15: CALL sp_create_booking — inserts booking + equipment lines together.
//      Triggers check seats, duplicates and stock.
// ---------------------------------------------------------------------
router.post('/bookings', async (req, res) => {
  const { departure_id, group_size, equipment = [] } = req.body;
  const row = await queryOne(
    `CALL sp_create_booking($1, $2, $3, $4::jsonb, NULL)`,
    [req.user.id, departure_id, group_size, JSON.stringify(equipment)]
  );
  res.status(201).json({ booking_id: row.p_booking_id });
});

// ---------------------------------------------------------------------
// Screen: Booking Details  (UPDATE) — change number of people
// Q16: trigger T1 checks seats are still available
// ---------------------------------------------------------------------
router.put('/bookings/:id', async (req, res) => {
  if (!(await ownBooking(req, res))) return;
  const row = await queryOne(
    `UPDATE booking SET group_size = $1
     WHERE booking_id = $2 AND status IN ('Pending','Confirmed')
     RETURNING booking_id`,
    [req.body.group_size, req.params.id]
  );
  if (!row) return res.status(400).json({ error: 'Only active bookings can be changed' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Screen: Booking Details  (CREATE payment)
// Q17: CALL sp_record_payment — triggers check the amount and confirm the booking
// ---------------------------------------------------------------------
router.post('/bookings/:id/pay', async (req, res) => {
  if (!(await ownBooking(req, res))) return;
  const { amount, method, payment_type, reference_no } = req.body;
  const row = await queryOne(
    `CALL sp_record_payment($1, $2, $3, $4, $5, NULL)`,
    [req.params.id, amount, method, payment_type, reference_no || '']
  );
  res.status(201).json({ payment_id: row.p_payment_id });
});

// ---------------------------------------------------------------------
// Screen: Booking Details  (UPDATE status) — cancel with refund policy
// Q18: CALL sp_cancel_booking
// ---------------------------------------------------------------------
router.post('/bookings/:id/cancel', async (req, res) => {
  if (!(await ownBooking(req, res))) return;
  const row = await queryOne(
    `CALL sp_cancel_booking($1, FALSE, NULL)`, [req.params.id]);
  res.json({ refund: row.p_refund });
});

// ---------------------------------------------------------------------
// Screen: My Bookings  (DELETE) — remove an unpaid pending booking
// Q19: trigger T1b only allows this for unpaid Pending bookings
// ---------------------------------------------------------------------
router.delete('/bookings/:id', async (req, res) => {
  if (!(await ownBooking(req, res))) return;
  await query(`DELETE FROM booking WHERE booking_id = $1`, [req.params.id]);
  res.json({ ok: true });
});

export default router;
