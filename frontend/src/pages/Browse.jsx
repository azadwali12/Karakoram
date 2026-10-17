// Screen: Browse Treks — list of treks with filters (READ)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { rs, date } from '../api.js';
import { useLoad, Alert, Chip, Altitude, Empty, Reveal } from '../components/ui.jsx';
import { TrekImage } from '../components/media.jsx';
import { useAuth } from '../auth.jsx';

export default function Browse() {
  const [filters, setFilters] = useState({ region: '', difficulty: '', search: '' });
  const qs = new URLSearchParams(filters).toString();
  const { data: treks, error, loading } = useLoad(`/treks?${qs}`, [qs]);
  const { data: all } = useLoad('/treks');
  const { data: regions } = useLoad('/regions');
  const { user } = useAuth();
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const highest = all ? Math.max(...all.map((t) => t.max_altitude_m)) : null;
  const openDates = all ? all.reduce((s, t) => s + Number(t.open_departures || 0), 0) : null;
  const cheapest = all ? Math.min(...all.filter((t) => t.from_price).map((t) => Number(t.from_price))) : null;

  return (
    <>
      <section className="hero">
        <TrekImage name="hero" src="/images/hero.jpg" seed={7} eager />
        <div className="hero-inner">
          <span className="pill"><span className="dot" /> Booking open for the autumn and winter season</span>
          <h1>Walk among the <span className="grad-text">giants of the Karakoram</span></h1>
          <p className="lead">
            From a weekend at Rakaposhi Base Camp to three weeks on the Baltoro Glacier beneath K2.
            Pick a date, see how many seats are left, and book with a 30% advance.
          </p>
          <div className="btn-row">
            <a href="#treks" className="btn">Explore treks</a>
            {user?.role === 'customer'
              ? <Link to="/my/bookings" className="btn secondary">My bookings</Link>
              : <Link to="/login" className="btn secondary">Create an account</Link>}
          </div>
          {all && (
            <div className="hero-stats">
              <div className="hero-stat glass"><b>{all.length}</b><span>guided routes</span></div>
              <div className="hero-stat glass"><b>{highest.toLocaleString()} m</b><span>highest point</span></div>
              <div className="hero-stat glass"><b>{openDates}</b><span>open departures</span></div>
              {Number.isFinite(cheapest) && <div className="hero-stat glass"><b>{rs(cheapest)}</b><span>trips start from</span></div>}
            </div>
          )}
        </div>
      </section>

      <div className="searchbar" role="search">
        <div className="searchbar-inner glass">
          <div className="field">
            <label htmlFor="f-search">Search</label>
            <input id="f-search" value={filters.search} onChange={set('search')} placeholder="K2, Hunza, lake…" />
          </div>
          <div className="field">
            <label htmlFor="f-region">Region</label>
            <select id="f-region" value={filters.region} onChange={set('region')}>
              <option value="">All regions</option>
              {regions?.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-diff">Difficulty</label>
            <select id="f-diff" value={filters.difficulty} onChange={set('difficulty')}>
              <option value="">Any difficulty</option>
              {['Easy', 'Moderate', 'Hard', 'Extreme'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="count" aria-live="polite">{treks ? `${treks.length} trek${treks.length === 1 ? '' : 's'}` : ''}</div>
        </div>
      </div>

      <main className="page" id="treks" style={{ paddingTop: 0, animation: 'none' }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Gilgit-Baltistan, Pakistan</div>
            <h2>Choose your trail</h2>
          </div>
          <p>Meadows under Nanga Parbat, turquoise lakes in Ghizer, and glacier crossings to the foot of K2.</p>
        </div>

        <Alert>{error}</Alert>
        {!loading && treks?.length === 0 && <Empty>No treks match these filters. Try another region or difficulty.</Empty>}

        <ul className="trek-grid">
          {treks?.map((t, i) => (
            <Reveal as="li" key={t.trek_id} delay={i % 3}>
              <Link to={`/treks/${t.trek_id}`} className="trek-card">
                <TrekImage name={t.trek_name} alt={t.trek_name} />
                <div className="card-tags">
                  <Chip value={t.difficulty} />
                  {t.permit_required && <span className="chip plain">Permit needed</span>}
                </div>
                <div className="card-body">
                  <div>
                    <h3>{t.trek_name}</h3>
                    <div className="region">{t.region} · {t.duration_days} days</div>
                  </div>
                  <Altitude meters={t.max_altitude_m} />
                  <div className="card-foot">
                    <div className="price">
                      {t.open_departures > 0 ? (
                        <>
                          <small>from</small>
                          <strong>{rs(t.from_price)}</strong>
                          <small>next departure {date(t.next_departure)}</small>
                        </>
                      ) : (
                        <small>No dates open</small>
                      )}
                    </div>
                    <span className="go" aria-hidden="true">→</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </main>
    </>
  );
}
