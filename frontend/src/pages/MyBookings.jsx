// Screen: My Bookings — all of the customer's bookings (READ)
import { Link } from 'react-router-dom';
import { rs, date } from '../api.js';
import { useLoad, Alert, Chip, Empty, Reveal } from '../components/ui.jsx';
import { TrekImage } from '../components/media.jsx';

export default function MyBookings() {
  const { data, error } = useLoad('/my/bookings');

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Your trips</div>
          <h1>My bookings</h1>
        </div>
        <Link to="/" className="btn secondary">Find a trek</Link>
      </div>
      <Alert>{error}</Alert>
      {data?.length === 0 && <Empty>You have no bookings yet. <Link to="/">Browse treks</Link> to plan your first one.</Empty>}
      <ul className="booking-list">
        {data?.map((b, i) => {
          const paidPct = b.total_amount > 0 ? Math.min(100, (b.amount_paid / b.total_amount) * 100) : 0;
          return (
            <Reveal as="li" key={b.booking_id} delay={i}>
              <Link to={`/my/bookings/${b.booking_id}`} className="booking-card">
                <TrekImage name={b.trek_name} alt="" />
                <div>
                  <Chip value={b.status} />
                  <h3>{b.trek_name}</h3>
                  <div className="small muted">
                    {date(b.start_date)} – {date(b.end_date)} · {b.group_size} {b.group_size === 1 ? 'person' : 'people'} · Booking #{b.booking_id}
                  </div>
                </div>
                <div className="money">
                  <div><span>Total</span><br /><b>{rs(b.total_amount)}</b></div>
                  <div><span>Paid</span><br /><b>{rs(b.amount_paid)}</b></div>
                  <div><span>Balance</span><br /><b>{rs(b.balance_due)}</b></div>
                  <div className="paid-bar" aria-label={`${Math.round(paidPct)}% paid`}><div style={{ width: `${paidPct}%` }} /></div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </main>
  );
}
