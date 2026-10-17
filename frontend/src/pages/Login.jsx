// Screen: Log in / Register (READ customer, CREATE customer)
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Field } from '../components/ui.jsx';

const emptyRegister = {
  full_name: '', email: '', phone: '', cnic_passport: '', nationality: 'Pakistani',
  emergency_contact_name: '', emergency_contact_phone: '', password: '',
};

export default function Login() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [reg, setReg] = useState(emptyRegister);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const switchTab = (t) => { setTab(t); setError(''); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setR = (k) => (e) => setReg({ ...reg, [k]: e.target.value });

  async function doLogin(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/auth/login', { method: 'POST', body: { ...form, asAdmin: tab === 'admin' } });
      login(res);
      navigate(res.role === 'admin' ? '/admin' : params.get('next') || '/my/bookings');
    } catch (err) { setError(err.message); }
  }

  async function doRegister(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/auth/register', { method: 'POST', body: reg });
      login(res);
      navigate(params.get('next') || '/');
    } catch (err) { setError(err.message); }
  }

  return (
    <main className={`page auth-wrap ${tab === 'register' ? 'wide' : ''}`}>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'login'} className={tab === 'login' ? 'on' : ''} onClick={() => switchTab('login')}>Log in</button>
        <button role="tab" aria-selected={tab === 'register'} className={tab === 'register' ? 'on' : ''} onClick={() => switchTab('register')}>Create account</button>
        <button role="tab" aria-selected={tab === 'admin'} className={tab === 'admin' ? 'on' : ''} onClick={() => switchTab('admin')}>Office staff</button>
      </div>
      <Alert>{error}</Alert>

      {tab !== 'register' ? (
        <form onSubmit={doLogin} className="panel">
          <Field label={tab === 'admin' ? 'Username' : 'Email'}>
            <input type={tab === 'admin' ? 'text' : 'email'} value={form.email} onChange={set('email')} required autoComplete="username" />
          </Field>
          <Field label="Password">
            <input type="password" value={form.password} onChange={set('password')} required autoComplete="current-password" />
          </Field>
          <button className="btn">Log in</button>
          <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
            {tab === 'admin' ? 'Demo: admin / admin123' : 'Demo: ayesha@example.com / password123'}
          </p>
        </form>
      ) : (
        <form onSubmit={doRegister} className="panel">
          <div className="form-grid">
            <Field label="Full name" className="full"><input value={reg.full_name} onChange={setR('full_name')} required /></Field>
            <Field label="Email"><input type="email" value={reg.email} onChange={setR('email')} required /></Field>
            <Field label="Phone"><input value={reg.phone} onChange={setR('phone')} required /></Field>
            <Field label="CNIC or passport number" hint="Needed for trekking permits"><input value={reg.cnic_passport} onChange={setR('cnic_passport')} required /></Field>
            <Field label="Nationality"><input value={reg.nationality} onChange={setR('nationality')} /></Field>
            <Field label="Emergency contact name"><input value={reg.emergency_contact_name} onChange={setR('emergency_contact_name')} required /></Field>
            <Field label="Emergency contact phone"><input value={reg.emergency_contact_phone} onChange={setR('emergency_contact_phone')} required /></Field>
            <Field label="Password" hint="At least 6 characters" className="full"><input type="password" value={reg.password} onChange={setR('password')} minLength={6} required autoComplete="new-password" /></Field>
          </div>
          <button className="btn">Create account</button>
        </form>
      )}
    </main>
  );
}
