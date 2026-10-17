// Screen: Trek Details — one trek and its open departures (READ)
import { Link, useParams, useNavigate } from 'react-router-dom';
import { rs, date } from '../api.js';
import { useLoad, Alert, Chip, Altitude, Empty, Reveal } from '../components/ui.jsx';
import { TrekImage } from '../components/media.jsx';
import { useAuth } from '../auth.jsx';

export default function TrekDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: t, error } = useLoad(`/treks/${id}`);

  if (error) return <main className="page"><Alert>{error}</Alert><Link to="/">Back to treks</Link></main>;
  if (!t) return <main className="page muted" style={{ paddingTop: 120 }}>Loading…</main>;

  const book = (depId) => navigate(user?.role === 'customer' ? `/book/${depId}` : `/login?next=/book/${depId}`);

  return (
    <>
      <section className="trek-hero">
        <TrekImage name={t.trek_name} alt={t.trek_name} eager />
        <div className="hero-inner">
          <Link to="/" className="back">All treks</Link>
          <h1>{t.trek_name}</h1>
          <div className="meta-row">
            <Chip value={t.difficulty} />
            <span className="chip plain">{t.region}</span>
            <span className="chip plain">{t.duration_days} days</span>
            {t.permit_required && <span className="chip plain">Permit needed</span>}
          </div>
        </div>
      </section>

      <main className="page" style={{ paddingTop: 8 }}>
        <div className="detail-grid">
          <div>
            <div className="facts">
              <div className="fact"><span>Length</span><b>{t.duration_days} days</b></div>
              <div className="fact"><span>Highest point</span><b>{t.max_altitude_m.toLocaleString()} m</b></div>
              <div className="fact"><span>Permit</span><b>{t.permit_required ? 'Required' : 'Not needed'}</b></div>
              <div className="fact"><span>Base price</span><b>{rs(t.base_price)}</b></div>
            </div>
            <div className="panel">
              <div className="eyebrow">About this trek</div>
              <p className="prose">{t.description}</p>
              <Altitude meters={t.max_altitude_m} />
              <p className="small muted" style={{ marginTop: 6, marginBottom: 0 }}>Bar scale: sea level to the summit of K2 (8,611 m).</p>
            </div>
            {t.permit_required && (
              <div className="notice" style={{ marginTop: 18 }}>
                This route enters a restricted zone. We apply for the permit using the CNIC or passport on your profile, so check it is correct before booking.
              </div>
            )}
          </div>

          <aside className="panel sticky" aria-label="Departure dates">
            <h2>Departure dates</h2>
            <p className="small muted">Seats are held as soon as you book. Pay a 30% advance to confirm.</p>
            {t.departures.length === 0 && <Empty>No open dates right now. Check back soon.</Empty>}
            {t.departures.map((d, i) => {
              const full = d.seats_left <= 0;
              return (
                <Reveal className="departure" key={d.departure_id} delay={i}>
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
                    <button className="btn small" disabled={full} onClick={() => book(d.departure_id)}>Book</button>
                  </div>
                </Reveal>
              );
            })}
          </aside>
        </div>
      </main>
    </>
  );
}
