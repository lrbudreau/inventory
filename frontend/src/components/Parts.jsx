import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { EditIcon, DeleteIcon, CloseIcon } from "./Icons";

export default function Parts({ readOnly = false }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [form, setForm] = useState({ name:"", barcode:"", quantity:0, min:0 });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    const p = await apiGet("parts");
    setParts(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startAdd() { setEditingPart(null); setForm({ name:"", barcode:"", quantity:0, min:0 }); setShowForm(true); }
  function startEdit(part) { setEditingPart(part); setForm({ name:part.name, barcode:part.barcode||"", quantity:part.quantity, min:part.min||0 }); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditingPart(null); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    if (editingPart) {
      await apiPost("parts/update", { id: editingPart.id, ...form });
    } else {
      await apiPost("parts/create", form);
    }
    setShowForm(false);
    setEditingPart(null);
    await load();
    setSaving(false);
  }

  async function handleDelete(part) {
    setSaving(true);
    await apiPost("parts/delete", { id: part.id });
    setConfirmDelete(null);
    await load();
    setSaving(false);
  }

  function stockStatus(p) {
    if (p.quantity === 0) return "danger";
    if (p.min > 0 && p.quantity <= p.min) return "warn";
    return "ok";
  }

  function stockLabel(p) {
    if (p.quantity === 0) return "Out of Stock";
    if (p.min > 0 && p.quantity <= p.min) return "Low Stock";
    return "In Stock";
  }

  const filtered = parts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  // Sort: low/out stock first
  const sorted = [...filtered].sort((a, b) => {
    const order = { danger: 0, warn: 1, ok: 2 };
    return order[stockStatus(a)] - order[stockStatus(b)];
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Parts</h1>
        {!readOnly && <button className="btn-primary" onClick={startAdd}>+ Add</button>}
      </div>

      <div className="search-bar">
        <input className="search-input full-width" placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={cancelForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPart ? "Edit Part" : "New Part"}</h2>
              <button className="modal-close" onClick={cancelForm}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSave} className="inline-form">
              <div className="field">
                <label>Part Name</label>
                <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Steel Bracket" required />
              </div>
              <div className="field">
                <label>Barcode (optional)</label>
                <input value={form.barcode} onChange={e => setForm({...form,barcode:e.target.value})} placeholder="e.g. 123456789" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Quantity</label>
                  <input type="number" min="0" value={form.quantity} onChange={e => setForm({...form,quantity:Number(e.target.value)})} />
                </div>
                <div className="field">
                  <label>Min Stock</label>
                  <input type="number" min="0" value={form.min} onChange={e => setForm({...form,min:Number(e.target.value)})} placeholder="0 = no alert" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={cancelForm}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete Part?</h2>
            <p className="confirm-text">Delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card no-pad">
        {loading ? <p className="loading pad">Loading parts…</p> : (
          <ul className="item-list">
            {sorted.map(p => (
              <li key={p.id} className={`item-row ${stockStatus(p) !== "ok" ? "item-row-alert" : ""}`}>
                <div className="item-main">
                  <span className="item-name">{p.name}</span>
                  <span className="item-sub">
                    {p.barcode ? `${p.barcode} · ` : ""}
                    {p.min > 0 ? `Min: ${p.min}` : "No min set"}
                  </span>
                </div>
                <div className="item-right">
                  <div className="stock-info">
                    <span className={`qty-badge ${stockStatus(p)}`}>{p.quantity}</span>
                    <span className={`stock-label ${stockStatus(p)}`}>{stockLabel(p)}</span>
                  </div>
                  {!readOnly && <>
                    <button className="btn-icon" onClick={() => startEdit(p)}><EditIcon /></button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(p)}><DeleteIcon /></button>
                  </>}
                </div>
              </li>
            ))}
            {sorted.length === 0 && <li className="empty pad">No parts found.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
