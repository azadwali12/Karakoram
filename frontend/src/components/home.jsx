// Homepage sections: discover tiles, trail map, stories and trip planning.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rs, date } from '../api.js';
import { Chip, Reveal } from './ui.jsx';
import { TrekImage } from './media.jsx';

// ---------- Discover: quick filters shown as round icon tiles ----------
const ic = {
  all: 'M4 18 9 9l3 5 3-4 5 8z',
  easy: 'M5 17c3-6 11-6 14 0M12 7v4M9 9l3 2 3-2',
  meadow: 'M3 18h18M6 18c0-4 1-6 1-6s1 2 1 6M11 18c0-5 1-8 1-8s1 3 1 8M16 18c0-4 1-6 1-6s1 2 1 6',
  lake: 'M3 9l5-5 4 4 3-3 6 6M3 15c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M3 19c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0',
  camp: 'M3 19 12 5l9 14zM12 5v14M9 19l3-5 3 5',
  peak: 'M2 20 9 7l3 5 3-6 7 14zM8 9l1-2 1 2M14 8l1-2 1 2',
};

export const DISCOVER = [
  { key: 'all', label: 'All treks', filters: {} },
  { key: 'easy', label: 'First trek', filters: { difficulty: 'Easy' } },
  { key: 'meadow', label: 'Meadows', filters: { search: 'meadow' } },
  { key: 'lake', label: 'Alpine lakes', filters: { search: 'lake' } },
  { key: 'camp', label: 'Base camps', filters: { search: 'base camp' } },
  { key: 'peak', label: 'Big expeditions', filters: { difficulty: 'Extreme' } },
];

