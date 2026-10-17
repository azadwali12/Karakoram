// Screen: Booking Details (customer) — READ, UPDATE, payments, cancel, DELETE
import { Link, useParams, useSearchParams } from 'react-router-dom';
import BookingView from '../components/BookingView.jsx';

export default function BookingDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  return (
    <main className="page">
      <Link to="/my/bookings" className="back">My bookings</Link>
      <div style={{ marginTop: 12 }}>
        <BookingView id={id} isNew={params.get('new') === '1'} />
      </div>
    </main>
  );
}
