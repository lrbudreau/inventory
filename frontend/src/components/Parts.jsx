import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { EditIcon, DeleteIcon, CloseIcon } from "./Icons";
import { showToast } from "./Toast";

export default function Parts({ readOnly = false }) {
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | quantity | status
  const [filterStatus, setFilterStatus] = useState("all"); // all | low | out
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [form, setForm] = useState({ name:"", barcode:"", quantity:0, min:0, vendorID:"", cost:0 });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [scanMode, setScanMode] = useState(false);
  const searchRef = useRef(null);

  async function load() {
    const [p, v] = await Promise.all([apiGet("parts"), apiGet("vendors")]);
    setParts(Array.isArray(p) ? p : []);
    setVendors(Array.isArray(v) ? v : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (scanMode && searchRef.current) searchRef.current.focus(); }, [scanMode]);

  function startAdd() { setEditingPart(null); setForm({ name:"", barcode:"", quantity:0, min:0, vendorID:"", cost:0 }); setDirty(false); setShowForm(true); }
  function startEdit(part) { setEditingPart(part); setForm({ name:part.name, barcode:part.barcode||"", quantity:part.quantity, min:part.min||0, vendorID:part.vendorID||"", cost:part.cost||0 }); setDirty(false); setShowForm(true); }

  function handleClose() {
    if (dirty) {
      if (!window.confirm("You have unsaved changes. Discard them?")) return;
    }
    setShowForm(false);
    setEditingPart(null);
    setDirty(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    if (editingPart) {
      await apiPost("parts/update", { id: editingPart.id, ...form });
      showToast("Part updated!");
    } else {
      await apiPost("parts/create", form);
      showToast("Part created!");
    }
    setShowForm(false);
    setEditingPart(null);
    setDirty(false);
    await load();
    setSaving(false);
  }

  async function handleDelete(part) {
    setSaving(true);
    await apiPost("parts/delete", { id: part.id });
    setConfirmDelete(null);
    showToast("Part deleted.", "warn");
    await load();
    setSaving(false);
  }

  function getVendorName(id) { const v = vendors.find(v => v.id == id); return v ? v.name : null; }

  function stockStatus(p) {
    if (p.quantity === 0) return "danger";
    if (p.min > 0 && p.quantity <= p.min) return "warn";
    return "ok";
  }

  function stockLabel(p) {
    if (p.quantity === 0) return "Out";
    if (p.min > 0 && p.quantity <= p.min) return "Low";
    return "OK";
  }

  function stockOrder(p) { return { danger:0, warn:1, ok:2 }[stockStatus(p)]; }

  const filtered = parts
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
      const matchStatus = filterStatus === "all" || (filterStatus === "low" && stockStatus(p) === "warn") || (filterStatus === "out" && stockStatus(p) === "danger");
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "quantity") return a.quantity - b.quantity;
      if (sortBy === "status") return stockOrder(a) - stockOrder(b);
      return 0;
    });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Parts</h1>
        <div style={{display:"flex", gap:8}}>
          <button className={`btn-scan ${scanMode ? "active" : ""}`} onClick={() => { setScanMode(!scanMode); setSearch(""); }} title="Barcode scan mode">▣ Scan</button>
          {!readOnly && <button className="btn-primary" onClick={startAdd}>+ Add</button>}
        </div>
      </div>

      {/* Search + Sort + Filter row */}
      <div className="list-controls">
        <input ref={searchRef} className={`search-input ${scanMode ? "scan-active" : ""}`} placeholder={scanMode ? "Scan barcode…" : "Search parts…"} value={search} onChange={e => setSearch(e.target.value)} style={{flex:1}} />
        <select className="control-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">A–Z</option>
          <option value="quantity">Qty</option>
          <option value="status">Status</option>
        </select>
        <select className="control-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="low">Low</option>
          <option value="out">Out</option>
        </select>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPart ? "Edit Part" : "New Part"}</h2>
              <button className="modal-close" onClick={handleClose}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSave} className="inline-form">
              <div className="field"><label>Part Name</label><input value={form.name} onChange={e => { setForm({...form,name:e.target.value}); setDirty(true); }} placeholder="e.g. Steel Bracket" required /></div>
              <div className="field"><label>Barcode (optional)</label><input value={form.barcode} onChange={e => { setForm({...form,barcode:e.target.value}); setDirty(true); }} placeholder="e.g. 123456789" /></div>
              <div className="field-row">
                <div className="field"><label>Quantity</label><input type="number" min="0" value={form.quantity} onChange={e => { setForm({...form,quantity:Number(e.target.value)}); setDirty(true); }} /></div>
                <div className="field"><label>Min Stock</label><input type="number" min="0" value={form.min} onChange={e => { setForm({...form,min:Number(e.target.value)}); setDirty(true); }} placeholder="0 = no alert" /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Cost per unit ($)</label><input type="number" min="0" step="0.01" value={form.cost} onChange={e => { setForm({...form,cost:Number(e.target.value)}); setDirty(true); }} placeholder="0.00" /></div>
              </div>
              <div className="field">
                <label>Vendor</label>
                <select value={form.vendorID} onChange={e => { setForm({...form,vendorID:e.target.value}); setDirty(true); }}>
                  <option value="">No vendor assigned</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
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
        {loading ? <p className="loading pad">Loading parts…</p> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⬡</div>
            <div className="empty-state-text">{search || filterStatus !== "all" ? "No parts match your search" : "No parts yet"}</div>
            {!readOnly && !search && filterStatus === "all" && <div className="empty-state-hint">Tap + Add to create your first part</div>}
          </div>
        ) : (
          <ul className="item-list">
            {filtered.map(p => (
              <li key={p.id} className={`item-row ${stockStatus(p) !== "ok" ? "item-row-alert" : ""}`}>
                <div className="item-main">
                  <span className="item-name">{p.name}</span>
                  <span className="item-sub">
                    {p.cost > 0 ? `$${p.cost.toFixed(2)}/unit · ` : ""}
                    {getVendorName(p.vendorID) ? `${getVendorName(p.vendorID)} · ` : ""}
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
          </ul>
        )}
      </div>
    </div>
  );
}
