// Screen: Book a Trek — choose group size and gear (CREATE booking)
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, rs, date } from '../api.js';
import { useLoad, Alert, Field } from '../components/ui.jsx';

export default function Book() {
  const { departureId } = useParams();
  const navigate = useNavigate();
  const { data: dep, error: depError } = useLoad(`/departures/${departureId}`);
  const { data: gear } = useLoad('/equipment');
  const [groupSize, setGroupSize] = useState(1);
  const [qty, setQty] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (depError) return <main className="page"><Alert>{depError}</Alert></main>;
  if (!dep || !gear) return <main className="page muted">Loading…</main>;

  const seatsCost = groupSize * dep.price_per_person;
  const gearCost = gear.reduce((s, g) => s + (qty[g.equipment_id] || 0) * g.rent_price_per_trip, 0);
  const total = seatsCost + gearCost;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const equipment = Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([equipment_id, quantity]) => ({ equipment_id: Number(equipment_id), quantity }));
      const { booking_id } = await api('/my/bookings', {
        method: 'POST',
        body: { departure_id: dep.departure_id, group_size: groupSize, equipment },
      });
      navigate(`/my/bookings/${booking_id}?new=1`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <Link to={`/treks/${dep.trek_id}`} className="small">Back to {dep.trek_name}</Link>
      <h1 style={{ marginTop: 12 }}>Book {dep.trek_name}</h1>
      <p className="muted">{date(dep.start_date)} – {date(dep.end_date)} · {dep.seats_left} seats left</p>

      <form className="detail-grid" onSubmit={submit}>
        <div>
          <div className="panel">
            <h2>Who is coming</h2>
            <Field label="Number of people" hint={`Up to ${Math.min(20, dep.seats_left)} on this date`}>
              <input type="number" min="1" max={Math.min(20, dep.seats_left)} value={groupSize}
                     onChange={(e) => setGroupSize(Math.max(1, Number(e.target.value)))} required />
            </Field>
          </div>

          <div className="panel">
            <h2>Rent gear</h2>
            <p className="muted small">Optional. Gear is handed over at the trailhead and returned after the trek.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th className="num">Per trip</th><th className="num">In stock</th><th className="num">Quantity</th></tr></thead>
                <tbody>
                  {gear.map((g) => (
                    <tr key={g.equipment_id}>
                      <td>{g.item_name}</td>
                      <td className="num">{rs(g.rent_price_per_trip)}</td>
                      <td className="num">{g.quantity_available}</td>
                      <td className="num">
                        <input type="number" min="0" max={g.quantity_available} style={{ width: 72 }}
                               aria-label={`Quantity of ${g.item_name}`}
                               value={qty[g.equipment_id] || 0}
                               onChange={(e) => setQty({ ...qty, [g.equipment_id]: Math.max(0, Number(e.target.value)) })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="panel">
          <h2>Summary</h2>
          <div className="summary-row"><span>{groupSize} × {rs(dep.price_per_person)}</span><span>{rs(seatsCost)}</span></div>
          <div className="summary-row"><span>Gear</span><span>{rs(gearCost)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{rs(total)}</span></div>
          <p className="small muted" style={{ marginTop: 14 }}>
            Your seats are held now. The booking is confirmed once you pay an advance of at least {rs(Math.ceil(total * 0.3))} (30%).
          </p>
          <Alert>{error}</Alert>
          <button className="btn" style={{ width: '100%' }} disabled={saving}>
            {saving ? 'Booking…' : 'Book trek'}
          </button>
        </aside>
      </form>
    </main>
  );
}
