import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { EditIcon, DeleteIcon, CloseIcon } from "./Icons";

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
  const [productName, setProductName] = useState("");
  const [partLines, setPartLines] = useState([{ partID: "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState("list");

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
    setProductParts([]);
    setView("build");
    try {
      const pp = await apiGet("productParts", { productID: product.id });
      setProductParts(Array.isArray(pp) ? pp : []);
    } catch(err) {
      console.error("Failed to load product parts", err);
    }
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
    return productParts.length > 0 && productParts.every(
      pp => getPartQty(pp.partID) >= pp.quantity * count
    );
  }

  async function handleBuild() {
    if (!canBuild()) return;
    setBuilding(true);
    setResult(null);
    const res = await apiPost({ resource: "build", data: { productId: selected.id, count } });
    if (res.success) {
      setResult({ ok: true, message: `Built ${count}x ${selected.name}!` });
      await load();
      const pp = await apiGet("productParts", { productID: selected.id });
      setProductParts(Array.isArray(pp) ? pp : []);
    } else {
      setResult({ ok: false, message: "Build failed. Check inventory." });
    }
    setBuilding(false);
  }

  function openNewProduct() {
    setEditingProduct(null);
    setProductName("");
    setPartLines([{ partID: "", quantity: 1 }]);
    setShowNewProduct(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setProductName(product.name);
    setPartLines([{ partID: "", quantity: 1 }]);
    setShowNewProduct(true);
  }

  function addPartLine() {
    setPartLines([...partLines, { partID: "", quantity: 1 }]);
  }

  function removePartLine(idx) {
    setPartLines(partLines.filter((_, i) => i !== idx));
  }

  function updatePartLine(idx, field, value) {
    const updated = partLines.map((line, i) =>
      i === idx ? { ...line, [field]: value } : line
    );
    setPartLines(updated);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    setSaving(true);
    if (editingProduct) {
      await apiPost({ resource: "products/update", data: { id: editingProduct.id, name: productName } });
    } else {
      const productRes = await apiPost({ resource: "products", data: { name: productName } });
      const newId = productRes.id;
      for (const line of partLines) {
        if (line.partID) {
          await apiPost({
            resource: "productParts",
            data: { productID: newId, partID: line.partID, quantity: Number(line.quantity) }
          });
        }
      }
    }
    setShowNewProduct(false);
    setEditingProduct(null);
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
          <button className="btn-primary" onClick={openNewProduct}>+ Add</button>
        )}
      </div>

      {/* New/Edit Product Modal */}
      {showNewProduct && (
        <div className="modal-overlay" onClick={() => setShowNewProduct(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? "Edit Product" : "New Product"}</h2>
              <button className="modal-close" onClick={() => setShowNewProduct(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="inline-form">
              <div className="field">
                <label>Product Name</label>
                <input
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="e.g. Steel Chair"
                  required
                />
              </div>

              {!editingProduct && (
                <div className="field">
                  <label>Parts Required</label>
                  {partLines.map((line, idx) => (
                    <div key={idx} className="part-line">
                      <select
                        value={line.partID}
                        onChange={e => updatePartLine(idx, "partID", e.target.value)}
                        required
                      >
                        <option value="">Select a part…</option>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={e => updatePartLine(idx, "quantity", e.target.value)}
                        className="qty-input"
                        placeholder="Qty"
                      />
                      {partLines.length > 1 && (
                        <button type="button" className="btn-icon" onClick={() => removePartLine(idx)}><CloseIcon /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn-add-part" onClick={addPartLine}>
                    + Add Another Part
                  </button>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowNewProduct(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete Product?</h2>
            <p className="confirm-text">Delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDeleteProduct(confirmDelete)} disabled={saving}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      {view === "list" && (
        <div className="card no-pad">
          {loading ? <p className="loading pad">Loading…</p> : (
            <ul className="item-list">
              {products.map(p => (
                <li key={p.id} className="item-row">
                  <button className="item-btn" onClick={() => selectProduct(p)}>
                    <div className="item-main">
                      <span className="item-name">{p.name}</span>
                      <span className="item-sub">View parts &amp; build →</span>
                    </div>
                  </button>
                  <div className="item-right">
                    <button className="btn-icon" onClick={() => openEditProduct(p)}><EditIcon /></button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(p)}><DeleteIcon /></button>
                  </div>
                </li>
              ))}
              {products.length === 0 && <li className="empty pad">No products yet.</li>}
            </ul>
          )}
        </div>
      )}

      {/* Build View */}
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
                      <span className={`qty-badge ${ok ? "ok" : "danger"}`}>
                        {ok ? "✓" : `Short ${need - have}`}
                      </span>
                    </div>
                  </li>
                );
              })}
              {productParts.length === 0 && <li className="empty pad">No parts defined for this product.</li>}
            </ul>
          </div>

          <div className="build-footer">
            <div className="field qty-field">
              <label>Qty to Build</label>
              <input
                type="number"
                min="1"
                value={count}
                onChange={e => setCount(Number(e.target.value))}
              />
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
