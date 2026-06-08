import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { DeleteIcon, CloseIcon } from "./Icons";

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterPart, setFilterPart] = useState("");
  const [form, setForm] = useState({
    partID: "", quantity: 1, vendorID: "",
    date: new Date().toISOString().split("T")[0], notes: ""
  });

  async function load() {
    const [pu, p, v] = await Promise.all([apiGet("purchases"), apiGet("parts"), apiGet("vendors")]);
    setPurchases(Array.isArray(pu) ? pu : []);
    setParts(Array.isArray(p) ? p : []);
    setVendors(Array.isArray(v) ? v : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function getPartName(id) { const p = parts.find(p => p.id == id); return p ? p.name : `Part #${id}`; }
  function getVendorName(id) { const v = vendors.find(v => v.id == id); return v ? v.name : id || "—"; }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await apiPost("purchases/create", form);
    setShowForm(false);
    setForm({ partID:"", quantity:1, vendorID:"", date:new Date().toISOString().split("T")[0], notes:"" });
    await load();
    setSaving(false);
  }

  async function handleDelete(purchase) {
    setSaving(true);
    await apiPost("purchases/delete", { id: purchase.id });
    setConfirmDelete(null);
    await load();
    setSaving(false);
  }

  const filtered = purchases.filter(p => !filterPart || p.partID == filterPart);
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Summary: total restocked per part
  const summary = parts.map(p => {
    const total = purchases.filter(pu => pu.partID == p.id).reduce((s, pu) => s + pu.quantity, 0);
    return { ...p, totalPurchased: total };
  }).filter(p => p.totalPurchased > 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Purchases</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Restock</button>
      </div>

      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="purchase-summary">
          {summary.map(p => (
            <div key={p.id} className="summary-chip">
              <span className="summary-name">{p.name}</span>
              <span className="summary-total">{p.totalPurchased} total restocked</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="search-bar">
        <select className="search-input full-width" value={filterPart} onChange={e => setFilterPart(e.target.value)}>
          <option value="">All parts</option>
          {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* New Purchase Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Log Restock</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSave} className="inline-form">
              <div className="field">
                <label>Part</label>
                <select value={form.partID} onChange={e => setForm({...form, partID:e.target.value})} required>
                  <option value="">Select a part…</option>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.name} (current: {p.quantity})</option>)}
                </select>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Quantity Received</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity:Number(e.target.value)})} required />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} required />
                </div>
              </div>
              <div className="field">
                <label>Vendor (optional)</label>
                <select value={form.vendorID} onChange={e => setForm({...form, vendorID:e.target.value})}>
                  <option value="">Select a vendor…</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="e.g. Invoice #1234" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Log Restock"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete Purchase?</h2>
            <p className="confirm-text">This will remove the record but <strong>will not</strong> adjust the current stock quantity.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History */}
      <div className="card no-pad">
        {loading ? <p className="loading pad">Loading…</p> : (
          <ul className="item-list">
            {sorted.map(pu => (
              <li key={pu.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">{getPartName(pu.partID)}</span>
                  <span className="item-sub">
                    {pu.date}
                    {pu.vendorID ? ` · ${getVendorName(pu.vendorID)}` : ""}
                    {pu.notes ? ` · ${pu.notes}` : ""}
                  </span>
                </div>
                <div className="item-right">
                  <span className="qty-badge ok">+{pu.quantity}</span>
                  <button className="btn-icon" onClick={() => setConfirmDelete(pu)}><DeleteIcon /></button>
                </div>
              </li>
            ))}
            {sorted.length === 0 && <li className="empty pad">No purchase history{filterPart ? " for this part" : ""}.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
