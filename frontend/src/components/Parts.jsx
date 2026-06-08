import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";

export default function Parts() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", barcode: "", quantity: 0 });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    const p = await apiGet("parts");
    setParts(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    await apiPost({ resource: "parts", data: form });
    setForm({ name: "", barcode: "", quantity: 0 });
    setShowForm(false);
    await load();
    setSaving(false);
  }

  const filtered = parts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Parts Inventory</h1>
        <div className="header-actions">
          <input
            className="search-input"
            placeholder="Search parts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Part"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card form-card">
          <h2>New Part</h2>
          <form onSubmit={handleAdd} className="inline-form">
            <div className="field">
              <label>Part Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Steel Bracket"
                required
              />
            </div>
            <div className="field">
              <label>Barcode (optional)</label>
              <input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="e.g. 123456789"
              />
            </div>
            <div className="field">
              <label>Initial Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Part"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p className="loading">Loading parts…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Part Name</th>
                <th>Barcode</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="muted">{p.id}</td>
                  <td><strong>{p.name}</strong></td>
                  <td className="muted">{p.barcode || "—"}</td>
                  <td>{p.quantity}</td>
                  <td>
                    {p.quantity === 0 ? (
                      <span className="badge badge-danger">Out of Stock</span>
                    ) : p.quantity < 20 ? (
                      <span className="badge badge-warn">Low Stock</span>
                    ) : (
                      <span className="badge badge-ok">In Stock</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="empty">No parts found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
