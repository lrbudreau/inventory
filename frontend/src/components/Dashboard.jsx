import { useEffect, useState, useCallback } from "react";
import { apiGet } from "../auth";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function dueBadge(days) {
  if (days === null) return null;
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: "badge-danger" };
  if (days === 0) return { label: "Due today", cls: "badge-danger" };
  if (days <= 3) return { label: `${days}d left`, cls: "badge-warn" };
  if (days <= 7) return { label: `${days}d left`, cls: "badge-active" };
  return { label: `${days}d left`, cls: "badge-ok" };
}

function BuildsChart({ purchases }) {
  if (!purchases.length) return <p className="empty" style={{padding:"12px 0"}}>No restock data yet.</p>;
  const now = new Date();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(now);
    start.setDate(now.getDate() - (7 * (7 - i)));
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end, label: `${start.getMonth()+1}/${start.getDate()}`, total: 0 };
  });
  purchases.forEach(p => {
    const d = new Date(p.date);
    weeks.forEach(w => { if (d >= w.start && d <= w.end) w.total += p.quantity; });
  });
  const max = Math.max(...weeks.map(w => w.total), 1);
  return (
    <div className="builds-chart">
      {weeks.map((w, i) => (
        <div key={i} className="chart-col">
          <div className="chart-bar-wrap">
            <div className="chart-bar" style={{ height: `${Math.max(4, (w.total / max) * 100)}%` }} title={`${w.total} units`} />
          </div>
          <span className="chart-label">{w.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [shoppingListHTML, setShoppingListHTML] = useState(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    // Single batch call instead of 5 separate calls
    const dash = await apiGet("dashboard");
    if (!dash) return;

    const ordersData = Array.isArray(dash.orders) ? dash.orders : [];
    setData({
      parts:     Array.isArray(dash.parts)     ? dash.parts     : [],
      products:  Array.isArray(dash.products)  ? dash.products  : [],
      orders:    ordersData,
      customers: Array.isArray(dash.customers) ? dash.customers : [],
      purchases: Array.isArray(dash.purchases) ? dash.purchases : [],
      vendors:   Array.isArray(dash.vendors)   ? dash.vendors   : [],
    });

    // Load order items for active orders
    const active = ordersData.filter(o => o.status !== "Complete");
    const allItems = await Promise.all(active.map(o => apiGet("orderProducts", { orderID: o.id })));
    setOrderItems(active.map((o, i) => ({ orderID: o.id, items: Array.isArray(allItems[i]) ? allItems[i] : [] })));

    setLoading(false);
    setRefreshing(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <div className="loading pad">Loading dashboard…</div>;

  const { parts, products, orders, customers, purchases, vendors = [] } = data;
  const lowStock = parts.filter(p => p.quantity === 0 || (p.min > 0 && p.quantity <= p.min));
  const activeOrders = orders.filter(o => o.status !== "Complete");
  const overdueOrders = activeOrders.filter(o => { const d = daysUntil(o.dueDate); return d !== null && d < 0; });
  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

  function orderProgress(orderID) {
    const oi = orderItems.find(o => o.orderID == orderID);
    if (!oi || !oi.items.length) return 0;
    const total = oi.items.reduce((s, i) => s + i.quantity, 0);
    const built  = oi.items.reduce((s, i) => s + (i.built||0), 0);
    return total > 0 ? Math.round((built/total)*100) : 0;
  }

  function printShoppingList() {
    const rows = lowStock.map(p => {
      const vendor = vendors.find(v => v.id == p.vendorID);
      const suggested = p.min > 0 ? Math.max(0, p.min * 2 - p.quantity) : "—";
      return `<tr>
        <td>${p.name}</td>
        <td>${p.barcode||"—"}</td>
        <td style="text-align:center">${p.quantity}</td>
        <td style="text-align:center">${p.min||"—"}</td>
        <td style="text-align:center">${suggested}</td>
        <td>${vendor ? vendor.name : "—"}</td>
      </tr>`;
    }).join("");

    setShoppingListHTML(`
      <h1 style="font-size:1.4rem;margin-bottom:4px;font-family:sans-serif">Shopping List</h1>
      <p style="color:#666;margin-bottom:16px;font-size:.9rem;font-family:sans-serif">
        Generated ${new Date().toLocaleDateString()} · ${lowStock.length} parts need reordering
      </p>
      <table style="width:100%;border-collapse:collapse;font-family:sans-serif">
        <thead>
          <tr style="background:#2d5a27;color:#fff">
            <th style="text-align:left;padding:8px 12px;font-size:.8rem;text-transform:uppercase">Part</th>
            <th style="text-align:left;padding:8px 12px;font-size:.8rem;text-transform:uppercase">Barcode</th>
            <th style="text-align:center;padding:8px 12px;font-size:.8rem;text-transform:uppercase">In Stock</th>
            <th style="text-align:center;padding:8px 12px;font-size:.8rem;text-transform:uppercase">Min</th>
            <th style="text-align:center;padding:8px 12px;font-size:.8rem;text-transform:uppercase">Order Qty</th>
            <th style="text-align:left;padding:8px 12px;font-size:.8rem;text-transform:uppercase">Vendor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  const sortedActiveOrders = [...activeOrders].sort((a, b) => {
    const da = daysUntil(a.dueDate) ?? 9999;
    const db = daysUntil(b.dueDate) ?? 9999;
    return da - db;
  });

  return (
    <div className="dashboard">
      {shoppingListHTML && (
        <div className="invoice-overlay">
          <div className="invoice-toolbar no-print">
            <button className="btn-secondary" onClick={() => setShoppingListHTML(null)}>← Back</button>
            <button className="btn-primary" onClick={() => window.print()}>🖨 Print</button>
          </div>
          <div className="invoice-body" dangerouslySetInnerHTML={{ __html: shoppingListHTML }} />
        </div>
      )}
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn-refresh" onClick={() => load(true)} disabled={refreshing} title="Refresh">
          <span style={{display:"inline-block", animation: refreshing ? "spin-slow 0.8s linear infinite" : "none"}}>⟳</span>
          {lastRefresh && <span className="refresh-time">{lastRefresh.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{parts.length}</span>
          <span className="stat-label">Parts</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{products.length}</span>
          <span className="stat-label">Products</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{activeOrders.length}</span>
          <span className="stat-label">Active Orders</span>
        </div>
        <div className={`stat-card ${lowStock.length > 0 ? "warn" : ""}`}>
          <span className="stat-num">{lowStock.length}</span>
          <span className="stat-label">Low Stock</span>
        </div>
      </div>

      {/* Overdue */}
      {overdueOrders.length > 0 && (
        <div className="card alert-card">
          <h2>⚠ Overdue Orders</h2>
          <ul className="item-list">
            {overdueOrders.map(o => {
              const badge = dueBadge(daysUntil(o.dueDate));
              return (
                <li key={o.id} className="item-row">
                  <div className="item-main">
                    <span className="item-name">#{o.orderNumber}</span>
                    <span className="item-sub">{customerMap[o.customerID] || o.customerID}</span>
                  </div>
                  <div className="item-right">
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Active Orders */}
      <div className="card">
        <h2>Active Orders</h2>
        {sortedActiveOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">▦</div>
            <div className="empty-state-text">No active orders</div>
            <div className="empty-state-hint">Go to Orders and tap + New to create one</div>
          </div>
        ) : (
          <ul className="item-list">
            {sortedActiveOrders.map(o => {
              const days = daysUntil(o.dueDate);
              const badge = dueBadge(days);
              const pct = orderProgress(o.id);
              return (
                <li key={o.id} className="item-row" style={{flexDirection:"column",alignItems:"stretch",gap:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <span className="item-name">#{o.orderNumber}</span>
                      <span className="item-sub" style={{marginLeft:8}}>{customerMap[o.customerID] || o.customerID}</span>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
                      <span className={`badge ${o.status==="In Progress"?"badge-warn":"badge-active"}`}>{o.status}</span>
                    </div>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{width:`${pct}%`}} />
                  </div>
                  <span style={{fontSize:"0.72rem",color:"var(--text-muted)"}}>{pct}% built</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <div className="card alert-card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h2 style={{marginBottom:0}}>⚠ Stock Alerts</h2>
            <button className="btn-print" onClick={printShoppingList}>🖨 Shopping List</button>
          </div>
          <ul className="item-list">
            {lowStock.map(p => (
              <li key={p.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">{p.name}</span>
                  <span className="item-sub">{p.quantity===0?"Out of stock":`${p.quantity} left · min is ${p.min}`}</span>
                </div>
                <div className="item-right">
                  <span className={`qty-badge ${p.quantity===0?"danger":"warn"}`}>{p.quantity===0?"OUT":p.quantity}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Restock Chart */}
      <div className="card">
        <h2>Restock Activity — Last 8 Weeks</h2>
        <BuildsChart purchases={purchases} />
      </div>
    </div>
  );
}
