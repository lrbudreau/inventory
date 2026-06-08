import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";

export default function Build() {
  const [products, setProducts] = useState([]);
  const [parts, setParts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [productParts, setProductParts] = useState([]);
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: "", lines: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState("list"); // "list" | "build"

  async function load() {
    const [pr, p] = await Promise.all([apiGet("products"), apiGet("parts")]);
    setProducts(Array.isArray(pr) ? pr : []);
    setParts(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function selectProduct(product) {
    setSelected(product);
    setResult(null);
    setCount(1);
    const pp = await apiGet("productParts", { id: product.id });
    setProductParts(Array.isArray(pp) ? pp : []);
    setView("build");
  }

  function getPartName(partId) {
    const p = parts.find(p => p.id == partId);
    return p ? p.name : `Part #${partId}`;
  }

  function getPartQty(partId) {
    const p = parts.find(p => p.id == partId);
    return p ? p.quantity : 0;
  }

  function canBuild() {
    return productParts.length > 0 && productParts.every(pp => getPartQty(pp.partID) >= pp.quantity * count);
  }

  async function handleBuild() {
    if (!canBuild()) return;
    setBuilding(true);
    setResult(null);
    const res = await apiPost({ resource: "build", data: { productId: selected.id, count } });
    if (res.success) {
      setResult({ ok: true, message: `Built ${count}x ${selected.name}!` });
      await load();
      const pp = await apiGet("productParts", { id: selected.id });
      setProductParts(Array.isArray(pp) ? pp : []);
    } else {
      setResult({ ok: false, message: "Build failed. Check inventory." });
    }
    setBuilding(false);
  }

  function startEdit(product) {
    setEditingProduct(product);
    setNewProduct({ name: product.name, lines: "" });
    setShowNewProduct(true);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    setSaving(true);
    if (editingProduct) {
      await apiPost({ resource: "products/update", data: { id: editingProduct.id, name: newProduct.name } });
    } else {
      const productRes = await apiPost({ resource: "products", data: { name: newProduct.name } });
      const newId = productRes.id;
      const lines = newProduct.lines.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        const [partID, qty] = line.split(":").map(s => s.trim());
        await apiPost({ resource: "productParts", data: { productID: newId, partID, quantity: Number(qty) } });
      }
    }
    setShowNewProduct(false);
    setEditingProduct(null);
    setNewProduct({ name: "", lines: "" });
    await load();
    setSaving(false);
  }

  async function handleDeleteProduct(product) {
    setSaving(true);
    await apiPost({ resource: "products/delete", data: { id: product.id } });
    setConfirmDelete(null);
    if (selected?.id === product.id) { setSelected(null); setView("list"); }
    await load();
    setSaving(false);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          {view === "build" && selected ? (
            <span>
              <button className="btn-back" onClick={() => setView("list")}>←</button>
              {selected.name}
            </span>
          ) : "Products"}
        </h1>
        {view === "list" && (
          <button className="btn-primary" onClick={() => { setEditingProduct(null); setNewProduct({ name: "", lines: "" }); setShowNewProduct(true); }}>+ Add</button>
        )}
      </div>

      {showNewProduct && (
        <div className="modal-overlay" onClick={() => setShowNewProduct(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? "Edit Product" : "New Product"}</h2>
              <button className="modal-close" onClick={() => setShowNewProduct(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveProduct} className="inline-form">
              <div className="field">
                <label>Product Name</label>
                <input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Steel Chair" required />
              </div>
              {!editingProduct && (
                <div className="field">
                  <label>Parts (partID:quantity per line)</label>
                  <textarea value={newProduct.lines} onChange={e => setNewProduct({ ...newProduct, lines: e.target.value })} placeholder={"1:4\n2:8\n3:1"} rows={4} />
                  <small className="hint">Example: <code>1:4</code> = 4x of Part #1</small>
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowNewProduct(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete Product?</h2>
            <p className="confirm-text">Delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDeleteProduct(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="card no-pad">
          {loading ? <p className="loading pad">Loading…</p> : (
            <ul className="item-list">
              {products.map(p => (
                <li key={p.id} className="item-row" onClick={() => selectProduct(p)}>
                  <div className="item-main">
                    <span className="item-name">{p.name}</span>
                    <span className="item-sub">Tap to build →</span>
                  </div>
                  <div className="item-right" onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => startEdit(p)}>✏️</button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(p)}>🗑️</button>
                  </div>
                </li>
              ))}
              {products.length === 0 && <li className="empty pad">No products yet.</li>}
            </ul>
          )}
        </div>
      )}

      {view === "build" && selected && (
        <div>
          <div className="card no-pad">
            <ul className="item-list">
              {productParts.map(pp => {
                const need = pp.quantity * count;
                const have = getPartQty(pp.partID);
                const ok = have >= need;
                return (
                  <li key={pp.partID} className="item-row">
                    <div className="item-main">
                      <span className="item-name">{getPartName(pp.partID)}</span>
                      <span className="item-sub">Need {need} · Have {have}</span>
                    </div>
                    <div className="item-right">
                      <span className={`qty-badge ${ok ? "ok" : "danger"}`}>{ok ? "✓" : `Short ${need - have}`}</span>
                    </div>
                  </li>
                );
              })}
              {productParts.length === 0 && <li className="empty pad">No parts defined.</li>}
            </ul>
          </div>

          <div className="build-footer">
            <div className="field qty-field">
              <label>Quantity</label>
              <input type="number" min="1" value={count} onChange={e => setCount(Number(e.target.value))} />
            </div>
            <button
              className={`btn-build-mobile ${!canBuild() ? "disabled" : ""}`}
              onClick={handleBuild}
              disabled={building || !canBuild()}
            >
              {building ? "Building…" : `Build ${count}x`}
            </button>
          </div>

          {result && (
            <div className={`result-msg ${result.ok ? "ok" : "fail"}`}>{result.message}</div>
          )}
        </div>
      )}
    </div>
  );
}
