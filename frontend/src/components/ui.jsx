// Small shared pieces used on many screens.
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api.js';

// Fades and lifts its content into view the first time it scrolls on screen
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ '--d': `${delay * 80}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

// Load data from an API path; returns { data, error, loading, reload }
export function useLoad(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return api(path)
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Chip({ value, className = '' }) {
  return <span className={`chip ${value} ${className}`}>{value}</span>;
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      <label>
        {label}
      </label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Brief confirmation message at the bottom of the screen
export function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return [node, setMsg];
}

// Altitude bar on a scale from sea level to K2's summit (8611 m)
export function Altitude({ meters }) {
  const pct = Math.min(100, (meters / 8611) * 100);
  return (
    <div className="altitude" title={`Highest point ${meters.toLocaleString()} m`}>
      <div className="altitude-track">
        <div className="altitude-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="altitude-label">
        <span>Highest point</span>
        <b>{meters.toLocaleString()} m</b>
      </div>
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
