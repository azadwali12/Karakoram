// Screen: Browse Treks — list of treks with filters (READ)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { rs, date } from '../api.js';
import { useLoad, Alert, Chip, Altitude, Empty } from '../components/ui.jsx';

function Ridge() {
  // A Karakoram skyline that melts into the page background
  return (
    <svg className="ridge" viewBox="0 0 1200 150" preserveAspectRatio="none" aria-hidden="true">
      <path fill="#3c4d59" d="M0 150 L0 96 L70 70 L130 88 L210 40 L260 62 L330 18 L380 52 L430 44 L500 78 L560 58 L640 20 L690 46 L760 34 L820 66 L900 30 L960 58 L1040 48 L1100 74 L1200 56 L1200 150 Z" />
      <path fill="#f7f9fa" d="M0 150 L0 122 L90 104 L170 118 L260 92 L340 110 L420 96 L520 120 L610 98 L700 114 L790 100 L880 118 L970 102 L1060 116 L1140 104 L1200 112 L1200 150 Z" />
      <path fill="#e3edf2" d="M330 18 L346 30 L338 34 L322 30 Z M640 20 L656 33 L646 36 L630 32 Z M900 30 L914 41 L904 44 L890 40 Z" />
    </svg>
  );
}

export default function Browse() {
  const [filters, setFilters] = useState({ region: '', difficulty: '', search: '' });
  const qs = new URLSearchParams(filters).toString();
  const { data: treks, error, loading } = useLoad(`/treks?${qs}`, [qs]);
  const { data: regions } = useLoad('/regions');
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1>Treks across Gilgit-Baltistan</h1>
          <p>From a weekend at Rakaposhi Base Camp to three weeks on the Baltoro Glacier. Pick a date, see how many seats are left, and book with a 30% advance.</p>
        </div>
        <Ridge />
      </section>

      <main className="page" style={{ paddingTop: 8 }}>
        <div className="filters" role="search">
          <div className="field">
            <label htmlFor="f-search">Search</label>
            <input id="f-search" value={filters.search} onChange={set('search')} placeholder="Trek or region" />
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
        </div>

        <Alert>{error}</Alert>
        {!loading && treks?.length === 0 && <Empty>No treks match these filters. Try another region or difficulty.</Empty>}

        <ul className="trek-list">
          {treks?.map((t) => (
            <li key={t.trek_id}>
              <Link to={`/treks/${t.trek_id}`} className="trek-row">
                <div>
                  <h3>{t.trek_name}</h3>
                  <div className="trek-meta">
                    <Chip value={t.difficulty} />
                    <span>{t.region}</span>
                    <span>{t.duration_days} days</span>
                    {t.permit_required && <span>Permit needed</span>}
                  </div>
                </div>
                <Altitude meters={t.max_altitude_m} />
                <div className="trek-price">
                  {t.open_departures > 0 ? (
                    <>
                      <span className="muted small">from</span>
                      <strong>{rs(t.from_price)}</strong>
                      <span className="muted small">next: {date(t.next_departure)}</span>
                    </>
                  ) : (
                    <span className="muted small">No dates open</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
