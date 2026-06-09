import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { DeleteIcon, CloseIcon } from "./Icons";
import { showToast } from "./Toast";

export default function Purchases({ currentUser }) {
  const [purchases, setPurchases] = useState([]);
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delivering, setDelivering] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    partID: "", quantity: 1, vendorID: "",
    date: new Date().toISOString().split("T")[0], notes: "", cost: 0
  });

  async function load() {
    const [pu, p, v] = await Promise.all([apiGet("purchases"), apiGet("parts"), apiGet("vendors")]);
    setPurchases(Array.isArray(pu) ? pu : []);
    setParts(Array.isArray(p) ? p : []);
    setVendors(Array.isArray(v) ? v : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
    setForm({ partID: "", quantity: 1, vendorID: "", date: new Date().toISOString().split("T")[0], notes: "", cost: 0 });
    showToast("Purchase order logged!");
    await load();
    setSaving(false);
  }

  async function handleDeliver(purchase) {
    setDelivering(purchase.id);
    const res = await apiPost("purchases/deliver", { id: purchase.id });
    if (res.success) {
      showToast(`✓ ${getPartName(purchase.partID)} marked as delivered — stock updated!`);
      await load();
    } else {
      showToast(res.error || "Failed to mark as delivered.", "fail");
    }
    setDelivering(null);
  }

  async function handleDelete(purchase) {
    setSaving(true);
    await apiPost("purchases/delete", { id: purchase.id });
    setConfirmDelete(null);
    showToast("Purchase deleted.", "warn");
    await load();
    setSaving(false);
  }

  const filtered = purchases
    .filter(p => filterStatus === "all" || p.status === filterStatus)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const orderedCount = purchases.filter(p => p.status === "Ordered").length;
  const totalCost = filtered.reduce((s, p) => s + (p.cost * p.quantity || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          Purchases
          {orderedCount > 0 && <span className="pending-count">{orderedCount}</span>}
        </h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Order</button>
      </div>

      {/* Filter tabs */}
      <div className="status-tabs">
        {[["all","All"],["Ordered","Ordered"],["Delivered","Delivered"]].map(([val, label]) => (
          <button
            key={val}
            className={`status-tab ${filterStatus === val ? "active" : ""}`}
            onClick={() => setFilterStatus(val)}
          >
            {label}
            {val === "Ordered" && orderedCount > 0 && <span className="tab-count">{orderedCount}</span>}
          </button>
        ))}
        {filtered.length > 0 && totalCost > 0 && (
          <span className="tab-total">${totalCost.toFixed(2)}</span>
        )}
      </div>

      {/* New Purchase Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Purchase Order</h2>
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
                <div className="field"><label>Qty Ordered</label><input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} required /></div>
                <div className="field"><label>Cost/unit ($)</label><input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: Number(e.target.value)})} /></div>
              </div>
              <div className="field"><label>Order Date</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
              <div className="field">
                <label>Vendor</label>
                <select value={form.vendorID} onChange={e => setForm({...form, vendorID: e.target.value})}>
                  <option value="">Select a vendor…</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Notes (optional)</label><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="e.g. Invoice #1234" /></div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Log Order"}</button>
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
            <p className="confirm-text">
              {confirmDelete.status === "Delivered"
                ? "This order was already delivered. Deleting it will NOT adjust stock."
                : "Delete this purchase order?"}
            </p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card no-pad">
        {loading ? <p className="loading pad">Loading…</p> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">↑</div>
            <div className="empty-state-text">{filterStatus !== "all" ? `No ${filterStatus} orders` : "No purchases yet"}</div>
            {filterStatus === "all" && <div className="empty-state-hint">Tap + Order to log a new purchase</div>}
          </div>
        ) : (
          <ul className="item-list">
            {filtered.map(pu => (
              <li key={pu.id} className={`item-row ${pu.status === "Ordered" ? "item-row-ordered" : ""}`}>
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
                  <span className={`qty-badge ${pu.status === "Delivered" ? "ok" : "warn"}`}>
                    {pu.status === "Delivered" ? `+${pu.quantity}` : `${pu.quantity} ordered`}
                  </span>
                  {pu.status === "Ordered" && (
                    <button
                      className="btn-deliver"
                      onClick={() => handleDeliver(pu)}
                      disabled={delivering === pu.id}
                      title="Mark as delivered"
                    >
                      {delivering === pu.id ? "…" : "✓ Delivered"}
                    </button>
                  )}
                  <button className="btn-icon" onClick={() => setConfirmDelete(pu)}><DeleteIcon /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
