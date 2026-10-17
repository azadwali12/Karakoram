// Entry point of the API server.
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { pool } from './db.js';
import publicRoutes from './routes/public.js';
import customerRoutes from './routes/customer.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', publicRoutes);
app.use('/api/my', customerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

// In production, serve the built React app from ../frontend/dist
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Friendly messages for CHECK constraint names
const constraintMessages = {
  chk_customer_email: 'Please enter a valid email address',
  chk_trek_difficulty: 'Difficulty must be Easy, Moderate, Hard or Extreme',
  chk_trek_altitude: 'Altitude must be between 500 and 8611 m',
  chk_trek_duration: 'Duration must be between 1 and 60 days',
  chk_trek_price: 'Price must be more than 0',
  chk_dep_price: 'Price must be more than 0',
  chk_dep_sizes: 'Max group size must be at least the min group size',
  chk_booking_size: 'Group size must be between 1 and 20',
  chk_eq_qty: 'Total stock cannot be less than the quantity currently rented out',
  chk_porter_load: 'Porter max load must be between 10 and 40 kg',
  chk_dp_load: 'Load must be more than 0',
  chk_pay_amount: 'Amount must be more than 0',
  chk_guide_rate: 'Daily rate must be more than 0',
  chk_porter_rate: 'Daily rate must be more than 0',
  uq_trek_start: 'This trek already has a departure on that date',
};

// Turn database errors into clear messages for the user.
// P0001 = RAISE EXCEPTION from our triggers/procedures (business rule broken)
app.use((err, req, res, next) => {
  if (err.code === 'P0001') return res.status(400).json({ error: err.message });
  if (err.code === '23505') {
    const field = (err.detail || '').match(/\((.*?)\)=/)?.[1] || 'value';
    return res.status(409).json({ error: `That ${field.replace(/_/g, ' ')} is already in use` });
  }
  if (err.code === '23503') {
    return res.status(409).json({ error: 'This record is linked to other records and cannot be deleted. Mark it inactive instead.' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: constraintMessages[err.constraint] || 'A value is out of the allowed range' });
  }
  if (err.code === '23502') {
    return res.status(400).json({ error: `Please fill in ${err.column.replace(/_/g, ' ')}` });
  }
  if (err.code === '22P02' || err.code === '22007' || err.code === '22008') {
    return res.status(400).json({ error: 'One of the values has the wrong format' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
