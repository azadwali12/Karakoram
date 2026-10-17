// Screen: Staff schedule — upcoming work for guides and porters (READ, view v_staff_schedule)
import { Link } from 'react-router-dom';
import { date } from '../../api.js';
import { useLoad, Alert, Empty } from '../../components/ui.jsx';

export default function Schedule() {
  const { data, error } = useLoad('/admin/schedule');
  return (
    <>
      <h1>Staff schedule</h1>
      <p className="muted">Who is working on which trek. The database stops anyone being booked on two treks at the same time.</p>
      <Alert>{error}</Alert>
      {data?.length === 0 && <Empty>No staff assigned to upcoming treks.</Empty>}
      {data?.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Trek</th><th>From</th><th>To</th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={`${s.role}-${s.staff_id}-${s.departure_id}`}>
                  <td>{s.full_name}</td>
                  <td>{s.role}</td>
                  <td><Link to={`/admin/departures/${s.departure_id}`}>{s.trek_name}</Link></td>
                  <td>{date(s.start_date)}</td>
                  <td>{date(s.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
