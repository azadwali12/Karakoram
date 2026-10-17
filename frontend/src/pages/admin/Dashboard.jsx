// Screen: Admin Dashboard — overview numbers and alerts (READ)
import { Link, useNavigate } from 'react-router-dom';
import { rs, date, dateTime } from '../../api.js';
import { useLoad, Alert, Empty } from '../../components/ui.jsx';

export default function Dashboard() {
  const { data, error } = useLoad('/admin/dashboard');
  const navigate = useNavigate();
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <p className="muted">Loading…</p>;
  const { stats, upcoming, performance, payments } = data;
  const atRisk = upcoming.filter((d) => d.below_minimum || !d.guide_name);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat"><span>Departures ahead</span><b>{stats.upcoming_departures}</b></div>
        <div className="stat"><span>Active bookings</span><b>{stats.active_bookings}</b></div>
        <div className="stat"><span>Waiting for advance</span><b>{stats.pending_bookings}</b></div>
        <div className="stat"><span>Received this month</span><b>{rs(stats.revenue_this_month)}</b></div>
        <div className="stat"><span>Still to collect</span><b>{rs(stats.outstanding_balance)}</b></div>
      </div>

      {atRisk.length > 0 && (
        <Alert kind="warn">
          {atRisk.length} departure{atRisk.length > 1 ? 's' : ''} in the next 30 days need attention: below the minimum group size or no guide assigned.
        </Alert>
      )}

      <div className="two-col">
        <section className="section">
          <h2>Next 30 days</h2>
          {upcoming.length === 0 ? <Empty>No departures in the next 30 days.</Empty> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Trek</th><th>Starts</th><th className="num">Seats</th><th>Guide</th><th className="num">Porters</th><th /></tr></thead>
                <tbody>
                  {upcoming.map((d) => (
                    <tr key={d.departure_id} className="clickable" tabIndex={0}
                        onClick={() => navigate(`/admin/departures/${d.departure_id}`)}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/departures/${d.departure_id}`)}>
                      <td><strong>{d.trek_name}</strong></td>
                      <td>{date(d.start_date)}</td>
                      <td className="num">{d.seats_booked} / {d.max_group_size}</td>
                      <td>{d.guide_name || <span className="chip warn">No guide</span>}</td>
                      <td className="num">{d.porter_count}</td>
                      <td>{d.below_minimum && <span className="chip warn" title={`Minimum ${d.min_group_size}`}>Below minimum</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="section">
          <h2>Latest payments</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id}>
                    <td><Link to={`/admin/bookings/${p.booking_id}`}>{p.full_name}</Link><div className="small muted">{dateTime(p.payment_date)} · {p.method}</div></td>
                    <td className="num">{p.payment_type === 'Refund' ? <span style={{ color: 'var(--danger)' }}>– {rs(p.amount)}</span> : rs(p.amount)}<div className="small muted">{p.payment_type}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="section">
        <h2>Treks by revenue</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trek</th><th>Region</th><th className="num">Departures</th><th className="num">Bookings</th><th className="num">Trekkers</th><th className="num">Net revenue</th></tr></thead>
            <tbody>
              {performance.map((t) => (
                <tr key={t.trek_id}>
                  <td>{t.trek_name}</td><td>{t.region}</td>
                  <td className="num">{t.departures}</td><td className="num">{t.bookings}</td>
                  <td className="num">{t.trekkers}</td><td className="num">{rs(t.net_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

