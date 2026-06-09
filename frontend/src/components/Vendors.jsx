import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { formatPhone } from "../utils";
import { EditIcon, DeleteIcon, CloseIcon, EmailIcon, PhoneIcon, AddressIcon, CompanyIcon } from "./Icons";

const EMPTY = { name:"", email:"", phone:"", website:"", address:"", city:"", state:"", zip:"" };

export function WebsiteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);

  async function load() {
    const v = await apiGet("vendors");
    setVendors(Array.isArray(v) ? v : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditingVendor(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(v) { setEditingVendor(v); setForm({ name:v.name||"", email:v.email||"", phone:v.phone||"", website:v.website||"", address:v.address||"", city:v.city||"", state:v.state||"", zip:v.zip||"" }); setShowForm(true); }
  function f(field) { return e => setForm({ ...form, [field]: e.target.value }); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    if (editingVendor) {
      await apiPost("vendors/update", { id: editingVendor.id, ...form });
      if (selected?.id === editingVendor.id) setSelected({ ...selected, ...form });
    } else {
      await apiPost("vendors/create", form);
    }
    setShowForm(false);
    setEditingVendor(null);
    await load();
    setSaving(false);
  }

  async function handleDelete(vendor) {
    setSaving(true);
    await apiPost("vendors/delete", { id: vendor.id });
    setConfirmDelete(null);
    if (selected?.id === vendor.id) { setSelected(null); setView("list"); }
    await load();
    setSaving(false);
  }

  const filtered = vendors.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          {view === "detail" && selected ? (
            <span><button className="btn-back" onClick={() => setView("list")}>←</button>{selected.name}</span>
          ) : "Vendors"}
        </h1>
        {view === "list" && <button className="btn-primary" onClick={openNew}>+ Add</button>}
        {view === "detail" && selected && (
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-icon" onClick={() => openEdit(selected)}><EditIcon /></button>
            <button className="btn-icon" onClick={() => setConfirmDelete(selected)}><DeleteIcon /></button>
          </div>
        )}
      </div>

      {view === "list" && (
        <div className="search-bar">
          <input className="search-input full-width" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVendor ? "Edit Vendor" : "New Vendor"}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSave} className="inline-form">
              <div className="field"><label>Vendor Name</label><input value={form.name} onChange={f("name")} placeholder="e.g. Steel Supply Co." required /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={f("email")} placeholder="orders@vendor.com" /></div>
              <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: formatPhone(e.target.value)})} placeholder="555-555-5555" /></div>
              <div className="field"><label>Website</label><input type="url" value={form.website} onChange={f("website")} placeholder="https://vendor.com" /></div>
              <div className="field"><label>Street Address</label><input value={form.address} onChange={f("address")} placeholder="123 Main St." /></div>
              <div className="field-row">
                <div className="field"><label>City</label><input value={form.city} onChange={f("city")} placeholder="Indianapolis" /></div>
                <div className="field field-sm"><label>State</label><input value={form.state} onChange={f("state")} placeholder="IN" maxLength={2} /></div>
                <div className="field field-sm"><label>ZIP</label><input value={form.zip} onChange={f("zip")} placeholder="46202" /></div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete Vendor?</h2>
            <p className="confirm-text">Delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="card no-pad">
          {loading ? <p className="loading pad">Loading…</p> : (
            <ul className="item-list">
              {filtered.map(v => (
                <li key={v.id} className="item-row">
                  <button className="item-btn" onClick={() => { setSelected(v); setView("detail"); }}>
                    <div className="item-main">
                      <span className="item-name">{v.name}</span>
                      <span className="item-sub">{[v.city, v.state].filter(Boolean).join(", ") || v.email || "—"}</span>
                    </div>
                  </button>
                  <div className="item-right">
                    <button className="btn-icon" onClick={() => openEdit(v)}><EditIcon /></button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(v)}><DeleteIcon /></button>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && <li className="empty pad">No vendors found.</li>}
            </ul>
          )}
        </div>
      )}

      {view === "detail" && selected && (
        <div className="card company-detail">
          <div className="detail-row">
            <span className="detail-icon"><CompanyIcon /></span>
            <div><div className="detail-label">Vendor</div><div className="detail-value">{selected.name}</div></div>
          </div>
          {selected.email && (
            <div className="detail-row">
              <span className="detail-icon"><EmailIcon /></span>
              <div><div className="detail-label">Email</div><a className="detail-value detail-link" href={`mailto:${selected.email}`}>{selected.email}</a></div>
            </div>
          )}
          {selected.phone && (
            <div className="detail-row">
              <span className="detail-icon"><PhoneIcon /></span>
              <div><div className="detail-label">Phone</div><a className="detail-value detail-link" href={`tel:${selected.phone}`}>{selected.phone}</a></div>
            </div>
          )}
          {selected.website && (
            <div className="detail-row">
              <span className="detail-icon"><WebsiteIcon /></span>
              <div><div className="detail-label">Website</div><a className="detail-value detail-link" href={selected.website} target="_blank" rel="noreferrer">{selected.website.replace(/^https?:\/\//, "")}</a></div>
            </div>
          )}
          {selected.address && (
            <div className="detail-row">
              <span className="detail-icon"><AddressIcon /></span>
              <div>
                <div className="detail-label">Address</div>
                <div className="detail-value">{selected.address}<br />{[selected.city, selected.state, selected.zip].filter(Boolean).join(", ")}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
