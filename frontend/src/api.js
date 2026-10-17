// One small helper for every call to the backend.
// It adds the login token and turns server errors into readable messages.
export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// Formatting helpers
export const rs = (n) =>
  `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

export const date = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) : '—';

export const dateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—';

export const today = () => new Date().toISOString().slice(0, 10);