export function Discover({ active, onPick }) {
  return (
    <section className="discover">
      <div className="eyebrow">Discover Gilgit-Baltistan</div>
      <h2>What kind of trip are you after?</h2>
      <ul className="discover-row">
        {DISCOVER.map((d, i) => (
          <Reveal as="li" key={d.key} delay={i}>
            <button className={`discover-tile ${active === d.key ? 'on' : ''}`} onClick={() => onPick(d)} aria-pressed={active === d.key}>
              <span className="discover-icon">
                <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                  <path d={ic[d.key]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {d.label}
            </button>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

// ---------- Trail map: schematic, positions are approximate ----------
// Map window: 73.2–77.0 °E, 34.7–37.1 °N, drawn into an 800 × 480 box
const px = ([lat, lon]) => [((lon - 73.2) / 3.8) * 800, ((37.1 - lat) / 2.4) * 480];

// Trek name keyword -> approximate trailhead/destination position
const TREK_SPOTS = [
  ['k2', [35.83, 76.52]], ['snow lake', [35.98, 75.75]], ['rush lake', [36.17, 74.93]],
  ['rakaposhi', [36.15, 74.56]], ['patundas', [36.43, 74.89]], ['fairy meadows', [35.42, 74.59]],
  ['deosai', [35.03, 75.5]], ['qurumbar', [36.86, 73.64]],
];
const spotFor = (name) => TREK_SPOTS.find(([k]) => name.toLowerCase().includes(k))?.[1];

const TOWNS = [['Gilgit', [35.92, 74.31]], ['Hunza', [36.32, 74.66]], ['Skardu', [35.3, 75.63]], ['Astore', [35.37, 74.86]], ['Khaplu', [35.16, 76.33]], ['Gahkuch', [36.17, 73.77]]];
const PEAKS = [['K2 8,611 m', [35.88, 76.51]], ['Nanga Parbat 8,126 m', [35.24, 74.59]], ['Rakaposhi 7,788 m', [36.14, 74.49]]];

const line = (pts) => 'M' + pts.map((p) => px(p).map((n) => n.toFixed(0)).join(' ')).join(' L');
const RIVERS = [
  ['Indus', line([[35.16, 76.33], [35.3, 75.63], [35.62, 75.05], [35.75, 74.62], [35.42, 74.1], [35.3, 73.2]])],
  ['Hunza', line([[36.85, 75.4], [36.45, 74.88], [36.32, 74.66], [35.92, 74.31]])],
  ['Gilgit', line([[36.17, 73.77], [36.05, 74.05], [35.92, 74.31], [35.75, 74.62]])],
];

export function TrailMap({ treks }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(null);
  const placed = (treks || []).map((t) => ({ t, at: spotFor(t.trek_name) })).filter((p) => p.at);
  const active = placed.find((p) => p.t.trek_id === hover);

  return (
    <section className="map-section">
      <div className="section-head">
        <div>
          <div className="eyebrow">Where you'll walk</div>
          <h2>Explore the valleys of Gilgit-Baltistan</h2>
        </div>
        <p>Point at a marker to see the trek, click to open it. Positions are approximate.</p>
      </div>
      <div className="map-wrap glass">
        <div className="map-canvas">
        <svg className="map" viewBox="0 0 800 480" role="img" aria-label="Schematic map of trek locations in Gilgit-Baltistan">
          <defs>
            <radialGradient id="mapglow" cx="0.6" cy="0.35" r="0.8">
              <stop offset="0" stopColor="#1b3566" /><stop offset="1" stopColor="#0a1324" stopOpacity="0" />
            </radialGradient>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.05)" />
            </pattern>
          </defs>
          <rect width="800" height="480" fill="url(#mapglow)" />
          <rect width="800" height="480" fill="url(#grid)" />
          {RIVERS.map(([n, d]) => (
            <g key={n}>
              <path d={d} fill="none" stroke="#3a86b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </g>
          ))}
          {PEAKS.map(([n, at]) => {
            const [x, y] = px(at);
            return (
              <g key={n} className="map-peak">
                <path d={`M${x - 9} ${y + 7} L${x} ${y - 9} L${x + 9} ${y + 7} Z`} fill="#c3cfe0" opacity="0.8" />
                <text x={x + 13} y={y + 4}>{n}</text>
              </g>
            );
          })}
          {TOWNS.map(([n, at]) => {
            const [x, y] = px(at);
            return (
              <g key={n} className="map-town">
                <circle cx={x} cy={y} r="3.5" />
                <text x={x + 8} y={y - 6}>{n}</text>
              </g>
            );
          })}
          {placed.map(({ t, at }) => {
            const [x, y] = px(at);
            return (
              <g key={t.trek_id} className={`map-pin ${hover === t.trek_id ? 'on' : ''}`} transform={`translate(${x} ${y})`}
                 tabIndex={0} role="link" aria-label={t.trek_name}
                 onMouseEnter={() => setHover(t.trek_id)} onMouseLeave={() => setHover(null)}
                 onFocus={() => setHover(t.trek_id)} onBlur={() => setHover(null)}
                 onClick={() => navigate(`/treks/${t.trek_id}`)}
                 onKeyDown={(e) => e.key === 'Enter' && navigate(`/treks/${t.trek_id}`)}>
                <circle className="pulse" r="10" />
                <path d="M0 0c-6-8-9-12-9-16a9 9 0 0 1 18 0c0 4-3 8-9 16z" />
                <circle cy="-16" r="3.4" fill="#08101f" />
              </g>
            );
          })}
          <text x="16" y="466" className="map-note">Schematic, not to scale · rivers: Indus, Hunza, Gilgit</text>
        </svg>

        {active && (
          <div className="map-tip" style={{ left: `${(px(active.at)[0] / 800) * 100}%`, top: `${(px(active.at)[1] / 480) * 100}%` }}>
            <b>{active.t.trek_name}</b>
            <span><Chip value={active.t.difficulty} /> {active.t.duration_days} days</span>
            {active.t.open_departures > 0 && <span className="small muted">from {rs(active.t.from_price)}</span>}
          </div>
        )}
        </div>

        <ul className="map-list">
          {placed.map(({ t }) => (
            <li key={t.trek_id}>
              <Link to={`/treks/${t.trek_id}`} className={hover === t.trek_id ? 'on' : ''}
                    onMouseEnter={() => setHover(t.trek_id)} onMouseLeave={() => setHover(null)}>
                <span>{t.trek_name}</span>
                <small>{t.region} · {t.duration_days} days</small>
              </Link>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}

// ---------- Feature banner: the next group leaving ----------
export function NextDeparture({ treks }) {
  const next = (treks || []).filter((t) => t.next_departure).sort((a, b) => String(a.next_departure).localeCompare(String(b.next_departure)))[0];
  if (!next) return null;
  return (
    <Reveal className="feature">
      <TrekImage name={next.trek_name} alt="" />
      <div className="feature-card glass">
        <div className="eyebrow">Next group leaves {date(next.next_departure)}</div>
        <h3>{next.trek_name}</h3>
        <p className="muted">{next.region} · {next.duration_days} days · up to {next.max_altitude_m.toLocaleString()} m</p>
        <Link to={`/treks/${next.trek_id}`} className="btn small">See dates and seats</Link>
      </div>
    </Reveal>
  );
}

// ---------- Glimpse: alternating stories ----------
const STORIES = [
  { key: 'responsible', seed: 11, title: 'Trek responsibly',
    text: 'Carry your rubbish back down, stay on the trail and respect village customs. Our guides and porters come from the valleys you walk through, so your trip supports the people who live there.' },
  { key: 'festivals', seed: 23, title: 'Festivals worth timing your trip for',
    text: 'Polo on Shandur Pass in early July, Navroz celebrations in spring, and the Ginani harvest festival in Hunza in early summer. Ask us which departures line up with them.' },
  { key: 'culture', seed: 5, title: 'Forts, valleys and old trade routes',
    text: 'Baltit and Altit forts look down over Hunza valley, and the Karakoram Highway follows part of an old Silk Road branch. Most treks start or end with a day to explore.' },
  { key: 'food', seed: 18, title: 'Food on the trail',
    text: 'Apricots and walnuts from Hunza, chapshoro (bread stuffed with spiced meat) and salty butter tea in Baltistan. Our cooks make sure you eat well even at base camp.' },
];

export function Glimpse() {
  return (
    <section className="glimpse">
      <div className="section-head center">
        <div>
          <div className="eyebrow">A glimpse of Gilgit-Baltistan</div>
          <h2>More than mountains</h2>
        </div>
      </div>
      {STORIES.map((s, i) => (
        <Reveal key={s.key} className={`story ${i % 2 ? 'flip' : ''}`}>
          <TrekImage name={s.title} seed={s.seed} src={`/images/glimpse/${s.key}.jpg`} alt="" />
          <div className="story-text">
            <span className="story-num">0{i + 1}</span>
            <h3>{s.title}</h3>
            <p className="muted">{s.text}</p>
          </div>
        </Reveal>
      ))}
    </section>
  );
}

// ---------- Plan your trip: three entry points ----------
export function PlanTrip({ user, gearCount }) {
  const cards = [
    { title: 'Treks and dates', text: 'Compare routes, check seats left and book with a 30% advance.', to: '#treks', seed: 3 },
    { title: 'Gear rental', text: `${gearCount ?? 'Plenty of'} items to rent, from sleeping bags to crampons. Add them when you book.`, to: '#treks', seed: 9 },
    user?.role === 'customer'
      ? { title: 'Your bookings', text: 'Pay instalments, change gear or cancel under our refund policy.', to: '/my/bookings', seed: 14 }
      : { title: 'Create an account', text: 'Takes a minute. We need your CNIC or passport for trekking permits.', to: '/login', seed: 14 },
  ];
  return (
    <section className="plan">
      <div className="section-head">
        <div>
          <div className="eyebrow">Get ready</div>
          <h2>Plan your trip</h2>
        </div>
      </div>
      <ul className="plan-grid">
        {cards.map((c, i) => {
          const inner = (
            <>
              <TrekImage name={c.title} seed={c.seed} alt="" />
              <div className="plan-body">
                <h3>{c.title}</h3>
                <p className="muted">{c.text}</p>
                <span className="plan-more">Go <span aria-hidden="true">→</span></span>
              </div>
            </>
          );
          return (
            <Reveal as="li" key={c.title} delay={i}>
              {c.to.startsWith('#')
                ? <a href={c.to} className="plan-card">{inner}</a>
                : <Link to={c.to} className="plan-card">{inner}</Link>}
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
