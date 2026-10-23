// Live weather for trekking towns, from the free Open-Meteo service (no API key).
// Called straight from the browser; if it fails we say so instead of guessing.
import { useEffect, useState } from 'react';

const TOWNS = [
  { name: 'Gilgit', lat: 35.92, lon: 74.31 },
  { name: 'Karimabad (Hunza)', lat: 36.32, lon: 74.66 },
  { name: 'Skardu', lat: 35.30, lon: 75.63 },
  { name: 'Fairy Meadows', lat: 35.42, lon: 74.59 },
  { name: 'Astore', lat: 35.37, lon: 74.86 },
  { name: 'Khaplu', lat: 35.16, lon: 76.33 },
];

// WMO weather codes -> label + icon
function describe(code) {
  if (code === 0) return ['Clear', 'sun'];
  if (code <= 2) return ['Partly cloudy', 'partly'];
  if (code === 3) return ['Overcast', 'cloud'];
  if (code <= 48) return ['Fog', 'fog'];
  if (code <= 67 || (code >= 80 && code <= 82)) return ['Rain', 'rain'];
  if (code <= 77 || code === 85 || code === 86) return ['Snow', 'snow'];
  return ['Thunderstorm', 'storm'];
}

function Icon({ kind, size = 28 }) {
  const sun = <circle cx="12" cy="12" r="4.5" fill="#ffc56b" />;
  const cloud = <path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.3A3.4 3.4 0 0 0 7 18z" fill="#c3cfe0" />;
  const drops = (c) => [8, 12, 16].map((x) => <path key={x} d={`M${x} 20l-1 2.5`} stroke={c} strokeWidth="1.6" strokeLinecap="round" />);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'sun' && <>{sun}{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="12" y1="3" x2="12" y2="5" stroke="#ffc56b" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
      ))}</>}
      {kind === 'partly' && <><g transform="translate(-3 -3)">{sun}</g>{cloud}</>}
      {(kind === 'cloud' || kind === 'fog') && cloud}
      {kind === 'fog' && [20, 22.5].map((y) => <line key={y} x1="5" y1={y} x2="19" y2={y} stroke="#94a6c0" strokeWidth="1.4" strokeLinecap="round" />)}
      {kind === 'rain' && <>{cloud}{drops('#62c6e8')}</>}
      {kind === 'snow' && <>{cloud}{[8, 12, 16].map((x) => <circle key={x} cx={x} cy="21.5" r="1.2" fill="#fff" />)}</>}
      {kind === 'storm' && <>{cloud}<path d="M12 17l-2 4h3l-1.5 3" stroke="#ffc56b" strokeWidth="1.6" fill="none" strokeLinejoin="round" /></>}
    </svg>
  );
}

const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });

export default function Weather() {
  const [town, setTown] = useState(TOWNS[0]);
  const [cache, setCache] = useState({});
  const [failed, setFailed] = useState(false);
  const w = cache[town.name];

  useEffect(() => {
    if (cache[town.name]) return;
    setFailed(false);
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${town.lat}&longitude=${town.lon}`
      + '&current=temperature_2m,weather_code,wind_speed_10m'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
      + '&timezone=Asia%2FKarachi&forecast_days=6';
    let alive = true;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => alive && setCache((c) => ({ ...c, [town.name]: d })))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [town, cache]);

  return (
    <div className="weather glass">
      <div className="weather-tabs" role="tablist" aria-label="Town">
        {TOWNS.map((t) => (
          <button key={t.name} role="tab" aria-selected={t === town} className={t === town ? 'on' : ''} onClick={() => setTown(t)}>
            {t.name}
          </button>
        ))}
      </div>

      {failed && !w && <p className="muted weather-msg">Live weather could not be loaded right now. Check your internet connection and try again.</p>}
      {!failed && !w && <p className="muted weather-msg">Loading weather…</p>}

      {w && (() => {
        const [label, icon] = describe(w.current.weather_code);
        return (
          <div className="weather-body">
            <div className="weather-now">
              <Icon kind={icon} size={64} />
              <div>
                <b>{Math.round(w.current.temperature_2m)}°C</b>
                <span>{label} · wind {Math.round(w.current.wind_speed_10m)} km/h</span>
                <span className="muted small">{town.name}, {Math.round(w.elevation).toLocaleString()} m above sea level</span>
              </div>
            </div>
            <ol className="weather-days">
              {w.daily.time.map((d, i) => (
                <li key={d}>
                  <span>{i === 0 ? 'Today' : day(d)}</span>
                  <Icon kind={describe(w.daily.weather_code[i])[1]} />
                  <b>{Math.round(w.daily.temperature_2m_max[i])}°</b>
                  <span className="muted">{Math.round(w.daily.temperature_2m_min[i])}°</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })()}
      <p className="muted small weather-credit">Weather data: <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>. Mountain weather changes fast; your guide makes the final call.</p>
    </div>
  );
}
