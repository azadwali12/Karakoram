// Trek pictures. Each trek looks for a photo at /images/treks/<slug>.jpg
// (put files in frontend/public/images/treks/). Until a photo exists, a
// drawn mountain scene is shown instead, so the page never looks empty.
import { useId, useState } from 'react';

export const slug = (name = '') =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Small seeded random generator, so each trek always gets the same scene
function rng(seed) {
  let a = seed * 9301 + 49297;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIES = [
  { sky: ['#141d3d', '#5c3b6e', '#f0976a'], sun: '#ffd9a8', ridges: ['#6a5a83', '#463c63', '#2a2647', '#16162b'], snow: '#ffeadf' },
  { sky: ['#0a2440', '#2c6a9a', '#a6d8ea'], sun: '#f6fcff', ridges: ['#7898b2', '#4a6d8d', '#2b4867', '#132a40'], snow: '#ffffff' },
  { sky: ['#110e2c', '#472a61', '#d8677b'], sun: '#ffb68c', ridges: ['#5e4272', '#3d2b55', '#26193b', '#130f24'], snow: '#f7dde9' },
  { sky: ['#0d1b31', '#2b4d7a', '#f1b27b'], sun: '#ffe3b4', ridges: ['#7e7290', '#4b4f70', '#2b3451', '#141b2e'], snow: '#fff2e4' },
];

function ridgePath(r, baseY, amp, jag) {
  let x = 0;
  let d = `M0 450 L0 ${baseY - r() * amp * 0.5}`;
  let top = { x: 0, y: 999 };
  while (x < 800) {
    x += 40 + r() * jag;
    const y = baseY - r() * amp;
    if (y < top.y) top = { x, y };
    d += ` L${Math.min(x, 800).toFixed(0)} ${y.toFixed(0)}`;
  }
  return { d: `${d} L800 450 Z`, top };
}

export function Scene({ name = '', seed = 1, className = '' }) {
  const id = useId().replace(/:/g, '');
  const r = rng(seed);
  const p = SKIES[seed % SKIES.length];
  const lake = /lake/i.test(name);
  const meadow = /meadow|plain/i.test(name);

  const layers = [
    ridgePath(r, 210, 150, 70),
    ridgePath(r, 265, 95, 80),
    ridgePath(r, 320, 70, 90),
    ridgePath(r, lake ? 345 : 385, 45, 100),
  ];
  const sunX = 120 + r() * 560;
  const stars = Array.from({ length: 26 }, () => [r() * 800, r() * 150, r() * 1.2 + 0.3]);

  return (
    <svg className={`scene ${className}`} viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.55" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.sky[2]} />
        </linearGradient>
        <radialGradient id={`sun${id}`}>
          <stop offset="0" stopColor={p.sun} stopOpacity="0.95" />
          <stop offset="0.25" stopColor={p.sun} stopOpacity="0.45" />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`fog${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.16" />
        </linearGradient>
        {layers.slice(0, 2).map((l, i) => (
          <linearGradient key={i} id={`snow${id}${i}`} gradientUnits="userSpaceOnUse" x1="0" y1={l.top.y} x2="0" y2={l.top.y + 70}>
            <stop offset="0" stopColor={p.snow} stopOpacity="0.95" />
            <stop offset="1" stopColor={p.snow} stopOpacity="0" />
          </linearGradient>
        ))}
        <linearGradient id={`lake${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.ridges[3]} />
        </linearGradient>
      </defs>

      <rect width="800" height="450" fill={`url(#sky${id})`} />
      {stars.map(([x, y, s], i) => <circle key={i} cx={x} cy={y} r={s} fill="#fff" opacity="0.55" />)}
      <circle cx={sunX} cy={170} r="130" fill={`url(#sun${id})`} />

      {layers.map((l, i) => (
        <g key={i} className={`layer l${i}`}>
          <path d={l.d} fill={meadow && i === 3 ? '#1d3a2e' : p.ridges[i]} />
          {i < 2 && <path d={l.d} fill={`url(#snow${id}${i})`} />}
          {i < 3 && <rect y={l.top.y} width="800" height={450 - l.top.y} fill={`url(#fog${id})`} />}
        </g>
      ))}

      {lake && (
        <g>
          <rect y="372" width="800" height="78" fill={`url(#lake${id})`} />
          {[384, 398, 414, 432].map((y, i) => (
            <rect key={y} x={90 + i * 120 + r() * 80} y={y} width={120 + r() * 160} height="1.6" rx="1" fill="#fff" opacity={0.28 - i * 0.05} />
          ))}
        </g>
      )}
    </svg>
  );
}

// Same trek name -> same scene on every screen
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Photo if one exists, drawn scene underneath as the fallback
export function TrekImage({ name, seed = hash(name), src, className = '', alt = '', eager = false }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const url = src || `/images/treks/${slug(name)}.jpg`;
  return (
    <div className={`media ${className}`}>
      <Scene name={name} seed={seed} />
      {!failed && (
        <img src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} className={loaded ? 'loaded' : ''}
             onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      )}
    </div>
  );
}
