// Screen: My Bookings — all of the customer's bookings (READ)
import { Link, useNavigate } from 'react-router-dom';
import { rs, date } from '../api.js';
import { useLoad, Alert, Chip, Empty } from '../components/ui.jsx';

export default function MyBookings() {
  const { data, error } = useLoad('/my/bookings');
  const navigate = useNavigate();

  return (
    <main className="page">
      <div className="page-head">
        <h1>My bookings</h1>
        <Link to="/" className="btn secondary">Find a trek</Link>
      </div>
      <Alert>{error}</Alert>
      {data?.length === 0 && <Empty>You have no bookings yet. <Link to="/">Browse treks</Link> to plan your first one.</Empty>}
      {data?.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Trek</th><th>Dates</th><th className="num">People</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.booking_id} className="clickable" tabIndex={0}
                    onClick={() => navigate(`/my/bookings/${b.booking_id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/my/bookings/${b.booking_id}`)}>
                  <td><strong>{b.trek_name}</strong><div className="small muted">Booking #{b.booking_id}</div></td>
                  <td>{date(b.start_date)} – {date(b.end_date)}</td>
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
    </main>
  );
}
