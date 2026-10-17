// Screen: My Profile — READ and UPDATE own details, change password
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLoad, Alert, Field, useToast } from '../components/ui.jsx';

export default function Profile() {
  const { data, error } = useLoad('/my/me');
  const [form, setForm] = useState(null);
  const [pw, setPw] = useState({ old_password: '', new_password: '' });
  const [formError, setFormError] = useState('');
  const [pwError, setPwError] = useState('');
  const [toast, showToast] = useToast();

  useEffect(() => { if (data) setForm(data); }, [data]);
  if (error) return <main className="page"><Alert>{error}</Alert></main>;
  if (!form) return <main className="page muted">Loading…</main>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setFormError('');
    try { setForm(await api('/my/me', { method: 'PUT', body: form })); showToast('Profile saved'); }
    catch (err) { setFormError(err.message); }
  }

  async function changePw(e) {
    e.preventDefault();
    setPwError('');
    try {
      await api('/my/me/password', { method: 'PUT', body: pw });
      setPw({ old_password: '', new_password: '' });
      showToast('Password changed');
    } catch (err) { setPwError(err.message); }
  }

  return (
    <main className="page">
      <h1>Profile</h1>
      <div className="two-col">
        <form className="panel" onSubmit={save}>
          <h2>Your details</h2>
          <Alert>{formError}</Alert>
          <div className="form-grid">
            <Field label="Full name" className="full"><input value={form.full_name} onChange={set('full_name')} required /></Field>
            <Field label="Email" hint="Contact the office to change this"><input value={form.email} disabled /></Field>
            <Field label="CNIC or passport" hint="Contact the office to change this"><input value={form.cnic_passport} disabled /></Field>
            <Field label="Phone"><input value={form.phone} onChange={set('phone')} required /></Field>
            <Field label="Nationality"><input value={form.nationality} onChange={set('nationality')} required /></Field>
            <Field label="Emergency contact name"><input value={form.emergency_contact_name} onChange={set('emergency_contact_name')} required /></Field>
            <Field label="Emergency contact phone"><input value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} required /></Field>
          </div>
          <button className="btn">Save changes</button>
        </form>

        <form className="panel" onSubmit={changePw}>
          <h2>Change password</h2>
          <Alert>{pwError}</Alert>
          <Field label="Current password"><input type="password" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} required autoComplete="current-password" /></Field>
          <Field label="New password" hint="At least 6 characters"><input type="password" minLength={6} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required autoComplete="new-password" /></Field>
          <button className="btn">Change password</button>
        </form>
      </div>
      {toast}
    </main>
  );
}
