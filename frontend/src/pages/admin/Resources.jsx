// Screens: Manage Treks, Guides, Porters, Equipment — full CRUD.
// One reusable table + form, configured per entity.
import { useState } from 'react';
import { api, rs } from '../../api.js';
import { useLoad, Alert, Field, Modal, Chip, Empty, useToast } from '../../components/ui.jsx';

function ResourcePage({ title, path, idKey, columns, fields, blank, intro, canEditActive = true }) {
  const { data, error, reload } = useLoad(path);
  const [editing, setEditing] = useState(null);   // null = closed, {} = new, row = edit
  const [toast, showToast] = useToast();

  async function remove(row) {
    if (!window.confirm(`Delete this record? This cannot be undone.`)) return;
    try { await api(`${path}/${row[idKey]}`, { method: 'DELETE' }); showToast('Deleted'); reload(); }
    catch (e) { showToast(e.message); }
  }

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        <button className="btn" onClick={() => setEditing({ ...blank })}>Add {title.toLowerCase().replace(/s$/, '')}</button>
      </div>
      {intro && <p className="muted">{intro}</p>}
      <Alert>{error}</Alert>
      {data?.length === 0 && <Empty>Nothing here yet.</Empty>}
      {data?.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{columns.map((c) => <th key={c.label} className={c.num ? 'num' : ''}>{c.label}</th>)}<th /></tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row[idKey]}>
                  {columns.map((c) => (
                    <td key={c.label} className={c.num ? 'num' : ''}>{c.render ? c.render(row) : row[c.key]}</td>
                  ))}
                  <td className="num">
                    <div className="btn-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <button className="btn secondary small" onClick={() => setEditing(row)}>Edit</button>
                      <button className="btn danger small" onClick={() => remove(row)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <EditForm
          title={editing[idKey] ? `Edit ${title.toLowerCase().replace(/s$/, '')}` : `Add ${title.toLowerCase().replace(/s$/, '')}`}
          row={editing} fields={fields} canEditActive={canEditActive && !!editing[idKey]}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            const isNew = !editing[idKey];
            await api(isNew ? path : `${path}/${editing[idKey]}`, { method: isNew ? 'POST' : 'PUT', body: values });
            setEditing(null);
            showToast(isNew ? 'Added' : 'Changes saved');
            reload();
          }}
        />
      )}
      {toast}
    </>
  );
}

