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
        apiGet("parts"),
        apiGet("orders"),
        apiGet("companies"),
        apiGet("products"),
      ]);
      setParts(Array.isArray(p) ? p : []);
      setOrders(Array.isArray(o) ? o : []);
      setCompanies(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setLoading(false);
    }
    load();
  }, []);

  const lowStock = parts.filter((p) => p.quantity < 20);
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  if (loading) return <div className="loading">Loading dashboard…</div>;

  return (
    <div className="dashboard">
      {/* Stats Row */}
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
          <span className="stat-num">{orders.length}</span>
          <span className="stat-label">Orders</span>
        </div>
        <div className="stat-card warn">
          <span className="stat-num">{lowStock.length}</span>
          <span className="stat-label">Low Stock</span>
        </div>
      </div>

      <div className="dash-grid">
        {/* Recent Orders */}
        <div className="card">
          <h2>Active Orders</h2>
          {orders.length === 0 ? (
            <p className="empty">No orders yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Company</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="order-num">#{o.orderNumber || o.id}</span>
                    </td>
                    <td>{companyMap[o.companyID] || "—"}</td>
                    <td>
                      <span className="badge badge-active">In Progress</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low Stock Warning */}
        <div className="card">
          <h2>⚠ Low Stock Alert</h2>
          {lowStock.length === 0 ? (
            <p className="empty success">All parts well stocked.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>
                      <span className="badge badge-warn">{p.quantity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
