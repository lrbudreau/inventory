import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { DeleteIcon, CloseIcon } from "./Icons";

export default function Purchases({ currentUser }) {
  const [purchases, setPurchases] = useState([]);
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterPart, setFilterPart] = useState("");
  const [form, setForm] = useState({ partID:"", quantity:1, vendorID:"", date:new Date().toISOString().split("T")[0], notes:"", cost:0 });

  async function load() {
    const [pu, p, v] = await Promise.all([apiGet("purchases"), apiGet("parts"), apiGet("vendors")]);
    setPurchases(Array.isArray(pu) ? pu : []);
    setParts(Array.isArray(p) ? p : []);
    setVendors(Array.isArray(v) ? v : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Auto-fill vendor when part is selected
  function handlePartChange(partID) {
    const part = parts.find(p => p.id == partID);
    setForm({ ...form, partID, vendorID: part?.vendorID || "", cost: part?.cost || 0 });
  }

  function getPartName(id) { const p = parts.find(p => p.id == id); return p ? p.name : `Part #${id}`; }
  function getVendorName(id) { const v = vendors.find(v => v.id == id); return v ? v.name : "—"; }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await apiPost("purchases/create", { ...form, userID: currentUser?.id, username: currentUser?.username });
    setShowForm(false);
    setForm({ partID:"", quantity:1, vendorID:"", date:new Date().toISOString().split("T")[0], notes:"", cost:0 });
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

  // Total cost summary
  const totalCost = filtered.reduce((s, p) => s + (p.cost * p.quantity || 0), 0);

  // Summary per part
  const summary = parts.map(p => {
    const partPurchases = purchases.filter(pu => pu.partID == p.id);
    const total = partPurchases.reduce((s, pu) => s + pu.quantity, 0);
    const cost = partPurchases.reduce((s, pu) => s + (pu.cost * pu.quantity || 0), 0);
    return { ...p, totalPurchased: total, totalCost: cost };
  }).filter(p => p.totalPurchased > 0).sort((a, b) => b.totalPurchased - a.totalPurchased);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Purchases</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Restock</button>
      </div>

      {summary.length > 0 && (
        <div className="purchase-summary">
          {summary.map(p => (
            <div key={p.id} className="summary-chip">
              <span className="summary-name">{p.name}</span>
              <span className="summary-total">{p.totalPurchased} units · ${p.totalCost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"flex", gap:12, marginBottom:14, alignItems:"center"}}>
        <select className="search-input" style={{flex:1}} value={filterPart} onChange={e => setFilterPart(e.target.value)}>
          <option value="">All parts</option>
          {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {filterPart && <span className="meta-value" style={{whiteSpace:"nowrap"}}>Total: ${totalCost.toFixed(2)}</span>}
      </div>

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
                <select value={form.partID} onChange={e => handlePartChange(e.target.value)} required>
                  <option value="">Select a part…</option>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.quantity})</option>)}
                </select>
              </div>
              <div className="field-row">
                <div className="field"><label>Qty Received</label><input type="number" min="1" value={form.quantity} onChange={e => setForm({...form,quantity:Number(e.target.value)})} required /></div>
                <div className="field"><label>Cost per unit ($)</label><input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm({...form,cost:Number(e.target.value)})} /></div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} required />
                </div>
              </div>
              <div className="field">
                <label>Vendor</label>
                <select value={form.vendorID} onChange={e => setForm({...form,vendorID:e.target.value})}>
                  <option value="">Select a vendor…</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Notes (optional)</label><input value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="e.g. Invoice #1234" /></div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Log Restock"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete Purchase?</h2>
            <p className="confirm-text">This removes the record but <strong>will not</strong> adjust current stock.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

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
                    {pu.cost > 0 ? ` · $${(pu.cost * pu.quantity).toFixed(2)}` : ""}
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
