import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { formatPhone } from "../utils";
import { EditIcon, DeleteIcon, CloseIcon, EmailIcon, PhoneIcon, AddressIcon, CompanyIcon } from "./Icons";
import AddressAutocomplete from "./AddressAutocomplete";

const EMPTY_FORM = { name: "", email: "", phone: "", address: "", city: "", state: "", zip: "" };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState("list"); // "list" | "detail"
  const [selected, setSelected] = useState(null);

  async function load() {
    const c = await apiGet("customers");
    setCustomers(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(customer) {
    setEditingCustomer(customer);
    setForm({
      name:    customer.name    || "",
      email:   customer.email   || "",
      phone:   customer.phone   || "",
      address: customer.address || "",
      city:    customer.city    || "",
      state:   customer.state   || "",
      zip:     customer.zip     || "",
    });
    setShowForm(true);
  }

  function f(field) {
    return e => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    if (editingCustomer) {
      await apiPost("customers/update", { id: editingCustomer.id, ...form });
      if (selected?.id === editingCustomer.id) setSelected({ ...selected, ...form });
    } else {
      await apiPost("customers/create", form);
    }
    setShowForm(false);
    setEditingCustomer(null);
    await load();
    setSaving(false);
  }

  async function handleDelete(customer) {
    setSaving(true);
    await apiPost("customers/delete", { id: customer.id });
    setConfirmDelete(null);
    if (selected?.id === customer.id) { setSelected(null); setView("list"); }
    await load();
    setSaving(false);
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  function f(field) { return e => setForm({ ...form, [field]: e.target.value }); }

  function handlePlaceSelect(place) {
    setForm(prev => ({
      ...prev,
      name:    place.name    || prev.name,
      address: place.address || prev.address,
      city:    place.city    || prev.city,
      state:   place.state   || prev.state,
      zip:     place.zip     || prev.zip,
    }));
    setShowLookup(false);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          {view === "detail" && selected ? (
            <span>
              <button className="btn-back" onClick={() => setView("list")}>←</button>
              {selected.name}
            </span>
          ) : "Customers"}
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
            placeholder="Search customers…"
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
              <h2>{editingCustomer ? "Edit Customer" : "New Customer"}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSave} className="inline-form">
              <div className="field">
                <label>Customer Name</label>
                <input value={form.name} onChange={f("name")} placeholder="e.g. Acme Co." required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={f("email")} placeholder="contact@customer.com" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: formatPhone(e.target.value)})} placeholder="555-555-5555" />
              </div>
              <div className="field">
                <label>Street Address</label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={val => setForm({...form, address: val})}
                  onSelect={place => setForm(prev => ({...prev, address: place.address, city: place.city, state: place.state, zip: place.zip}))}
                  placeholder="Start typing an address…"
                />
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
            <h2>Delete Customer?</h2>
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

      {/* Customer List */}
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
              {filtered.length === 0 && <li className="empty pad">No customers found.</li>}
            </ul>
          )}
        </div>
      )}

      {/* Customer Detail */}
      {view === "detail" && selected && (
        <div className="card customer-detail">
          <div className="detail-row">
            <span className="detail-icon"><CompanyIcon /></span>
            <div>
              <div className="detail-label">Customer</div>
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
