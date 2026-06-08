import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";

const STATUS_COLORS = {
  "Open":        "badge-active",
  "In Progress": "badge-warn",
  "Complete":    "badge-ok",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [parts, setParts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "detail"
  const [selected, setSelected] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [productLines, setProductLines] = useState([{ productID: "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [buildResult, setBuildResult] = useState(null);

  async function load() {
    const [o, pr, p, c] = await Promise.all([apiGet("orders"), apiGet("products"), apiGet("parts"), apiGet("companies")]);
    setOrders(Array.isArray(o) ? o : []);
    setProducts(Array.isArray(pr) ? pr : []);
    setParts(Array.isArray(p) ? p : []);
    setCompanies(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function selectOrder(order) {
    setSelected(order);
    setBuildResult(null);
    const items = await apiGet("orderProducts", { orderID: order.id });
    setOrderItems(Array.isArray(items) ? items : []);
    setView("detail");
  }

  function getCompanyName(companyID) {
    const c = companies.find(c => c.id == companyID);
    return c ? c.name : companyID;
  }

  function getProductName(productID) {
    const p = products.find(p => p.id == productID);
    return p ? p.name : `Product #${productID}`;
  }

  function getPartStock(partId) {
    const p = parts.find(p => p.id == partId);
    return p ? p.quantity : 0;
  }

  async function getProductParts(productID) {
    return await apiGet("productParts", { productID });
  }

  async function canBuildProduct(productID, count) {
    const pp = await getProductParts(productID);
    return pp.every(p => getPartStock(p.partID) >= p.quantity * count);
  }

  async function handleBuildForOrder(item) {
    const remaining = item.quantity - item.built;
    if (remaining <= 0) return;
    setBuilding(item.productID);
    setBuildResult(null);

    const ok = await canBuildProduct(item.productID, 1);
    if (!ok) {
      setBuildResult({ ok: false, message: `Not enough parts to build ${getProductName(item.productID)}.` });
      setBuilding(null);
      return;
    }

    const newBuilt = item.built + 1;
    const res = await apiPost({
      resource: "orderProducts/buildFor",
      data: {
        orderID: selected.id,
        productId: item.productID,
        count: 1,
        newBuilt,
      }
    });

    if (res.success) {
      const updatedItems = orderItems.map(i =>
        i.productID == item.productID ? { ...i, built: newBuilt } : i
      );
      setOrderItems(updatedItems);
      const allDone = updatedItems.every(i => i.built >= i.quantity);
      const newStatus = allDone ? "Complete" : "In Progress";
      setSelected({ ...selected, status: newStatus });
      setOrders(orders.map(o => o.id == selected.id ? { ...o, status: newStatus } : o));
      await load();
      setBuildResult({ ok: true, message: `Built 1x ${getProductName(item.productID)}!` });
    } else {
      setBuildResult({ ok: false, message: "Build failed." });
    }
    setBuilding(null);
  }

  function openNewOrder() {
    setEditingOrder(null);
    setOrderNumber("");
    setCompanyName("");
    setProductLines([{ productID: "", quantity: 1 }]);
    setShowForm(true);
  }

  function openEditOrder(order) {
    setEditingOrder(order);
    setOrderNumber(order.orderNumber);
    setCompanyName(order.companyID);
    setProductLines([{ productID: "", quantity: 1 }]);
    setShowForm(true);
  }

  function addProductLine() {
    setProductLines([...productLines, { productID: "", quantity: 1 }]);
  }

  function removeProductLine(idx) {
    setProductLines(productLines.filter((_, i) => i !== idx));
  }

  function updateProductLine(idx, field, value) {
    setProductLines(productLines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  async function handleSaveOrder(e) {
    e.preventDefault();
    setSaving(true);
    if (editingOrder) {
      await apiPost({ resource: "orders/update", data: { id: editingOrder.id, orderNumber, companyID: companyName, status: editingOrder.status } });
    } else {
      const res = await apiPost({ resource: "orders", data: { orderNumber, companyID: companyName } });
      const newOrderId = res.id;
      for (const line of productLines) {
        if (line.productID) {
          await apiPost({ resource: "orderProducts", data: { orderID: newOrderId, productID: line.productID, quantity: Number(line.quantity) } });
        }
      }
    }
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function handleDeleteOrder(order) {
    setSaving(true);
    await apiPost({ resource: "orders/delete", data: { id: order.id } });
    setConfirmDelete(null);
    if (selected?.id === order.id) { setSelected(null); setView("list"); }
    await load();
    setSaving(false);
  }

  async function handleStatusChange(newStatus) {
    await apiPost({ resource: "orders/update", data: { id: selected.id, orderNumber: selected.orderNumber, companyID: selected.companyID, status: newStatus } });
    setSelected({ ...selected, status: newStatus });
    setOrders(orders.map(o => o.id == selected.id ? { ...o, status: newStatus } : o));
  }

  const progress = (items) => {
    if (!items.length) return 0;
    const total = items.reduce((s, i) => s + i.quantity, 0);
    const built = items.reduce((s, i) => s + (i.built || 0), 0);
    return total > 0 ? Math.round((built / total) * 100) : 0;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          {view === "detail" && selected ? (
            <span>
              <button className="btn-back" onClick={() => setView("list")}>←</button>
              #{selected.orderNumber}
            </span>
          ) : "Orders"}
        </h1>
        {view === "list" && (
          <button className="btn-primary" onClick={openNewOrder}>+ New</button>
        )}
        {view === "detail" && selected && (
          <span className={`badge ${STATUS_COLORS[selected.status] || "badge-active"}`}>
            {selected.status}
          </span>
        )}
      </div>

      {/* New/Edit Order Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingOrder ? "Edit Order" : "New Order"}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveOrder} className="inline-form">
              <div className="field">
                <label>Order Number</label>
                <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="e.g. ORD-001" required />
              </div>
              <div className="field">
                <label>Company / Customer</label>
                <select value={companyName} onChange={e => setCompanyName(e.target.value)} required>
                  <option value="">Select a company…</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {!editingOrder && (
                <div className="field">
                  <label>Products</label>
                  {productLines.map((line, idx) => (
                    <div key={idx} className="part-line">
                      <select value={line.productID} onChange={e => updateProductLine(idx, "productID", e.target.value)} required>
                        <option value="">Select product…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={e => updateProductLine(idx, "quantity", e.target.value)}
                        className="qty-input"
                        placeholder="Qty"
                      />
                      {productLines.length > 1 && (
                        <button type="button" className="btn-icon" onClick={() => removeProductLine(idx)}>✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn-add-part" onClick={addProductLine}>
                    + Add Another Product
                  </button>
                </div>
              )}
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
            <h2>Delete Order?</h2>
            <p className="confirm-text">Delete order <strong>#{confirmDelete.orderNumber}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDeleteOrder(confirmDelete)} disabled={saving}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order List */}
      {view === "list" && (
        <div className="card no-pad">
          {loading ? <p className="loading pad">Loading…</p> : (
            <ul className="item-list">
              {orders.map(o => (
                <li key={o.id} className="item-row">
                  <button className="item-btn" onClick={() => selectOrder(o)}>
                    <div className="item-main">
                      <span className="item-name">#{o.orderNumber}</span>
                      <span className="item-sub">{getCompanyName(o.companyID)}</span>
                    </div>
                  </button>
                  <div className="item-right">
                    <span className={`badge ${STATUS_COLORS[o.status] || "badge-active"}`}>{o.status || "Open"}</span>
                    <button className="btn-icon" onClick={() => openEditOrder(o)}>✏️</button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(o)}>🗑️</button>
                  </div>
                </li>
              ))}
              {orders.length === 0 && <li className="empty pad">No orders yet.</li>}
            </ul>
          )}
        </div>
      )}

      {/* Order Detail */}
      {view === "detail" && selected && (
        <div>
          <div className="order-meta card">
            <div className="order-meta-row">
              <span className="meta-label">Customer</span>
              <span className="meta-value">{getCompanyName(selected.companyID)}</span>
            </div>
            <div className="order-meta-row">
              <span className="meta-label">Status</span>
              <div className="status-buttons">
                {["Open", "In Progress", "Complete"].map(s => (
                  <button
                    key={s}
                    className={`status-btn ${selected.status === s ? "active" : ""}`}
                    onClick={() => handleStatusChange(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="order-meta-row">
              <span className="meta-label">Progress</span>
              <span className="meta-value">{progress(orderItems)}%</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${progress(orderItems)}%` }} />
            </div>
          </div>

          {buildResult && (
            <div className={`result-msg ${buildResult.ok ? "ok" : "fail"}`}>{buildResult.message}</div>
          )}

          <div className="card no-pad">
            <ul className="item-list">
              {orderItems.map(item => {
                const built = item.built || 0;
                const remaining = item.quantity - built;
                const done = remaining <= 0;
                return (
                  <li key={item.productID} className="item-row">
                    <div className="item-main">
                      <span className="item-name">{getProductName(item.productID)}</span>
                      <span className="item-sub">
                        {built} / {item.quantity} built
                        {done ? " ✓ Complete" : ` · ${remaining} remaining`}
                      </span>
                      <div className="mini-progress-wrap">
                        <div className="mini-progress" style={{ width: `${Math.min(100, (built / item.quantity) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="item-right">
                      {!done ? (
                        <button
                          className="btn-build-sm"
                          onClick={() => handleBuildForOrder(item)}
                          disabled={building === item.productID}
                        >
                          {building === item.productID ? "…" : "Build 1"}
                        </button>
                      ) : (
                        <span className="qty-badge ok">✓</span>
                      )}
                    </div>
                  </li>
                );
              })}
              {orderItems.length === 0 && <li className="empty pad">No products on this order.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
