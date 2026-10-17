// Screen: Trek Details — one trek and its open departures (READ)
import { Link, useParams, useNavigate } from 'react-router-dom';
import { rs, date } from '../api.js';
import { useLoad, Alert, Chip, Altitude, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

export default function TrekDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: t, error } = useLoad(`/treks/${id}`);

  if (error) return <main className="page"><Alert>{error}</Alert><Link to="/">Back to treks</Link></main>;
  if (!t) return <main className="page muted">Loading…</main>;

  const book = (depId) => navigate(user?.role === 'customer' ? `/book/${depId}` : `/login?next=/book/${depId}`);

  return (
    <main className="page">
      <Link to="/" className="small">All treks</Link>
      <div className="detail-grid" style={{ marginTop: 12 }}>
        <div>
          <h1>{t.trek_name}</h1>
          <div className="trek-meta"><Chip value={t.difficulty} /><span>{t.region}</span></div>
          <div className="facts">
            <div className="fact"><span>Length</span><b>{t.duration_days} days</b></div>
            <div className="fact"><span>Highest point</span><b>{t.max_altitude_m.toLocaleString()} m</b></div>
            <div className="fact"><span>Permit</span><b>{t.permit_required ? 'Required' : 'Not needed'}</b></div>
            <div className="fact"><span>Base price</span><b>{rs(t.base_price)}</b></div>
          </div>
          <Altitude meters={t.max_altitude_m} />
          <p style={{ marginTop: 24 }}>{t.description}</p>
          {t.permit_required && (
            <p className="muted">This route enters a restricted zone. We apply for the permit using the CNIC or passport on your profile, so check it is correct before booking.</p>
          )}
        </div>

        <aside className="panel" aria-label="Departure dates">
          <h2>Departure dates</h2>
          {t.departures.length === 0 && <Empty>No open dates right now. Check back soon.</Empty>}
          {t.departures.map((d) => {
            const full = d.seats_left <= 0;
            return (
              <div className="departure" key={d.departure_id}>
                <div>
                  <div className="dates">{date(d.start_date)} – {date(d.end_date)}</div>
                  <div className="small muted">
                    {rs(d.price_per_person)} per person · guide: {d.guide_name || 'to be assigned'}
                  </div>
                  <div className="seats" aria-hidden="true">
                    <div style={{ width: `${(d.seats_booked / d.max_group_size) * 100}%` }} />
                  </div>
                  <div className="small">{full ? 'Full' : `${d.seats_left} of ${d.max_group_size} seats left`}</div>
                </div>
                <div>
                  <button className="btn" disabled={full} onClick={() => book(d.departure_id)}>Book</button>
                </div>
              </div>
            );
          })}
        </aside>
      </div>
    </main>
  );
}
