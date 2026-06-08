import { useEffect, useState } from "react";
import { apiGet } from "../auth";

export default function Dashboard() {
  const [parts, setParts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, o, c, pr] = await Promise.all([
        apiGet("parts"), apiGet("orders"), apiGet("companies"), apiGet("products"),
      ]);
      setParts(Array.isArray(p) ? p : []);
      setOrders(Array.isArray(o) ? o : []);
      setCompanies(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setLoading(false);
    }
    load();
  }, []);

  // Use min if set, otherwise fall back to hardcoded 20
  const lowStock = parts.filter(p => {
    if (p.quantity === 0) return true;
    if (p.min > 0) return p.quantity <= p.min;
    return false;
  });

  const outOfStock = parts.filter(p => p.quantity === 0);
  const activeOrders = orders.filter(o => o.status !== "Complete");
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]));

  if (loading) return <div className="loading pad">Loading dashboard…</div>;

  return (
    <div className="dashboard">
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{parts.length}</span>
          <span className="stat-label">Total Parts</span>
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

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="card alert-card">
          <h2>⚠ Stock Alerts</h2>
          <ul className="item-list">
            {lowStock.map(p => (
              <li key={p.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">{p.name}</span>
                  <span className="item-sub">
                    {p.quantity === 0
                      ? "Out of stock"
                      : `${p.quantity} remaining · min is ${p.min}`}
                  </span>
                </div>
                <div className="item-right">
                  <span className={`qty-badge ${p.quantity === 0 ? "danger" : "warn"}`}>
                    {p.quantity === 0 ? "OUT" : p.quantity}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Orders */}
      <div className="card">
        <h2>Active Orders</h2>
        {activeOrders.length === 0 ? (
          <p className="empty">No active orders.</p>
        ) : (
          <ul className="item-list">
            {activeOrders.map(o => (
              <li key={o.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">#{o.orderNumber}</span>
                  <span className="item-sub">{companyMap[o.companyID] || o.companyID || "—"}</span>
                </div>
                <div className="item-right">
                  <span className={`badge ${o.status === "In Progress" ? "badge-warn" : "badge-active"}`}>
                    {o.status || "Open"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