function EditForm({ title, row, fields, canEditActive, onClose, onSave }) {
  const [values, setValues] = useState(row);
  const [error, setError] = useState('');
  const set = (k, type) => (e) =>
    setValues({ ...values, [k]: type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try { await onSave(values); } catch (err) { setError(err.message); }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <div className="form-grid">
          {fields.map((f) => (
            f.type === 'checkbox' ? (
              <div key={f.key} className="field checkbox full">
                <input id={`f-${f.key}`} type="checkbox" checked={!!values[f.key]} onChange={set(f.key, 'checkbox')} />
                <label htmlFor={`f-${f.key}`}>{f.label}</label>
              </div>
            ) : (
              <Field key={f.key} label={f.label} hint={f.hint} className={f.full ? 'full' : ''}>
                {f.type === 'select' ? (
                  <select value={values[f.key] ?? ''} onChange={set(f.key)} required>
                    <option value="" disabled>Choose…</option>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea value={values[f.key] ?? ''} onChange={set(f.key)} />
                ) : (
                  <input type={f.type || 'text'} value={values[f.key] ?? ''} onChange={set(f.key)}
                         required={f.required !== false} min={f.min} step={f.step} />
                )}
              </Field>
            )
          ))}
          {canEditActive && (
            <div className="field checkbox full">
              <input id="f-active" type="checkbox" checked={values.is_active !== false}
                     onChange={(e) => setValues({ ...values, is_active: e.target.checked })} />
              <label htmlFor="f-active">Active (untick to stop using it without deleting history)</label>
            </div>
          )}
        </div>
        <div className="btn-row"><button className="btn">Save</button><button type="button" className="btn secondary" onClick={onClose}>Close</button></div>
      </form>
    </Modal>
  );
}

const activeCol = { label: 'Status', render: (r) => (r.is_active ? 'Active' : <span className="muted">Inactive</span>) };

export function TreksAdmin() {
  return (
    <ResourcePage
      title="Treks" path="/admin/treks" idKey="trek_id"
      intro="Routes the company offers. A trek with departures cannot be deleted; mark it inactive to hide it from customers."
      blank={{ difficulty: 'Moderate', permit_required: false }}
      columns={[
        { label: 'Trek', render: (r) => <strong>{r.trek_name}</strong> },
        { label: 'Region', key: 'region' },
        { label: 'Difficulty', render: (r) => <Chip value={r.difficulty} /> },
        { label: 'Altitude', num: true, render: (r) => `${r.max_altitude_m.toLocaleString()} m` },
        { label: 'Days', num: true, key: 'duration_days' },
        { label: 'Base price', num: true, render: (r) => rs(r.base_price) },
        { label: 'Departures', num: true, key: 'departure_count' },
        activeCol,
      ]}
      fields={[
        { key: 'trek_name', label: 'Trek name', full: true },
        { key: 'region', label: 'Region' },
        { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Moderate', 'Hard', 'Extreme'] },
        { key: 'max_altitude_m', label: 'Highest point (m)', type: 'number', min: 500 },
        { key: 'duration_days', label: 'Length (days)', type: 'number', min: 1 },
        { key: 'base_price', label: 'Base price per person (Rs)', type: 'number', min: 1 },
        { key: 'permit_required', label: 'Permit required (restricted zone)', type: 'checkbox' },
        { key: 'description', label: 'Description', type: 'textarea', full: true },
      ]}
    />
  );
}

export function GuidesAdmin() {
  return (
    <ResourcePage
      title="Guides" path="/admin/guides" idKey="guide_id"
      blank={{ languages: 'Urdu, English', experience_years: 0 }}
      columns={[
        { label: 'Name', render: (r) => <strong>{r.full_name}</strong> },
        { label: 'Phone', key: 'phone' },
        { label: 'Languages', key: 'languages' },
        { label: 'Experience', num: true, render: (r) => `${r.experience_years} yrs` },
        { label: 'Daily rate', num: true, render: (r) => rs(r.daily_rate) },
        { label: 'Upcoming', num: true, key: 'upcoming_treks' },
        activeCol,
      ]}
      fields={[
        { key: 'full_name', label: 'Full name', full: true },
        { key: 'phone', label: 'Phone' },
        { key: 'cnic', label: 'CNIC' },
        { key: 'experience_years', label: 'Years of experience', type: 'number', min: 0 },
        { key: 'daily_rate', label: 'Daily rate (Rs)', type: 'number', min: 1 },
        { key: 'languages', label: 'Languages', full: true },
      ]}
    />
  );
}

export function PortersAdmin() {
  return (
    <ResourcePage
      title="Porters" path="/admin/porters" idKey="porter_id"
      blank={{ max_load_kg: 25 }}
      columns={[
        { label: 'Name', render: (r) => <strong>{r.full_name}</strong> },
        { label: 'Phone', key: 'phone' },
        { label: 'Max load', num: true, render: (r) => `${r.max_load_kg} kg` },
        { label: 'Daily rate', num: true, render: (r) => rs(r.daily_rate) },
        { label: 'Upcoming', num: true, key: 'upcoming_treks' },
        activeCol,
      ]}
      fields={[
        { key: 'full_name', label: 'Full name', full: true },
        { key: 'phone', label: 'Phone' },
        { key: 'max_load_kg', label: 'Max load (kg)', type: 'number', min: 10, hint: 'Between 10 and 40 kg' },
        { key: 'daily_rate', label: 'Daily rate (Rs)', type: 'number', min: 1 },
      ]}
    />
  );
}

export function EquipmentAdmin() {
  return (
    <ResourcePage
      title="Equipment" path="/admin/equipment" idKey="equipment_id" canEditActive={false}
      intro="Gear for rent. Stock goes down automatically when a customer rents it and comes back when the trek is completed or cancelled."
      blank={{}}
      columns={[
        { label: 'Item', render: (r) => <strong>{r.item_name}</strong> },
        { label: 'Price per trip', num: true, render: (r) => rs(r.rent_price_per_trip) },
        { label: 'Total', num: true, key: 'quantity_total' },
        { label: 'Rented out', num: true, key: 'rented_out' },
        { label: 'Available', num: true, key: 'quantity_available' },
      ]}
      fields={[
        { key: 'item_name', label: 'Item name', full: true },
        { key: 'rent_price_per_trip', label: 'Rent per trip (Rs)', type: 'number', min: 0 },
        { key: 'quantity_total', label: 'Total units owned', type: 'number', min: 0 },
      ]}
    />
  );
}
