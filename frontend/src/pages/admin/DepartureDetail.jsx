// Screen: Departure Details — edit, assign staff, delay, cancel, complete
// (READ, UPDATE, DELETE + stored procedures)
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, rs, date } from '../../api.js';
import { useLoad, Alert, Chip, Field, Modal, useToast } from '../../components/ui.jsx';

export default function DepartureDetail() {
  const { id } = useParams();
  const path = `/admin/departures/${id}`;
  const { data: d, error, reload } = useLoad(path);
  const [modal, setModal] = useState(null);
  const [toast, showToast] = useToast();
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  if (error) return <Alert>{error}</Alert>;
  if (!d) return <p className="muted">Loading…</p>;

  const live = ['Open', 'Closed'].includes(d.status);
  const finished = new Date(`${d.end_date}T00:00:00`) < new Date(new Date().toDateString());

  async function act(fn, msg) {
    setActionError('');
    try { await fn(); setModal(null); showToast(msg); await reload(); }
    catch (e) { setActionError(e.message); throw e; }
  }

  async function removePorter(pid) {
    await act(() => api(`${path}/porters/${pid}`, { method: 'DELETE' }), 'Porter removed').catch(() => {});
  }

  async function remove() {
    if (!window.confirm('Delete this departure?')) return;
    try { await api(path, { method: 'DELETE' }); navigate('/admin/departures'); }
    catch (e) { setActionError(e.message); }
  }

  return (
    <>
      <Link to="/admin/departures" className="back">All departures</Link>
      <div className="page-head" style={{ marginTop: 10 }}>
        <div>
          <h1>{d.trek_name}</h1>
          <span className="muted">#{d.departure_id} · {date(d.start_date)} – {date(d.end_date)}</span>
        </div>
        <div className="btn-row"><Chip value={d.status} />{d.below_minimum && <span className="chip warn">Below minimum</span>}</div>
      </div>
      <Alert>{actionError}</Alert>

      <div className="facts" style={{ marginTop: 0 }}>
        <div className="fact"><span>Price per person</span><b>{rs(d.price_per_person)}</b></div>
        <div className="fact"><span>Seats booked</span><b>{d.seats_booked} / {d.max_group_size}</b></div>
        <div className="fact"><span>Minimum to run</span><b>{d.min_group_size}</b></div>
        <div className="fact"><span>Guide</span><b>{d.guide_name || '—'}</b></div>
      </div>

      <div className="detail-grid">
        <div>
          <section className="section">
            <div className="page-head" style={{ marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>Porters</h2>
              {live && <button className="btn secondary small" onClick={() => setModal('porter')}>Add porter</button>}
            </div>
            {d.porters.length === 0 ? <p className="muted">No porters assigned.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Phone</th><th className="num">Load</th><th /></tr></thead>
                  <tbody>
                    {d.porters.map((p) => (
                      <tr key={p.porter_id}>
                        <td>{p.full_name}</td><td>{p.phone}</td>
                        <td className="num">{p.assigned_load_kg} / {p.max_load_kg} kg</td>
                        <td className="num">{live && <button className="btn danger small" onClick={() => removePorter(p.porter_id)}>Remove</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section">
            <h2>Bookings</h2>
            {d.bookings.length === 0 ? <p className="muted">No bookings yet.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Customer</th><th className="num">People</th><th className="num">Total</th><th className="num">Balance</th><th>Status</th></tr></thead>
                  <tbody>
                    {d.bookings.map((b) => (
                      <tr key={b.booking_id} className="clickable" tabIndex={0}
                          onClick={() => navigate(`/admin/bookings/${b.booking_id}`)}
                          onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/bookings/${b.booking_id}`)}>
                        <td>{b.customer_name}<div className="small muted">{b.customer_phone}</div></td>
                        <td className="num">{b.group_size}</td>
                        <td className="num">{rs(b.total_amount)}</td>
                        <td className="num">{rs(b.balance_due)}</td>
                        <td><Chip value={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {d.notes && (<section className="section"><h2>Notes</h2><p className="notes">{d.notes}</p></section>)}
        </div>

        <aside className="panel">
          <h2>Actions</h2>
          {!live && <p className="muted">This departure is {d.status.toLowerCase()} and can no longer be changed.</p>}
          {live && (
            <div className="btn-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <button className="btn secondary" onClick={() => setModal('edit')}>Edit price and group size</button>
              <button className="btn secondary" onClick={() => setModal('guide')}>{d.guide_name ? 'Change guide' : 'Assign guide'}</button>
              <button className="btn secondary" onClick={() => setModal('delay')}>Delay departure</button>
              {finished && <button className="btn" onClick={() => act(() => api(`${path}/complete`, { method: 'POST' }), 'Departure completed').catch(() => {})}>Mark trek completed</button>}
              <button className="btn danger" onClick={() => setModal('cancel')}>Cancel departure</button>
              {d.bookings.length === 0 && <button className="btn danger" onClick={remove}>Delete departure</button>}
            </div>
          )}
        </aside>
      </div>

      {modal === 'edit' && <EditModal d={d} onClose={() => setModal(null)} onSave={(body) => act(() => api(path, { method: 'PUT', body }), 'Changes saved')} />}
      {modal === 'guide' && <GuideModal d={d} onClose={() => setModal(null)} onSave={(guide_id) => act(() => api(`${path}/guide`, { method: 'POST', body: { guide_id } }), 'Guide assigned')} />}
      {modal === 'porter' && <PorterModal d={d} onClose={() => setModal(null)} onSave={(body) => act(() => api(`${path}/porters`, { method: 'POST', body }), 'Porter added')} />}
      {modal === 'delay' && <DelayModal onClose={() => setModal(null)} onSave={(body) => act(() => api(`${path}/delay`, { method: 'POST', body }), 'Departure delayed')} />}
      {modal === 'cancel' && <CancelModal d={d} onClose={() => setModal(null)} onSave={(body) => act(() => api(`${path}/cancel`, { method: 'POST', body }), 'Departure cancelled and customers refunded')} />}
      {toast}
    </>
  );
}

// Each modal keeps its own error so the message shows next to the form
function useSubmit(onSave) {
  const [error, setError] = useState('');
  const submit = async (body) => { setError(''); try { await onSave(body); } catch (e) { setError(e.message); } };
  return [error, submit];
}

function EditModal({ d, onClose, onSave }) {
  const [f, setF] = useState({ price_per_person: d.price_per_person, min_group_size: d.min_group_size, max_group_size: d.max_group_size, status: d.status, notes: d.notes || '' });
  const [error, submit] = useSubmit(onSave);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="Edit departure" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit(f); }}>
        <Alert>{error}</Alert>
        <div className="form-grid">
          <Field label="Price per person (Rs)" hint="Existing bookings keep the price they agreed"><input type="number" min="1" value={f.price_per_person} onChange={set('price_per_person')} required /></Field>
          <Field label="Booking" hint="Closed stops new bookings">
            <select value={f.status} onChange={set('status')}><option>Open</option><option>Closed</option></select>
          </Field>
          <Field label="Min group size"><input type="number" min="1" value={f.min_group_size} onChange={set('min_group_size')} required /></Field>
          <Field label="Max group size"><input type="number" min="1" value={f.max_group_size} onChange={set('max_group_size')} required /></Field>
          <Field label="Notes" className="full"><textarea value={f.notes} onChange={set('notes')} /></Field>
        </div>
        <div className="btn-row"><button className="btn">Save changes</button><button type="button" className="btn secondary" onClick={onClose}>Close</button></div>
      </form>
    </Modal>
  );
}

function GuideModal({ d, onClose, onSave }) {
  const [gid, setGid] = useState('');
  const [error, submit] = useSubmit(onSave);
  return (
    <Modal title="Assign guide" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit(Number(gid)); }}>
        <Alert>{error}</Alert>
        <Field label="Guide" hint={`Only guides free from ${date(d.start_date)} to ${date(d.end_date)} are listed`}>
          <select value={gid} onChange={(e) => setGid(e.target.value)} required>
            <option value="" disabled>Choose a guide…</option>
            {d.freeGuides.map((g) => <option key={g.guide_id} value={g.guide_id}>{g.full_name} · {g.experience_years} yrs · {rs(g.daily_rate)}/day</option>)}
          </select>
        </Field>
        <div className="btn-row"><button className="btn">Assign guide</button><button type="button" className="btn secondary" onClick={onClose}>Close</button></div>
      </form>
    </Modal>
  );
}

function PorterModal({ d, onClose, onSave }) {
  const [f, setF] = useState({ porter_id: '', assigned_load_kg: 20 });
  const [error, submit] = useSubmit(onSave);
  return (
    <Modal title="Add porter" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit({ porter_id: Number(f.porter_id), assigned_load_kg: Number(f.assigned_load_kg) }); }}>
        <Alert>{error}</Alert>
        <Field label="Porter" hint="Only porters free on these dates are listed">
          <select value={f.porter_id} onChange={(e) => setF({ ...f, porter_id: e.target.value })} required>
            <option value="" disabled>Choose a porter…</option>
            {d.freePorters.map((p) => <option key={p.porter_id} value={p.porter_id}>{p.full_name} · max {p.max_load_kg} kg</option>)}
          </select>
        </Field>
        <Field label="Load to carry (kg)"><input type="number" min="1" value={f.assigned_load_kg} onChange={(e) => setF({ ...f, assigned_load_kg: e.target.value })} required /></Field>
        <div className="btn-row"><button className="btn">Add porter</button><button type="button" className="btn secondary" onClick={onClose}>Close</button></div>
      </form>
    </Modal>
  );
}

function DelayModal({ onClose, onSave }) {
  const [f, setF] = useState({ days: 1, reason: '' });
  const [error, submit] = useSubmit(onSave);
  return (
    <Modal title="Delay departure" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit({ days: Number(f.days), reason: f.reason }); }}>
        <Alert>{error}</Alert>
        <p className="muted">Moves the start date later. The guide and porters must be free on the new dates, otherwise nothing changes.</p>
        <Field label="Days to delay" hint="1 to 14 days"><input type="number" min="1" max="14" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} required /></Field>
        <Field label="Reason"><input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Snowfall on Gondogoro La" required /></Field>
        <div className="btn-row"><button className="btn">Delay departure</button><button type="button" className="btn secondary" onClick={onClose}>Close</button></div>
      </form>
    </Modal>
  );
}

function CancelModal({ d, onClose, onSave }) {
  const [reason, setReason] = useState('');
  const [error, submit] = useSubmit(onSave);
  const active = d.bookings.filter((b) => ['Pending', 'Confirmed'].includes(b.status));
  return (
    <Modal title="Cancel departure" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit({ reason }); }}>
        <Alert>{error}</Alert>
        <p>{active.length} active booking{active.length === 1 ? '' : 's'} will be cancelled and every customer refunded 100% of what they paid. This can't be undone.</p>
        <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Road closed by landslide" required /></Field>
        <div className="btn-row"><button className="btn danger">Cancel departure</button><button type="button" className="btn secondary" onClick={onClose}>Keep departure</button></div>
      </form>
    </Modal>
  );
}
