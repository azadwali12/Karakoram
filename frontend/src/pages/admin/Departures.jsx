// Screen: Manage Departures — list and create (READ, CREATE)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, rs, date } from '../../api.js';
import { useLoad, Alert, Chip, Field, Modal, Empty } from '../../components/ui.jsx';

export default function Departures() {
  const [status, setStatus] = useState('');
  const { data, error, reload } = useLoad(`/admin/departures?status=${status}`, [status]);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const open = (id) => navigate(`/admin/departures/${id}`);

  return (
    <>
      <div className="page-head">
        <h1>Departures</h1>
        <div className="btn-row">
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['Open', 'Closed', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={() => setAdding(true)}>Add departure</button>
        </div>
      </div>
      <Alert>{error}</Alert>
      {data?.length === 0 && <Empty>No departures with this status.</Empty>}
      {data?.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trek</th><th>Dates</th><th className="num">Price</th><th className="num">Seats</th><th>Guide</th><th className="num">Porters</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.departure_id} className="clickable" tabIndex={0}
                    onClick={() => open(d.departure_id)} onKeyDown={(e) => e.key === 'Enter' && open(d.departure_id)}>
                  <td><strong>{d.trek_name}</strong><div className="small muted">#{d.departure_id} · {d.region}</div></td>
                  <td>{date(d.start_date)} – {date(d.end_date)}</td>
                  <td className="num">{rs(d.price_per_person)}</td>
                  <td className="num">{d.seats_booked} / {d.max_group_size}</td>
                  <td>{d.guide_name || <span className="muted">Not assigned</span>}</td>
                  <td className="num">{d.porter_count}</td>
                  <td><Chip value={d.status} /> {d.below_minimum && <span className="chip warn">Below minimum</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && <AddDeparture onClose={() => setAdding(false)} onDone={(id) => { setAdding(false); reload(); open(id); }} />}
    </>
  );
}

function AddDeparture({ onClose, onDone }) {
  const { data: treks } = useLoad('/admin/treks');
  const { data: guides } = useLoad('/admin/guides');
  const [form, setForm] = useState({ trek_id: '', guide_id: '', start_date: '', price_per_person: '', min_group_size: 2, max_group_size: 12 });
  const [error, setError] = useState('');
  const set = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    if (k === 'trek_id') {
      const t = treks.find((x) => String(x.trek_id) === e.target.value);
      if (t) next.price_per_person = t.base_price;   // start from the trek's base price
    }
    setForm(next);
  };

  async function submit(e) {
    e.preventDefault();
    try { const d = await api('/admin/departures', { method: 'POST', body: form }); onDone(d.departure_id); }
    catch (err) { setError(err.message); }
  }

  return (
    <Modal title="Add departure" onClose={onClose}>
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <div className="form-grid">
          <Field label="Trek" className="full">
            <select value={form.trek_id} onChange={set('trek_id')} required>
              <option value="" disabled>Choose a trek…</option>
              {treks?.filter((t) => t.is_active).map((t) => <option key={t.trek_id} value={t.trek_id}>{t.trek_name} ({t.duration_days} days)</option>)}
            </select>
          </Field>
          <Field label="Start date"><input type="date" value={form.start_date} onChange={set('start_date')} required /></Field>
          <Field label="Price per person (Rs)"><input type="number" min="1" value={form.price_per_person} onChange={set('price_per_person')} required /></Field>
          <Field label="Min group size" hint="Below this, the trek may be cancelled"><input type="number" min="1" value={form.min_group_size} onChange={set('min_group_size')} required /></Field>
          <Field label="Max group size"><input type="number" min="1" value={form.max_group_size} onChange={set('max_group_size')} required /></Field>
          <Field label="Guide" hint="Optional now. The system blocks a guide who is busy on these dates." className="full">
            <select value={form.guide_id} onChange={set('guide_id')}>
              <option value="">Assign later</option>
              {guides?.filter((g) => g.is_active).map((g) => <option key={g.guide_id} value={g.guide_id}>{g.full_name}</option>)}
            </select>
          </Field>
        </div>
        <div className="btn-row"><button className="btn">Add departure</button><button type="button" className="btn secondary" onClick={onClose}>Close</button></div>
      </form>
    </Modal>
  );
}
