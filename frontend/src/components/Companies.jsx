import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { formatPhone } from "../utils";
import { EditIcon, DeleteIcon, CloseIcon, EmailIcon, PhoneIcon, AddressIcon, CompanyIcon } from "./Icons";

const EMPTY_FORM = { name: "", email: "", phone: "", address: "", city: "", state: "", zip: "" };

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState("list"); // "list" | "detail"
  const [selected, setSelected] = useState(null);

  async function load() {
    const c = await apiGet("companies");
    setCompanies(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingCompany(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(company) {
    setEditingCompany(company);
    setForm({
      name:    company.name    || "",
      email:   company.email   || "",
      phone:   company.phone   || "",
      address: company.address || "",
      city:    company.city    || "",
      state:   company.state   || "",
      zip:     company.zip     || "",
    });
    setShowForm(true);
  }

  function f(field) {
    return e => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    if (editingCompany) {
      await apiPost("companies/update", { id: editingCompany.id, ...form });
      if (selected?.id === editingCompany.id) setSelected({ ...selected, ...form });
    } else {
      await apiPost("companies/create", form);
    }
    setShowForm(false);
    setEditingCompany(null);
    await load();
    setSaving(false);
  }

  async function handleDelete(company) {
    setSaving(true);
    await apiPost("companies/delete", { id: company.id });
    setConfirmDelete(null);
    if (selected?.id === company.id) { setSelected(null); setView("list"); }
    await load();
    setSaving(false);
  }

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          {view === "detail" && selected ? (
            <span>
              <button className="btn-back" onClick={() => setView("list")}>←</button>
              {selected.name}
            </span>
          ) : "Companies"}
        </h1>
        {view === "list" && (
          <button className="btn-primary" onClick={openNew}>+ Add</button>
        )}
        {view === "detail" && selected && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-icon" onClick={() => openEdit(selected)}><EditIcon /></button>
            <button className="btn-icon" onClick={() => setConfirmDelete(selected)}><DeleteIcon /></button>
          </div>
        )}
      </div>

      {view === "list" && (
        <div className="search-bar">
          <input
            className="search-input full-width"
            placeholder="Search companies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCompany ? "Edit Company" : "New Company"}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSave} className="inline-form">
              <div className="field">
                <label>Company Name</label>
                <input value={form.name} onChange={f("name")} placeholder="e.g. Acme Co." required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={f("email")} placeholder="contact@company.com" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: formatPhone(e.target.value)})} placeholder="555-555-5555" />
              </div>
              <div className="field">
                <label>Street Address</label>
                <input value={form.address} onChange={f("address")} placeholder="123 Main St." />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>City</label>
                  <input value={form.city} onChange={f("city")} placeholder="Indianapolis" />
                </div>
                <div className="field field-sm">
                  <label>State</label>
                  <input value={form.state} onChange={f("state")} placeholder="IN" maxLength={2} />
                </div>
                <div className="field field-sm">
                  <label>ZIP</label>
                  <input value={form.zip} onChange={f("zip")} placeholder="46202" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete Company?</h2>
            <p className="confirm-text">Delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={saving}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company List */}
      {view === "list" && (
        <div className="card no-pad">
          {loading ? <p className="loading pad">Loading…</p> : (
            <ul className="item-list">
              {filtered.map(c => (
                <li key={c.id} className="item-row">
                  <button className="item-btn" onClick={() => { setSelected(c); setView("detail"); }}>
                    <div className="item-main">
                      <span className="item-name">{c.name}</span>
                      <span className="item-sub">{[c.city, c.state].filter(Boolean).join(", ") || c.email || "—"}</span>
                    </div>
                  </button>
                  <div className="item-right">
                    <button className="btn-icon" onClick={() => openEdit(c)}><EditIcon /></button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(c)}><DeleteIcon /></button>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && <li className="empty pad">No companies found.</li>}
            </ul>
          )}
        </div>
      )}

      {/* Company Detail */}
      {view === "detail" && selected && (
        <div className="card company-detail">
          <div className="detail-row">
            <span className="detail-icon"><CompanyIcon /></span>
            <div>
              <div className="detail-label">Company</div>
              <div className="detail-value">{selected.name}</div>
            </div>
          </div>
          {selected.email && (
            <div className="detail-row">
              <span className="detail-icon"><EmailIcon /></span>
              <div>
                <div className="detail-label">Email</div>
                <a className="detail-value detail-link" href={`mailto:${selected.email}`}>{selected.email}</a>
              </div>
            </div>
          )}
          {selected.phone && (
            <div className="detail-row">
              <span className="detail-icon"><PhoneIcon /></span>
              <div>
                <div className="detail-label">Phone</div>
                <a className="detail-value detail-link" href={`tel:${selected.phone}`}>{selected.phone}</a>
              </div>
            </div>
          )}
          {selected.address && (
            <div className="detail-row">
              <span className="detail-icon"><AddressIcon /></span>
              <div>
                <div className="detail-label">Address</div>
                <div className="detail-value">
                  {selected.address}<br />
                  {[selected.city, selected.state, selected.zip].filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
