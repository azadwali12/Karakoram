// Simple signed login tokens (no extra library needed).
// token = base64(payload) + "." + HMAC signature of that payload.
// The server can check a token was issued by it and has not been changed.
import crypto from 'node:crypto';
import 'dotenv/config';

const SECRET = process.env.TOKEN_SECRET || 'dev-secret-change-me';
const EIGHT_HOURS = 8 * 60 * 60 * 1000;

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createToken({ role, id, name }) {
  const payload = Buffer.from(
    JSON.stringify({ role, id, name, exp: Date.now() + EIGHT_HOURS })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

// Middleware: only let the request through if the user has the given role
export function requireRole(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const user = readToken(header.replace('Bearer ', ''));
    if (!user || user.role !== role) {
      return res.status(401).json({ error: 'Please log in again' });
    }
    req.user = user;
    next();
  };
}
