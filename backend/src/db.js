// Connection to PostgreSQL using the "pg" library.
// A Pool keeps a few open connections and reuses them for every request.
import pg from 'pg';
import 'dotenv/config';

// Return NUMERIC and BIGINT (COUNT/SUM) columns as JS numbers instead of strings
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10))); // BIGINT
// Return DATE columns as plain 'YYYY-MM-DD' text (avoids timezone shifts)
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'trekking_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

// Every query in the app goes through here.
// $1, $2 ... placeholders keep user input separate from SQL (prevents SQL injection).
export async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}
