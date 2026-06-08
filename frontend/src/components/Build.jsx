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
  const [newProduct, setNewProduct] = useState({ name: "", lines: "" });
  const [saving, setSaving] = useState(false);

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
    const pp = await apiGet("productParts", { id: product.id });
    setProductParts(Array.isArray(pp) ? pp : []);
  }

  function getPartName(partId) {
    const p = parts.find((p) => p.id == partId);
    return p ? p.name : `Part #${partId}`;
  }

  function getPartQty(partId) {
    const p = parts.find((p) => p.id == partId);
    return p ? p.quantity : 0;
  }

  function canBuild() {
    return productParts.every(
      (pp) => getPartQty(pp.partID) >= pp.quantity * count
    );
  }

  async function handleBuild() {
    if (!canBuild()) return;
    setBuilding(true);
    setResult(null);
    const res = await apiPost({
      resource: "build",
      data: { productId: selected.id, count },
    });
    if (res.success) {
      setResult({ ok: true, message: `Successfully built ${count}x ${selected.name}!` });
      await load();
      selectProduct(selected);
    } else {
      setResult({ ok: false, message: "Build failed. Check inventory." });
    }
    setBuilding(false);
  }

  async function handleNewProduct(e) {
    e.preventDefault();
    setSaving(true);
    const productRes = await apiPost({
      resource: "products",
      data: { name: newProduct.name },
    });
    const newId = productRes.id;
    const lines = newProduct.lines.trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const [partID, qty] = line.split(":").map((s) => s.trim());
      await apiPost({
        resource: "productParts",
        data: { productID: newId, partID, quantity: Number(qty) },
      });
    }
    setNewProduct({ name: "", lines: "" });
    setShowNewProduct(false);
    await load();
    setSaving(false);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Build Products</h1>
        <button className="btn-primary" onClick={() => setShowNewProduct(!showNewProduct)}>
          {showNewProduct ? "Cancel" : "+ New Product"}
        </button>
      </div>

      {showNewProduct && (
        <div className="card form-card">
          <h2>Define New Product</h2>
          <form onSubmit={handleNewProduct} className="inline-form">
            <div className="field">
              <label>Product Name</label>
              <input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="e.g. Steel Chair"
                required
              />
            </div>
            <div className="field">
              <label>Parts (one per line: partID:quantity)</label>
              <textarea
                value={newProduct.lines}
                onChange={(e) => setNewProduct({ ...newProduct, lines: e.target.value })}
                placeholder={"1:4\n2:8\n3:1"}
                rows={4}
              />
              <small className="hint">
                Use the Part IDs from the Parts page. Example: <code>1:4</code> means 4x of Part #1.
              </small>
            </div>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Product"}
            </button>
          </form>
        </div>
      )}

      <div className="build-grid">
        {/* Product List */}
        <div className="card product-list">
          <h2>Select a Product</h2>
          {loading ? (
            <p className="loading">Loading…</p>
          ) : (
            <ul className="product-items">
              {products.map((p) => (
                <li
                  key={p.id}
                  className={`product-item ${selected?.id === p.id ? "active" : ""}`}
                  onClick={() => selectProduct(p)}
                >
                  <span className="product-name">{p.name}</span>
                  <span className="product-id">#{p.id}</span>
                </li>
              ))}
              {products.length === 0 && <li className="empty">No products defined yet.</li>}
            </ul>
          )}
        </div>

        {/* Build Panel */}
        <div className="card build-panel">
          {!selected ? (
            <p className="empty">← Select a product to build</p>
          ) : (
            <>
              <h2>Build: {selected.name}</h2>

              <div className="bom-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Need (×{count})</th>
                      <th>In Stock</th>
                      <th>OK?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productParts.map((pp) => {
                      const need = pp.quantity * count;
                      const have = getPartQty(pp.partID);
                      const ok = have >= need;
                      return (
                        <tr key={pp.partID}>
                          <td>{getPartName(pp.partID)}</td>
                          <td>{need}</td>
                          <td>{have}</td>
                          <td>
                            {ok ? (
                              <span className="badge badge-ok">✓</span>
                            ) : (
                              <span className="badge badge-danger">✗ Short {need - have}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {productParts.length === 0 && (
                      <tr><td colSpan={4} className="empty">No parts defined for this product.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="build-controls">
                <div className="field">
                  <label>Quantity to Build</label>
                  <input
                    type="number"
                    min="1"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                </div>
                <button
                  className={`btn-build ${!canBuild() ? "disabled" : ""}`}
                  onClick={handleBuild}
                  disabled={building || !canBuild() || productParts.length === 0}
                >
                  {building ? "Building…" : `Build ${count}x ${selected.name}`}
                </button>
              </div>

              {result && (
                <div className={`result-msg ${result.ok ? "ok" : "fail"}`}>
                  {result.message}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
