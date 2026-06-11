import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { EditIcon, DeleteIcon, CloseIcon } from "./Icons";
import { showToast } from "./Toast";

export default function Build({ currentUser }) {
  const [products, setProducts] = useState([]);
  const [parts, setParts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [productParts, setProductParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productName, setProductName] = useState("");
  const [partLines, setPartLines] = useState([{ partID: "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState("list");
  const [quickBuilding, setQuickBuilding] = useState(null);

  async function load() {
    const [pr, p] = await Promise.all([apiGet("products"), apiGet("parts")]);
    setProducts(Array.isArray(pr) ? pr : []);
    setParts(Array.isArray(p) ? p : []);
    setLoading(false);
    if (Array.isArray(pr) && Array.isArray(p)) loadEstimates(pr, p);
  }

  useEffect(() => { load(); }, []);

  const [estimates, setEstimates] = useState({});

  async function loadEstimates(productList, partsList) {
    const results = {};
    for (const product of productList) {
      const pp = await apiGet("productParts", { productID: product.id });
      if (Array.isArray(pp) && pp.length > 0) {
        const max = Math.min(...pp.map(p => {
          const part = partsList.find(pt => pt.id == p.partID);
          if (!part || p.quantity === 0) return 0;
          return Math.floor(part.quantity / p.quantity);
        }));
        results[product.id] = max;
      } else {
        results[product.id] = 0;
      }
    }
    setEstimates(results);
  }

  async function handleQuickBuild(product, e) {
    e.stopPropagation(); // Don't open the product detail
    setQuickBuilding(product.id);
    const res = await apiPost("quickBuild", {
      productId: product.id,
      userID: currentUser?.id,
      username: currentUser?.username,
    });
    if (res?.success) {
      showToast(`Built 1x ${product.name} → Order #${res.orderNumber}`);
      await load();
    } else {
      showToast(res?.error || "Quick build failed.", "fail");
    }
    setQuickBuilding(null);
  }

  async function selectProduct(product) {
    setSelected(product);
    setProductParts([]);
    setView("detail");
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

  function openNew() {
    setEditingProduct(null);
    setProductName("");
    setPartLines([{ partID: "", quantity: 1 }]);
    setShowForm(true);
  }

  async function openEdit(product) {
    setEditingProduct(product);
    setProductName(product.name);
    // Load existing parts for this product
    const pp = await apiGet("productParts", { productID: product.id });
    const existing = Array.isArray(pp) ? pp : [];
    setPartLines(
      existing.length > 0
        ? existing.map(p => ({ partID: String(p.partID), quantity: p.quantity }))
        : [{ partID: "", quantity: 1 }]
    );
    setShowForm(true);
  }

  function addPartLine() { setPartLines([...partLines, { partID: "", quantity: 1 }]); }
  function removePartLine(idx) { setPartLines(partLines.filter((_, i) => i !== idx)); }
  function updatePartLine(idx, field, value) {
    setPartLines(partLines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    if (editingProduct) {
      // Update product name
      await apiPost("products/update", { id: editingProduct.id, name: productName });

      // Delete old product parts by deleting and re-adding
      // First delete all existing productParts for this product
      const existing = await apiGet("productParts", { productID: editingProduct.id });
      if (Array.isArray(existing)) {
        for (const pp of existing) {
          await apiPost("productParts/delete", { productID: editingProduct.id, partID: pp.partID });
        }
      }
      // Add new part lines
      for (const line of partLines) {
        if (line.partID) {
          await apiPost("productParts/create", {
            productID: editingProduct.id,
            partID: line.partID,
            quantity: Number(line.quantity)
          });
        }
      }
      // Refresh detail view if we're looking at this product
      if (selected?.id === editingProduct.id) {
        const pp = await apiGet("productParts", { productID: editingProduct.id });
        setProductParts(Array.isArray(pp) ? pp : []);
        setSelected({ ...selected, name: productName });
      }
    } else {
      // Create new product
      const res = await apiPost("products/create", { name: productName });
      const newId = res.id;
      for (const line of partLines) {
        if (line.partID) {
          await apiPost("productParts/create", {
            productID: newId,
            partID: line.partID,
            quantity: Number(line.quantity)
          });
        }
      }
    }

    setShowForm(false);
    setEditingProduct(null);
    await load();
    setSaving(false);
  }

  async function handleDelete(product) {
    setSaving(true);
    await apiPost("products/delete", { id: product.id });
    setConfirmDelete(null);
    if (selected?.id === product.id) { setSelected(null); setView("list"); }
    await load();
    setSaving(false);
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
          ) : "Products"}
        </h1>
        {view === "list" && <button className="btn-primary" onClick={openNew}>+ Add</button>}
        {view === "detail" && selected && (
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-icon" onClick={() => openEdit(selected)}><EditIcon /></button>
            <button className="btn-icon" onClick={() => setConfirmDelete(selected)}><DeleteIcon /></button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? "Edit Product" : "New Product"}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSave} className="inline-form">
              <div className="field">
                <label>Product Name</label>
                <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Steel Chair" required />
              </div>
              <div className="field">
                <label>Parts Required</label>
                {partLines.map((line, idx) => (
                  <div key={idx} className="part-line">
                    <select value={line.partID} onChange={e => updatePartLine(idx, "partID", e.target.value)} required>
                      <option value="">Select a part…</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number" min="1" value={line.quantity}
                      onChange={e => updatePartLine(idx, "quantity", e.target.value)}
                      className="qty-input" placeholder="Qty"
                    />
                    {partLines.length > 1 && (
                      <button type="button" className="btn-icon" onClick={() => removePartLine(idx)}><CloseIcon /></button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-add-part" onClick={addPartLine}>+ Add Another Part</button>
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
            <h2>Delete Product?</h2>
            <p className="confirm-text">Delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
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
                      <span className="item-sub">
                        {estimates[p.id] !== undefined
                          ? estimates[p.id] === 0
                            ? "⚠ Cannot build — parts low"
                            : `Can build ${estimates[p.id]} now`
                          : "View parts →"}
                      </span>
                    </div>
                  </button>
                  <div className="item-right">
                    <button
                      className="btn-quick-build"
                      onClick={(e) => handleQuickBuild(p, e)}
                      disabled={quickBuilding === p.id || estimates[p.id] === 0}
                      title="Quick build — auto assigns to highest priority order"
                    >
                      {quickBuilding === p.id ? "…" : "⚡ Build"}
                    </button>
                    <button className="btn-icon" onClick={() => openEdit(p)}><EditIcon /></button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(p)}><DeleteIcon /></button>
                  </div>
                </li>
              ))}
              {products.length === 0 && <li className="empty pad">No products yet.</li>}
            </ul>
          )}
        </div>
      )}

      {/* Product Detail — parts list only, no build */}
      {view === "detail" && selected && (
        <div className="card no-pad">
          {productParts.length === 0 ? (
            <p className="empty pad">No parts defined for this product.</p>
          ) : (
            <ul className="item-list">
              {productParts.map(pp => (
                <li key={pp.partID} className="item-row">
                  <div className="item-main">
                    <span className="item-name">{getPartName(pp.partID)}</span>
                  </div>
                  <div className="item-right">
                    <span className="qty-badge ok">{pp.quantity}×</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
