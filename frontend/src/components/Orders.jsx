import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { EditIcon, DeleteIcon, CloseIcon } from "./Icons";
import { showToast } from "./Toast";

const STATUS_COLORS = {
  "Open":        "badge-active",
  "In Progress": "badge-warn",
  "Complete":    "badge-ok",
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function dueBadge(days) {
  if (days === null) return null;
  if (days < 0) return { label:`${Math.abs(days)}d overdue`, cls:"badge-danger" };
  if (days === 0) return { label:"Due today", cls:"badge-danger" };
  if (days <= 3) return { label:`${days}d left`, cls:"badge-warn" };
  return { label:`${days}d left`, cls:"badge-active" };
}

export default function Orders({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [parts, setParts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [productLines, setProductLines] = useState([{ productID: "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [buildCounts, setBuildCounts] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [buildResult, setBuildResult] = useState(null);
  const [invoiceHTML, setInvoiceHTML] = useState(null); // for in-app invoice

  async function load() {
    const data = await apiGet("ordersPage");
    if (!data) return;
    setOrders(Array.isArray(data.orders) ? data.orders : []);
    setProducts(Array.isArray(data.products) ? data.products : []);
    setParts(Array.isArray(data.parts) ? data.parts : []);
    setCustomers(Array.isArray(data.customers) ? data.customers : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function printInvoice() {
    document.body.classList.add("invoice-open");
    const settings = await apiGet("settings");
    const customer = customers.find(c => c.id == selected.customerID);
    const invoiceNum = `INV-${selected.orderNumber}-${new Date().getFullYear()}`;
    const today = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });

    const itemRows = orderItems.map(item => {
      const built = item.built || 0;
      return `<tr>
        <td>${getProductName(item.productID)}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:center">${built}</td>
        <td style="text-align:center">${item.quantity - built > 0 ? `<span style="color:#c0392b">${item.quantity - built} remaining</span>` : '<span style="color:#27ae60">✓ Complete</span>'}</td>
      </tr>`;
    }).join("");

    const html = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 32px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #2d5a27; }
        .logo { max-width: 200px; max-height: 70px; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { font-size: 1.8rem; font-weight: 800; color: #2d5a27; text-transform: uppercase; }
        .invoice-title .inv-num { font-size: 0.95rem; color: #666; margin-top: 4px; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 40px; }
        .party { flex: 1; }
        .party-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2d5a27; margin-bottom: 6px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
        .party-name { font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; }
        .party-detail { color: #555; line-height: 1.6; font-size: 0.88rem; }
        .meta-row { display: flex; gap: 32px; margin-bottom: 28px; flex-wrap: wrap; }
        .meta-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2d5a27; margin-bottom: 4px; }
        .meta-value { font-size: 0.9rem; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
        thead tr { background: #2d5a27; color: #fff; }
        thead th { padding: 9px 12px; text-align: left; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
        tbody tr:nth-child(even) { background: #f7f7f7; }
        tbody td { padding: 9px 12px; border-bottom: 1px solid #e8e8e8; font-size: 0.88rem; }
        .footer { border-top: 2px solid #2d5a27; padding-top: 16px; display: flex; justify-content: space-between; }
        .footer-note { color: #666; font-size: 0.8rem; line-height: 1.5; }
        .footer-brand { text-align: right; font-size: 0.72rem; color: #999; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
        .status-complete { background: #e8f5e9; color: #2d5a27; border: 1px solid #2d5a27; }
        .status-progress { background: #fff3e0; color: #e65100; border: 1px solid #e65100; }
        .status-open { background: #e3f2fd; color: #1565c0; border: 1px solid #1565c0; }
        @media print {
          @page { margin: 0.5in; }
          .sidebar, .mobile-header, .mobile-bottom-nav, .invoice-toolbar, .page, .dashboard, .stats-row { display: none !important; }
          .main-content { margin: 0 !important; padding: 0 !important; }
          .invoice-overlay { position: static !important; overflow: visible !important; background: #fff !important; }
          .invoice-body { padding: 0 !important; }
        }
      </style>
      <div class="header">
        <img class="logo" src="https://cdn.shopify.com/oxygen-v2/30746/18450/38098/3736725/logo.png?width=300&crop=center" alt="${settings.customerName || ''}" />
        <div class="invoice-title">
          <h1>Invoice</h1>
          <div class="inv-num">${invoiceNum}</div>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <div class="party-label">From</div>
          <div class="party-name">${settings.companyName || ""}</div>
          <div class="party-detail">
            ${settings.companyAddress ? settings.companyAddress + "<br>" : ""}
            ${settings.companyCity || ""}<br>
            ${settings.companyPhone ? "Phone: " + settings.companyPhone + "<br>" : ""}
            ${settings.companyFax ? "Fax: " + settings.companyFax : ""}
          </div>
        </div>
        <div class="party">
          <div class="party-label">Bill To</div>
          <div class="party-name">${customer?.name || selected.customerID}</div>
          <div class="party-detail">
            ${customer?.address ? customer.address + "<br>" : ""}
            ${[customer?.city, customer?.state, customer?.zip].filter(Boolean).join(", ")}
            ${customer?.email ? "<br>" + customer.email : ""}
            ${customer?.phone ? "<br>" + customer.phone : ""}
          </div>
        </div>
      </div>
      <div class="meta-row">
        <div><div class="meta-label">Invoice Date</div><div class="meta-value">${today}</div></div>
        <div><div class="meta-label">Order Number</div><div class="meta-value">#${selected.orderNumber}</div></div>
        ${selected.dueDate ? `<div><div class="meta-label">Due Date</div><div class="meta-value">${selected.dueDate}</div></div>` : ""}
        <div><div class="meta-label">Status</div><div class="meta-value">
          <span class="status-badge ${selected.status === "Complete" ? "status-complete" : selected.status === "In Progress" ? "status-progress" : "status-open"}">${selected.status}</span>
        </div></div>
      </div>
      <table>
        <thead><tr>
          <th>Product / Description</th>
          <th style="text-align:center">Qty Ordered</th>
          <th style="text-align:center">Qty Built</th>
          <th style="text-align:center">Status</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="footer">
        <div class="footer-note">Thank you for your business!<br>${settings.companyWebsite ? settings.companyWebsite.replace(/^https?:\/\//, "") : ""}</div>
        <div class="footer-brand">Generated by FabTrack<br>${today}</div>
      </div>
    `;

    setInvoiceHTML(html);
  }

  function printOrder(summary = true) {
    const customer = customers.find(c => c.id == selected.customerID);
    const itemRows = orderItems.map(item => {
      const built = item.built || 0;
      const remaining = item.quantity - built;
      return `<tr>
        <td>${getProductName(item.productID)}</td>
        <td>${item.quantity}</td>
        ${!summary ? `<td>${built}</td><td>${remaining}</td>` : ""}
      </tr>`;
    }).join("");

    const html = `
      <style>
        body { font-family: sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 1.4rem; margin-bottom: 4px; }
        .meta { color: #555; font-size: 0.88rem; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; border-bottom: 2px solid #333; padding: 8px 12px; font-size: 0.78rem; text-transform: uppercase; }
        td { padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 0.88rem; }
        .footer { margin-top: 24px; font-size: 0.78rem; color: #999; }
        @media print { .no-print { display:none; } }
      </style>
      <h1>Order #${selected.orderNumber}</h1>
      <div class="meta">
        Customer: ${customer?.name || selected.customerID} &nbsp;|&nbsp;
        Status: ${selected.status} &nbsp;|&nbsp;
        ${selected.dueDate ? `Due: ${selected.dueDate} &nbsp;|&nbsp;` : ""}
        Printed: ${new Date().toLocaleDateString()}
      </div>
      <table>
        <thead><tr>
          <th>Product</th><th>Qty Ordered</th>
          ${!summary ? "<th>Built</th><th>Remaining</th>" : ""}
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="footer">FabTrack · Generated ${new Date().toLocaleString()}</div>
    `;

    setInvoiceHTML(html);
  }

  async function selectOrder(order) {
    setSelected(order);
    setBuildResult(null);
    setOrderItems([]);
    setView("detail");
    try {
      const items = await apiGet("orderProducts", { orderID: order.id });
      setOrderItems(Array.isArray(items) ? items : []);
    } catch(err) {
      console.error("Failed to load order items", err);
    }
  }

  function getCustomerName(customerID) {
    const c = customers.find(c => c.id == customerID);
    return c ? c.name : customerID;
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
    const count = Math.min(buildCounts[item.productID] || 1, item.quantity - item.built);
    const remaining = item.quantity - item.built;
    if (remaining <= 0 || count <= 0) return;
    setBuilding(item.productID);
    setBuildResult(null);

    const ok = await canBuildProduct(item.productID, count);
    if (!ok) {
      setBuildResult({ ok: false, message: `Not enough parts to build ${count}x ${getProductName(item.productID)}.` });
      setBuilding(null);
      return;
    }

    const newBuilt = item.built + count;
    const res = await apiPost("orderProducts/buildFor", { orderID: selected.id, productId: item.productID, count, newBuilt, userID: currentUser?.id, username: currentUser?.username });

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
      setBuildResult({ ok: true, message: `Built ${count}x ${getProductName(item.productID)}!` });
    } else {
      setBuildResult({ ok: false, message: "Build failed." });
    }
    setBuilding(null);
  }

  function openNewOrder() {
    setEditingOrder(null);
    setOrderNumber("");
    setCustomerName("");
    setDueDate("");
    setProductLines([{ productID: "", quantity: 1 }]);
    setShowForm(true);
  }

  function openEditOrder(order) {
    setEditingOrder(order);
    setOrderNumber(order.orderNumber);
    setCustomerName(order.customerID);
    setDueDate(order.dueDate || "");
    setProductLines([{ productID: "", quantity: 1 }]);
    setShowForm(true);
  }

  function addProductLine() { setProductLines([...productLines, { productID: "", quantity: 1 }]); }
  function removeProductLine(idx) { setProductLines(productLines.filter((_, i) => i !== idx)); }
  function updateProductLine(idx, field, value) {
    setProductLines(productLines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  async function handleSaveOrder(e) {
    e.preventDefault();
    setSaving(true);
    if (editingOrder) {
      await apiPost("orders/update", { id: editingOrder.id, orderNumber, customerID: customerName, status: editingOrder.status, dueDate });
    } else {
      const res = await apiPost("orders/create", { orderNumber, customerID: customerName, dueDate });
      const newOrderId = res.id;
      for (const line of productLines) {
        if (line.productID) {
          await apiPost("orderProducts/create", { orderID: newOrderId, productID: line.productID, quantity: Number(line.quantity) });
        }
      }
    }
    setShowForm(false);
    showToast(editingOrder ? "Order updated!" : "Order created!");
    await load();
    setSaving(false);
  }

  async function handleDeleteOrder(order) {
    setSaving(true);
    await apiPost("orders/delete", { id: order.id });
    setConfirmDelete(null);
    showToast("Order deleted.", "warn");
    if (selected?.id === order.id) { setSelected(null); setView("list"); }
    await load();
    setSaving(false);
  }

  async function handleStatusChange(newStatus) {
    await apiPost("orders/update", { id: selected.id, orderNumber: selected.orderNumber, customerID: selected.customerID, status: newStatus });
    setSelected({ ...selected, status: newStatus });
    setOrders(orders.map(o => o.id == selected.id ? { ...o, status: newStatus } : o));
  }

  const progress = (items) => {
    if (!items.length) return 0;
    const total = items.reduce((s, i) => s + i.quantity, 0);
    const built = items.reduce((s, i) => s + (i.built || 0), 0);
    return total > 0 ? Math.round((built / total) * 100) : 0;
  };

  const filteredOrders = orders.filter(o => filterStatus === "all" || o.status === filterStatus);

  return (
    <div className="page">

      {/* In-app invoice/print viewer */}
      {invoiceHTML && (
        <div className="invoice-overlay">
          <div className="invoice-toolbar no-print">
            <button className="btn-secondary" onClick={() => { setInvoiceHTML(null); document.body.classList.remove("invoice-open"); }}>← Back</button>
            <button className="btn-primary" onClick={() => window.print()}>🖨 Print</button>
          </div>
          <div className="invoice-body" dangerouslySetInnerHTML={{ __html: invoiceHTML }} />
        </div>
      )}

      <div className="page-header">
        <h1>
          {view === "detail" && selected ? (
            <span>
              <button className="btn-back" onClick={() => setView("list")}>←</button>
              #{selected.orderNumber}
            </span>
          ) : "Orders"}
        </h1>
        {view === "list" && <button className="btn-primary" onClick={openNewOrder}>+ New</button>}
        {view === "detail" && selected && (
          <div style={{display:"flex", gap:6, alignItems:"center", flexWrap:"wrap"}}>
            {(() => { const d = daysUntil(selected.dueDate); const b = dueBadge(d); return b ? <span className={`badge ${b.cls}`}>{b.label}</span> : null; })()}
            <span className={`badge ${STATUS_COLORS[selected.status] || "badge-active"}`}>{selected.status}</span>
            <button className="btn-print" onClick={() => printOrder(true)}>🖨 Summary</button>
            <button className="btn-print" onClick={() => printOrder(false)}>🖨 Detail</button>
            <button className="btn-invoice" onClick={printInvoice}>📄 Invoice</button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingOrder ? "Edit Order" : "New Order"}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleSaveOrder} className="inline-form">
              <div className="field"><label>Order Number</label><input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="e.g. ORD-001" required /></div>
              <div className="field"><label>Due Date (optional)</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
              <div className="field">
                <label>Customer</label>
                <select value={customerName} onChange={e => setCustomerName(e.target.value)} required>
                  <option value="">Select a customer…</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {!editingOrder && (
                <div className="field">
                  <label>Products</label>
                  {productLines.map((line, idx) => (
                    <div key={idx} className="part-line">
                      <select value={line.productID} onChange={e => updateProductLine(idx, "productID", e.target.value)} required>
                        <option value="">Select product…</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" min="1" value={line.quantity} onChange={e => updateProductLine(idx, "quantity", e.target.value)} className="qty-input" placeholder="Qty" />
                      {productLines.length > 1 && <button type="button" className="btn-icon" onClick={() => removeProductLine(idx)}><CloseIcon /></button>}
                    </div>
                  ))}
                  <button type="button" className="btn-add-part" onClick={addProductLine}>+ Add Another Product</button>
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

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete Order?</h2>
            <p className="confirm-text">Delete order <strong>#{confirmDelete.orderNumber}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDeleteOrder(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <>
          <div className="list-controls" style={{marginBottom:14}}>
            <select className="control-select full-width" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Orders</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
          <div className="card no-pad">
            {loading ? <p className="loading pad">Loading…</p> : filteredOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">▦</div>
                <div className="empty-state-text">{filterStatus !== "all" ? `No ${filterStatus} orders` : "No orders yet"}</div>
                {filterStatus === "all" && <div className="empty-state-hint">Tap + New to create your first order</div>}
              </div>
            ) : (
              <ul className="item-list">
                {filteredOrders.map(o => (
                  <li key={o.id} className="item-row">
                    <button className="item-btn" onClick={() => selectOrder(o)}>
                      <div className="item-main">
                        <span className="item-name">#{o.orderNumber}</span>
                        <span className="item-sub">{getCustomerName(o.customerID)}</span>
                      </div>
                    </button>
                    <div className="item-right">
                      <span className={`badge ${STATUS_COLORS[o.status] || "badge-active"}`}>{o.status || "Open"}</span>
                      <button className="btn-icon" onClick={() => openEditOrder(o)}><EditIcon /></button>
                      <button className="btn-icon" onClick={() => setConfirmDelete(o)}><DeleteIcon /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {view === "detail" && selected && (
        <div>
          <div className="order-meta card">
            <div className="order-meta-row">
              <span className="meta-label">Customer</span>
              <span className="meta-value">{getCustomerName(selected.customerID)}</span>
            </div>
            {selected.dueDate && (
              <div className="order-meta-row">
                <span className="meta-label">Due Date</span>
                <span className="meta-value">{selected.dueDate}</span>
              </div>
            )}
            <div className="order-meta-row">
              <span className="meta-label">Status</span>
              <div className="status-buttons">
                {["Open", "In Progress", "Complete"].map(s => (
                  <button key={s} className={`status-btn ${selected.status === s ? "active" : ""}`} onClick={() => handleStatusChange(s)}>{s}</button>
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
                        <div className="build-inline">
                          <div className="qty-stepper">
                            <button className="stepper-btn" onClick={() => setBuildCounts({ ...buildCounts, [item.productID]: Math.max(1, (buildCounts[item.productID] || 1) - 1) })}>−</button>
                            <span className="stepper-val">{buildCounts[item.productID] || 1}</span>
                            <button className="stepper-btn" onClick={() => setBuildCounts({ ...buildCounts, [item.productID]: Math.min((buildCounts[item.productID] || 1) + 1, remaining) })}>+</button>
                          </div>
                          <button className="btn-build-sm" onClick={() => handleBuildForOrder(item)} disabled={building === item.productID}>
                            {building === item.productID ? "…" : "Build"}
                          </button>
                        </div>
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
