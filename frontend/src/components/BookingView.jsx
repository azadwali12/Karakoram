// Booking details with payments. Used by the customer (My Bookings) and
// by office staff (Bookings & payments), with slightly different actions.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, rs, date, dateTime } from '../api.js';
import { useLoad, Alert, Chip, Field, Modal, useToast } from './ui.jsx';

const METHODS = ['JazzCash', 'Easypaisa', 'Bank Transfer', 'Card', 'Cash'];

export default function BookingView({ id, admin = false, isNew = false }) {
  const base = admin ? `/admin/bookings/${id}` : `/my/bookings/${id}`;
  const { data: b, error, reload } = useLoad(base);
  const [modal, setModal] = useState(null);
  const [toast, showToast] = useToast();
  const navigate = useNavigate();

  if (error) return <Alert>{error}</Alert>;
  if (!b) return <p className="muted">Loading…</p>;

  const active = ['Pending', 'Confirmed'].includes(b.status);
  const firstPayment = b.amount_paid <= 0;
  const daysLeft = Math.round((new Date(`${b.start_date}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
  const refundRate = daysLeft >= 30 ? 90 : daysLeft >= 7 ? 50 : 0;

  const done = async (msg) => { setModal(null); showToast(msg); await reload(); };

  async function remove() {
    if (!window.confirm('Delete this unpaid booking?')) return;
    try {
      await api(base, { method: 'DELETE' });
      navigate('/my/bookings');
    } catch (e) { showToast(e.message); }
  }

  return (
    <>
      {isNew && b.status === 'Pending' && (
        <Alert kind="success">Booking created and your seats are held. Pay the advance to confirm it.</Alert>
      )}
      <div className="page-head">
        <div>
          <h1>{b.trek_name}</h1>
          <span className="muted">Booking #{b.booking_id} · {date(b.start_date)} – {date(b.end_date)}</span>
        </div>
        <Chip value={b.status} />
      </div>

      <div className="detail-grid">
        <div>
          <div className="facts" style={{ marginTop: 0 }}>
            <div className="fact"><span>People</span><b>{b.group_size}</b></div>
            <div className="fact"><span>Total</span><b>{rs(b.total_amount)}</b></div>
            <div className="fact"><span>Paid</span><b>{rs(b.amount_paid)}</b></div>
            <div className="fact"><span>Balance</span><b>{rs(b.balance_due)}</b></div>
          </div>

          {admin && (
            <div className="panel">
              <h3>Customer</h3>
              <p style={{ margin: 0 }}>{b.customer_name} · {b.customer_email} · {b.customer_phone}</p>
            </div>
          )}

          <div className="section" style={{ marginTop: 16 }}>
            <h2>Payments</h2>
            {b.payments.length === 0 ? (
              <p className="muted">No payments yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Reference</th><th className="num">Amount</th></tr></thead>
                  <tbody>
                    {b.payments.map((p) => (
                      <tr key={p.payment_id}>
                        <td>{dateTime(p.payment_date)}</td>
                        <td>{p.payment_type}</td>
                        <td>{p.method}</td>
                        <td className="small">{p.reference_no || '—'}</td>
                        <td className="num">{p.payment_type === 'Refund' ? `– ${rs(p.amount)}` : rs(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="section">
            <h2>Rented gear</h2>
            {b.equipment.length === 0 ? <p className="muted">No gear rented.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Total</th></tr></thead>
                  <tbody>
                    {b.equipment.map((e) => (
                      <tr key={e.item_name}><td>{e.item_name}</td><td className="num">{e.quantity}</td><td className="num">{rs(e.unit_price)}</td><td className="num">{rs(e.line_total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="panel">
          <h2>Actions</h2>
          {!active && <p className="muted">This booking is {b.status.toLowerCase()}. No further changes can be made.</p>}
          {active && (
            <div className="btn-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              {b.balance_due > 0 && (
                <button className="btn" onClick={() => setModal('pay')}>
                  {firstPayment ? 'Pay advance' : 'Pay balance'}
                </button>
              )}
              {!admin && <button className="btn secondary" onClick={() => setModal('size')}>Change number of people</button>}
              <button className="btn danger" onClick={() => setModal('cancel')}>Cancel booking</button>
              {!admin && b.status === 'Pending' && firstPayment && (
                <button className="btn danger" onClick={remove}>Delete booking</button>
              )}
            </div>
          )}
          <h3 style={{ marginTop: 22 }}>Cancellation policy</h3>
          <p className="small muted" style={{ marginBottom: 0 }}>
            30 or more days before the trek: 90% of what you paid is refunded. 7 to 29 days: 50%. Under 7 days: no refund. If we cancel a departure, you get 100% back.
          </p>
        </aside>
      </div>

      {modal === 'pay' && (
        <PayModal b={b} admin={admin} firstPayment={firstPayment} onClose={() => setModal(null)}
                  onDone={() => done('Payment recorded')} path={admin ? `${base}/payments` : `${base}/pay`} />
      )}
      {modal === 'size' && (
        <SizeModal b={b} onClose={() => setModal(null)} onDone={() => done('Booking updated')} path={base} />
      )}
      {modal === 'cancel' && (
        <CancelModal b={b} refundRate={refundRate} daysLeft={daysLeft} onClose={() => setModal(null)}
                     onDone={(r) => done(`Booking cancelled. Refund: ${rs(r)}`)} path={`${base}/cancel`} />
      )}
      {toast}
    </>
  );
}

function PayModal({ b, firstPayment, onClose, onDone, path, admin }) {
  const min = Math.ceil(b.total_amount * 0.3);
  const [form, setForm] = useState({
    amount: firstPayment ? min : b.balance_due,
    method: admin ? 'Cash' : 'JazzCash',
    reference_no: '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try {
      await api(path, {
        method: 'POST',
        body: { ...form, amount: Number(form.amount), payment_type: firstPayment ? 'Advance' : 'Balance' },
      });
      onDone();
    } catch (err) { setError(err.message); }
  }

  return (
    <Modal title={firstPayment ? 'Pay advance' : 'Pay balance'} onClose={onClose}>
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <Field label="Amount (Rs)" hint={firstPayment ? `At least ${rs(min)} (30%), up to ${rs(b.balance_due)}` : `Balance due: ${rs(b.balance_due)}`}>
          <input type="number" min="1" step="1" value={form.amount} onChange={set('amount')} required />
        </Field>
        <Field label="Method">
          <select value={form.method} onChange={set('method')}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
        </Field>
        <Field label="Transaction reference" hint="The ID from your JazzCash, Easypaisa or bank receipt">
          <input value={form.reference_no} onChange={set('reference_no')} />
        </Field>
        <div className="btn-row"><button className="btn">Record payment</button><button type="button" className="btn secondary" onClick={onClose}>Close</button></div>
      </form>
    </Modal>
  );
}

function SizeModal({ b, onClose, onDone, path }) {
  const [size, setSize] = useState(b.group_size);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    try { await api(path, { method: 'PUT', body: { group_size: Number(size) } }); onDone(); }
    catch (err) { setError(err.message); }
  }
  return (
    <Modal title="Change number of people" onClose={onClose}>
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <Field label="Number of people" hint={`Price per person: ${rs(b.price_per_person)}`}>
          <input type="number" min="1" max="20" value={size} onChange={(e) => setSize(e.target.value)} required />
        </Field>
        <div className="btn-row"><button className="btn">Save changes</button><button type="button" className="btn secondary" onClick={onClose}>Close</button></div>
      </form>
    </Modal>
  );
}

function CancelModal({ b, refundRate, daysLeft, onClose, onDone, path }) {
  const [error, setError] = useState('');
  async function submit() {
    try { const r = await api(path, { method: 'POST' }); onDone(r.refund); }
    catch (err) { setError(err.message); }
  }
  return (
    <Modal title="Cancel booking" onClose={onClose}>
      <Alert>{error}</Alert>
      <p>The trek starts in {daysLeft} days, so {refundRate}% of the {rs(b.amount_paid)} paid will be refunded: <strong>{rs((b.amount_paid * refundRate) / 100)}</strong>.</p>
      <p className="muted">Cancelling can't be undone. Your seats go back on sale.</p>
      <div className="btn-row"><button className="btn danger" onClick={submit}>Cancel booking</button><button className="btn secondary" onClick={onClose}>Keep booking</button></div>
    </Modal>
  );
}
