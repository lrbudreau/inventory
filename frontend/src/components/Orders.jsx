import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { EditIcon, DeleteIcon, CloseIcon } from "./Icons";

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
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [productLines, setProductLines] = useState([{ productID: "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(null);
  const [buildCounts, setBuildCounts] = useState({});
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

  async function printInvoice() {
    const settings = await apiGet("settings");
    const customer = companies.find(c => c.id == selected.companyID);
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

    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNum}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 48px; }

          /* HEADER */
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #2d5a27; }
          .logo { max-width: 220px; max-height: 80px; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 2rem; font-weight: 800; color: #2d5a27; letter-spacing: 0.05em; text-transform: uppercase; }
          .invoice-title .inv-num { font-size: 1rem; color: #666; margin-top: 4px; }

          /* FROM / TO */
          .parties { display: flex; justify-content: space-between; margin-bottom: 32px; gap: 40px; }
          .party { flex: 1; }
          .party-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2d5a27; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
          .party-name { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
          .party-detail { color: #555; line-height: 1.6; }

          /* META */
          .meta-row { display: flex; gap: 40px; margin-bottom: 32px; }
          .meta-item { }
          .meta-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2d5a27; margin-bottom: 4px; }
          .meta-value { font-size: 0.95rem; font-weight: 600; }

          /* TABLE */
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          thead tr { background: #2d5a27; color: #fff; }
          thead th { padding: 10px 14px; text-align: left; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
          tbody tr:nth-child(even) { background: #f7f7f7; }
          tbody td { padding: 10px 14px; border-bottom: 1px solid #e8e8e8; }
          tbody tr:last-child td { border-bottom: none; }

          /* STATUS */
          .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
          .status-complete { background: #e8f5e9; color: #2d5a27; border: 1px solid #2d5a27; }
          .status-progress { background: #fff3e0; color: #e65100; border: 1px solid #e65100; }
          .status-open { background: #e3f2fd; color: #1565c0; border: 1px solid #1565c0; }

          /* FOOTER */
          .footer { border-top: 2px solid #2d5a27; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer-note { color: #666; font-size: 0.82rem; max-width: 320px; line-height: 1.5; }
          .footer-brand { text-align: right; font-size: 0.75rem; color: #999; }

          @media print {
            body { padding: 24px; }
            .no-print { display: none !important; }
            @page { margin: 0.5in; }
          }
        </style>
      </head>
      <body>

        <!-- HEADER -->
        <div class="header">
          <img class="logo" src="https://cdn.shopify.com/oxygen-v2/30746/18450/38098/3736725/logo.png?width=300&crop=center" alt="${settings.companyName || 'Company Logo'}" />
          <div class="invoice-title">
            <h1>Invoice</h1>
            <div class="inv-num">${invoiceNum}</div>
          </div>
        </div>

        <!-- FROM / TO -->
        <div class="parties">
          <div class="party">
            <div class="party-label">From</div>
            <div class="party-name">${settings.companyName || ""}</div>
            <div class="party-detail">
              ${settings.companyAddress ? settings.companyAddress + "<br>" : ""}
              ${settings.companyCity || ""}<br>
              ${settings.companyPhone ? "📞 " + settings.companyPhone + "<br>" : ""}
              ${settings.companyEmail ? "✉ " + settings.companyEmail : ""}
            </div>
          </div>
          <div class="party">
            <div class="party-label">Bill To</div>
            <div class="party-name">${customer?.name || selected.companyID}</div>
            <div class="party-detail">
              ${customer?.address ? customer.address + "<br>" : ""}
              ${[customer?.city, customer?.state, customer?.zip].filter(Boolean).join(", ")}
              ${customer?.email ? "<br>✉ " + customer.email : ""}
              ${customer?.phone ? "<br>📞 " + customer.phone : ""}
            </div>
          </div>
        </div>

        <!-- META -->
        <div class="meta-row">
          <div class="meta-item">
            <div class="meta-label">Invoice Date</div>
            <div class="meta-value">${today}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Order Number</div>
            <div class="meta-value">#${selected.orderNumber}</div>
          </div>
          ${selected.dueDate ? `
          <div class="meta-item">
            <div class="meta-label">Due Date</div>
            <div class="meta-value">${selected.dueDate}</div>
          </div>` : ""}
          <div class="meta-item">
            <div class="meta-label">Status</div>
            <div class="meta-value">
              <span class="status-badge ${selected.status === "Complete" ? "status-complete" : selected.status === "In Progress" ? "status-progress" : "status-open"}">
                ${selected.status}
              </span>
            </div>
          </div>
        </div>

        <!-- LINE ITEMS -->
        <table>
          <thead>
            <tr>
              <th>Product / Description</th>
              <th style="text-align:center">Qty Ordered</th>
              <th style="text-align:center">Qty Built</th>
              <th style="text-align:center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- FOOTER -->
        <div class="footer">
          <div class="footer-note">
            Thank you for your business!<br>
            ${settings.companyWebsite ? `<a href="${settings.companyWebsite}" style="color:#2d5a27">${settings.companyWebsite.replace(/^https?:\/\//, "")}</a>` : ""}
          </div>
          <div class="footer-brand">
            Generated by FabTrack<br>${today}
          </div>
        </div>

        <br>
        <div class="no-print" style="text-align:center; margin-top:24px">
          <button onclick="window.print()" style="background:#2d5a27;color:#fff;border:none;padding:12px 32px;font-size:1rem;border-radius:6px;cursor:pointer;font-weight:700">
            🖨 Print Invoice
          </button>
        </div>

      </body>
      </html>
    `);
    win.document.close();
  }

  function printOrder(summary = true) {
    const win = window.open("", "_blank");
    const company = companies.find(c => c.id == selected.companyID);
    const itemRows = orderItems.map(item => {
      const built = item.built || 0;
      const remaining = item.quantity - built;
      return `<tr>
        <td>${getProductName(item.productID)}</td>
        <td>${item.quantity}</td>
        ${!summary ? `<td>${built}</td><td>${remaining}</td>` : ""}
      </tr>`;
    }).join("");
    win.document.write(`
      <html><head><title>Order #${selected.orderNumber}</title>
      <style>
        body { font-family: sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 1.5rem; margin-bottom: 4px; }
        .meta { color: #555; font-size: 0.9rem; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; border-bottom: 2px solid #333; padding: 8px 12px; font-size: 0.8rem; text-transform: uppercase; }
        td { padding: 8px 12px; border-bottom: 1px solid #ddd; }
        .footer { margin-top: 32px; font-size: 0.8rem; color: #999; }
        @media print { button { display:none; } }
      </style></head>
      <body>
        <h1>Order #${selected.orderNumber}</h1>
        <div class="meta">
          Customer: ${company?.name || selected.companyID} &nbsp;|&nbsp;
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
        <br/><button onclick="window.print()">Print</button>
      </body></html>
    `);
    win.document.close();
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
    setCompanyName("");
    setDueDate("");
    setProductLines([{ productID: "", quantity: 1 }]);
    setShowForm(true);
  }

  function openEditOrder(order) {
    setEditingOrder(order);
    setOrderNumber(order.orderNumber);
    setCompanyName(order.companyID);
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
      await apiPost("orders/update", { id: editingOrder.id, orderNumber, companyID: companyName, status: editingOrder.status, dueDate });
    } else {
      const res = await apiPost("orders/create", { orderNumber, companyID: companyName, dueDate });
      const newOrderId = res.id;
      for (const line of productLines) {
        if (line.productID) {
          await apiPost("orderProducts/create", { orderID: newOrderId, productID: line.productID, quantity: Number(line.quantity) });
        }
      }
    }
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function handleDeleteOrder(order) {
    setSaving(true);
    await apiPost("orders/delete", { id: order.id });
    setConfirmDelete(null);
    if (selected?.id === order.id) { setSelected(null); setView("list"); }
    await load();
    setSaving(false);
  }

  async function handleStatusChange(newStatus) {
    await apiPost("orders/update", { id: selected.id, orderNumber: selected.orderNumber, companyID: selected.companyID, status: newStatus });
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
                <label>Company / Customer</label>
                <select value={companyName} onChange={e => setCompanyName(e.target.value)} required>
                  <option value="">Select a company…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                    <button className="btn-icon" onClick={() => openEditOrder(o)}><EditIcon /></button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(o)}><DeleteIcon /></button>
                  </div>
                </li>
              ))}
              {orders.length === 0 && <li className="empty pad">No orders yet.</li>}
            </ul>
          )}
        </div>
      )}

      {view === "detail" && selected && (
        <div>
          <div className="order-meta card">
            <div className="order-meta-row">
              <span className="meta-label">Customer</span>
              <span className="meta-value">{getCompanyName(selected.companyID)}</span>
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
                            <button
                              className="stepper-btn"
                              onClick={() => setBuildCounts({ ...buildCounts, [item.productID]: Math.max(1, (buildCounts[item.productID] || 1) - 1) })}
                            >−</button>
                            <span className="stepper-val">{buildCounts[item.productID] || 1}</span>
                            <button
                              className="stepper-btn"
                              onClick={() => setBuildCounts({ ...buildCounts, [item.productID]: Math.min((buildCounts[item.productID] || 1) + 1, remaining) })}
                            >+</button>
                          </div>
                          <button
                            className="btn-build-sm"
                            onClick={() => handleBuildForOrder(item)}
                            disabled={building === item.productID}
                          >
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
