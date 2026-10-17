// Screen: Bookings & payments — every booking (READ); detail page records payments and cancels
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { rs, date } from '../../api.js';
import { useLoad, Alert, Chip, Empty } from '../../components/ui.jsx';
import BookingView from '../../components/BookingView.jsx';

export default function Bookings() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const qs = new URLSearchParams({ status, search }).toString();
  const { data, error } = useLoad(`/admin/bookings?${qs}`, [qs]);
  const navigate = useNavigate();
  const open = (id) => navigate(`/admin/bookings/${id}`);

  return (
    <>
      <div className="page-head">
        <h1>Bookings and payments</h1>
        <div className="btn-row">
          <input aria-label="Search" placeholder="Customer or trek" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <Alert>{error}</Alert>
      {data?.length === 0 && <Empty>No bookings match.</Empty>}
      {data?.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Customer</th><th>Trek</th><th>Starts</th><th className="num">People</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.booking_id} className="clickable" tabIndex={0}
                    onClick={() => open(b.booking_id)} onKeyDown={(e) => e.key === 'Enter' && open(b.booking_id)}>
                  <td>{b.booking_id}</td>
                  <td>{b.customer_name}<div className="small muted">{b.customer_phone}</div></td>
                  <td>{b.trek_name}</td>
                  <td>{date(b.start_date)}</td>
                  <td className="num">{b.group_size}</td>
                  <td className="num">{rs(b.total_amount)}</td>
                  <td className="num">{rs(b.amount_paid)}</td>
                  <td className="num">{rs(b.balance_due)}</td>
                  <td><Chip value={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function AdminBookingDetail() {
  const { id } = useParams();
  return (
    <>
      <Link to="/admin/bookings" className="small">All bookings</Link>
      <div style={{ marginTop: 10 }}><BookingView id={id} admin /></div>
    </>
  );
}
