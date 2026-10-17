// Routes anyone can use without logging in: browse treks, register, log in.
import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { createToken } from '../auth.js';

const router = Router();

// ---------------------------------------------------------------------
// Screen: Browse Treks  (READ)
// Q1: list active treks with their next open departure and lowest price,
//     filtered by region / difficulty / search text if given.
// ---------------------------------------------------------------------
router.get('/treks', async (req, res) => {
  const { region = '', difficulty = '', search = '' } = req.query;
  const rows = await query(
    `SELECT t.trek_id, t.trek_name, t.region, t.difficulty, t.max_altitude_m,
            t.duration_days, t.permit_required, t.base_price, t.description,
            MIN(v.start_date)        AS next_departure,
            MIN(v.price_per_person)  AS from_price,
            COUNT(v.departure_id)    AS open_departures
     FROM trek t
     LEFT JOIN v_departure_overview v
            ON v.trek_id = t.trek_id
           AND v.status = 'Open'
           AND v.start_date > CURRENT_DATE
           AND v.seats_left > 0
     WHERE t.is_active
       AND ($1 = '' OR t.region = $1)
       AND ($2 = '' OR t.difficulty = $2)
       AND ($3 = '' OR t.trek_name ILIKE '%' || $3 || '%' OR t.region ILIKE '%' || $3 || '%')
     GROUP BY t.trek_id
     ORDER BY next_departure NULLS LAST, t.trek_name`,
    [region, difficulty, search]
  );
  res.json(rows);
});

// Q2: list of regions for the filter dropdown
router.get('/regions', async (req, res) => {
  const rows = await query(
    `SELECT DISTINCT region FROM trek WHERE is_active ORDER BY region`
  );
  res.json(rows.map((r) => r.region));
});

// ---------------------------------------------------------------------
// Screen: Trek Details  (READ)
// Q3: one trek's details
// Q4: its upcoming open departures with seats left
// ---------------------------------------------------------------------
router.get('/treks/:id', async (req, res) => {
  const trek = await queryOne(
    `SELECT * FROM trek WHERE trek_id = $1 AND is_active`,
    [req.params.id]
  );
  if (!trek) return res.status(404).json({ error: 'Trek not found' });

  const departures = await query(
    `SELECT departure_id, start_date, end_date, price_per_person,
            min_group_size, max_group_size, seats_booked, seats_left, guide_name
     FROM v_departure_overview
     WHERE trek_id = $1
       AND status = 'Open'
       AND start_date > CURRENT_DATE
     ORDER BY start_date`,
    [req.params.id]
  );
  res.json({ ...trek, departures });
});

// ---------------------------------------------------------------------
// Screen: Book a Trek  (READ)
// Q4b: the chosen departure with seats left
// ---------------------------------------------------------------------
router.get('/departures/:id', async (req, res) => {
  const dep = await queryOne(
    `SELECT departure_id, trek_id, trek_name, region, difficulty, start_date, end_date,
            price_per_person, max_group_size, seats_left, status, guide_name
     FROM v_departure_overview
     WHERE departure_id = $1`,
    [req.params.id]
  );
  if (!dep) return res.status(404).json({ error: 'Departure not found' });
  res.json(dep);
});

// Q5: equipment that can still be rented
// ---------------------------------------------------------------------
router.get('/equipment', async (req, res) => {
  const rows = await query(
    `SELECT equipment_id, item_name, rent_price_per_trip, quantity_available
     FROM equipment
     WHERE quantity_available > 0
     ORDER BY item_name`
  );
  res.json(rows);
});

// ---------------------------------------------------------------------
// Screen: Register  (CREATE)
// Q6: create a customer through the fn_register_customer function
//     (it hashes the password with bcrypt)
// ---------------------------------------------------------------------
router.post('/auth/register', async (req, res) => {
  const b = req.body;
  const row = await queryOne(
    `SELECT fn_register_customer($1, $2, $3, $4, $5, $6, $7, $8) AS customer_id`,
    [b.full_name, b.email, b.phone, b.cnic_passport, b.nationality,
     b.emergency_contact_name, b.emergency_contact_phone, b.password]
  );
  const token = createToken({ role: 'customer', id: row.customer_id, name: b.full_name });
  res.status(201).json({ token, role: 'customer', name: b.full_name });
});

// ---------------------------------------------------------------------
// Screen: Login  (READ)
// Q7: check customer email + password with fn_customer_login
// Admin login is checked against the .env settings.
// ---------------------------------------------------------------------
router.post('/auth/login', async (req, res) => {
  const { email, password, asAdmin } = req.body;

  if (asAdmin) {
    if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      return res.json({ token: createToken({ role: 'admin', id: 0, name: 'Admin' }),
                        role: 'admin', name: 'Admin' });
    }
    return res.status(401).json({ error: 'Wrong admin username or password' });
  }

  const row = await queryOne(
    `SELECT c.customer_id, c.full_name
     FROM customer c
     WHERE c.customer_id = fn_customer_login($1, $2)`,
    [email, password]
  );
  if (!row) return res.status(401).json({ error: 'Wrong email or password' });

  res.json({ token: createToken({ role: 'customer', id: row.customer_id, name: row.full_name }),
             role: 'customer', name: row.full_name });
});

export default router;
