import { useEffect, useState } from "react";
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

export default function Dashboard() {
  const [parts, setParts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, o, c, pr, pu] = await Promise.all([
        apiGet("parts"), apiGet("orders"), apiGet("companies"),
        apiGet("products"), apiGet("purchases"),
      ]);
      const partsData = Array.isArray(p) ? p : [];
      const ordersData = Array.isArray(o) ? o : [];
      setParts(partsData);
      setOrders(ordersData);
      setCompanies(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setPurchases(Array.isArray(pu) ? pu : []);

      // Load order items for active orders
      const active = ordersData.filter(o => o.status !== "Complete");
      const allItems = await Promise.all(
        active.map(o => apiGet("orderProducts", { orderID: o.id }))
      );
      setOrderItems(active.map((o, i) => ({ orderID: o.id, items: Array.isArray(allItems[i]) ? allItems[i] : [] })));
      setLoading(false);
    }
    load();
  }, []);

  const lowStock = parts.filter(p => p.quantity === 0 || (p.min > 0 && p.quantity <= p.min));
  const activeOrders = orders.filter(o => o.status !== "Complete");
  const overdueOrders = activeOrders.filter(o => { const d = daysUntil(o.dueDate); return d !== null && d < 0; });
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]));

  // Parts consumption rate — total used in purchases vs built
  const consumption = parts.map(part => {
    const totalPurchased = purchases.filter(p => p.partID == part.id).reduce((s, p) => s + p.quantity, 0);
    return { ...part, totalPurchased };
  }).filter(p => p.totalPurchased > 0).sort((a, b) => b.totalPurchased - a.totalPurchased).slice(0, 5);

  // Estimated builds possible per product
  function maxBuildsFor(productParts, partsData) {
    if (!productParts.length) return 0;
    return Math.min(...productParts.map(pp => {
      const part = partsData.find(p => p.id == pp.partID);
      if (!part || pp.quantity === 0) return 0;
      return Math.floor(part.quantity / pp.quantity);
    }));
  }

  // Active order progress
  function orderProgress(orderID) {
    const oi = orderItems.find(o => o.orderID == orderID);
    if (!oi || !oi.items.length) return 0;
    const total = oi.items.reduce((s, i) => s + i.quantity, 0);
    const built = oi.items.reduce((s, i) => s + (i.built||0), 0);
    return total > 0 ? Math.round((built/total)*100) : 0;
  }

  if (loading) return <div className="loading pad">Loading dashboard…</div>;

  const sortedActiveOrders = [...activeOrders].sort((a, b) => {
    const da = daysUntil(a.dueDate) ?? 9999;
    const db = daysUntil(b.dueDate) ?? 9999;
    return da - db;
  });

  return (
    <div className="dashboard">
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

      {/* Overdue alert */}
      {overdueOrders.length > 0 && (
        <div className="card alert-card">
          <h2>⚠ Overdue Orders</h2>
          <ul className="item-list">
            {overdueOrders.map(o => {
              const days = daysUntil(o.dueDate);
              const badge = dueBadge(days);
              return (
                <li key={o.id} className="item-row">
                  <div className="item-main">
                    <span className="item-name">#{o.orderNumber}</span>
                    <span className="item-sub">{companyMap[o.companyID] || o.companyID}</span>
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
          <p className="empty">No active orders.</p>
        ) : (
          <ul className="item-list">
            {sortedActiveOrders.map(o => {
              const days = daysUntil(o.dueDate);
              const badge = dueBadge(days);
              const pct = orderProgress(o.id);
              return (
                <li key={o.id} className="item-row" style={{flexDirection:"column", alignItems:"stretch", gap:6}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <span className="item-name">#{o.orderNumber}</span>
                      <span className="item-sub" style={{marginLeft:8}}>{companyMap[o.companyID] || o.companyID}</span>
                    </div>
                    <div style={{display:"flex", gap:6, alignItems:"center"}}>
                      {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
                      <span className={`badge ${o.status === "In Progress" ? "badge-warn" : "badge-active"}`}>{o.status}</span>
                    </div>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{width:`${pct}%`}} />
                  </div>
                  <span style={{fontSize:"0.72rem", color:"var(--text-muted)"}}>{pct}% built</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <div className="card alert-card">
          <h2>⚠ Stock Alerts</h2>
          <ul className="item-list">
            {lowStock.map(p => (
              <li key={p.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">{p.name}</span>
                  <span className="item-sub">{p.quantity === 0 ? "Out of stock" : `${p.quantity} left · min is ${p.min}`}</span>
                </div>
                <div className="item-right">
                  <span className={`qty-badge ${p.quantity === 0 ? "danger" : "warn"}`}>{p.quantity === 0 ? "OUT" : p.quantity}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Parts Consumption */}
      {consumption.length > 0 && (
        <div className="card">
          <h2>Top Parts Used</h2>
          <ul className="item-list">
            {consumption.map(p => (
              <li key={p.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">{p.name}</span>
                  <span className="item-sub">Current stock: {p.quantity}</span>
                </div>
                <div className="item-right">
                  <span className="qty-badge ok">{p.totalPurchased} purchased</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
