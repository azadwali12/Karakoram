// Screen: Customers — list (READ) and remove (DELETE)
import { api, rs, date } from '../../api.js';
import { useLoad, Alert, useToast } from '../../components/ui.jsx';

export default function Customers() {
  const { data, error, reload } = useLoad('/admin/customers');
  const [toast, showToast] = useToast();

  async function remove(c) {
    if (!window.confirm(`Delete ${c.full_name}'s account?`)) return;
    try { await api(`/admin/customers/${c.customer_id}`, { method: 'DELETE' }); showToast('Customer deleted'); reload(); }
    catch (e) { showToast(e.message); }
  }

  return (
    <>
      <h1>Customers</h1>
      <Alert>{error}</Alert>
      {data && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Contact</th><th>CNIC / passport</th><th>Emergency contact</th><th className="num">Bookings</th><th className="num">Paid</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.customer_id}>
                  <td><strong>{c.full_name}</strong><div className="small muted">{c.nationality}</div></td>
                  <td>{c.email}<div className="small muted">{c.phone}</div></td>
                  <td>{c.cnic_passport}</td>
                  <td>{c.emergency_contact_name}<div className="small muted">{c.emergency_contact_phone}</div></td>
                  <td className="num">{c.bookings}</td>
                  <td className="num">{rs(c.total_paid)}</td>
                  <td>{date(c.created_at)}</td>
                  <td><button className="btn danger small" onClick={() => remove(c)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {toast}
    </>
  );
}
