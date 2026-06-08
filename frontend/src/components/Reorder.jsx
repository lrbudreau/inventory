import { useEffect, useState } from "react";
import { apiGet } from "../auth";

export default function Reorder() {
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, v] = await Promise.all([apiGet("parts"), apiGet("vendors")]);
      setParts(Array.isArray(p) ? p : []);
      setVendors(Array.isArray(v) ? v : []);
      setLoading(false);
    }
    load();
  }, []);

  function getVendor(id) { return vendors.find(v => v.id == id); }

  const needsReorder = parts.filter(p => p.quantity === 0 || (p.min > 0 && p.quantity <= p.min));

  // Group by vendor
  const byVendor = {};
  needsReorder.forEach(p => {
    const key = p.vendorID || "unassigned";
    if (!byVendor[key]) byVendor[key] = [];
    byVendor[key].push(p);
  });

  function printList() {
    const win = window.open("", "_blank");
    const rows = needsReorder.map(p => {
      const vendor = getVendor(p.vendorID);
      const suggest = p.min > 0 ? (p.min * 2 - p.quantity) : "—";
      return `<tr>
        <td>${p.name}</td>
        <td>${p.barcode || "—"}</td>
        <td>${p.quantity}</td>
        <td>${p.min || "—"}</td>
        <td>${suggest}</td>
        <td>${vendor ? vendor.name : "—"}</td>
      </tr>`;
    }).join("");

    win.document.write(`
      <html><head><title>Reorder List</title>
      <style>
        body { font-family: sans-serif; padding: 24px; }
        h1 { font-size: 1.4rem; margin-bottom: 4px; }
        p { color: #666; margin-bottom: 16px; font-size: 0.9rem; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; border-bottom: 2px solid #333; padding: 8px 12px; font-size: 0.8rem; text-transform: uppercase; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h1>Reorder List</h1>
        <p>Generated ${new Date().toLocaleDateString()} · ${needsReorder.length} parts need reordering</p>
        <table>
          <thead><tr><th>Part</th><th>Barcode</th><th>In Stock</th><th>Min</th><th>Suggested Order</th><th>Vendor</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <br/><button onclick="window.print()">Print</button>
      </body></html>
    `);
    win.document.close();
  }

  if (loading) return <div className="loading pad">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reorder List</h1>
        {needsReorder.length > 0 && (
          <button className="btn-primary" onClick={printList}>🖨 Print</button>
        )}
      </div>

      {needsReorder.length === 0 ? (
        <div className="card">
          <p className="success" style={{padding:"12px 0"}}>✓ All parts are well stocked! Nothing needs reordering.</p>
        </div>
      ) : (
        Object.entries(byVendor).map(([vendorKey, vendorParts]) => {
          const vendor = getVendor(vendorKey);
          return (
            <div key={vendorKey} className="card no-pad" style={{marginBottom:14}}>
              <div className="reorder-vendor-header">
                <div>
                  <div className="reorder-vendor-name">{vendor ? vendor.name : "No Vendor Assigned"}</div>
                  {vendor?.phone && <div className="reorder-vendor-contact">{vendor.phone}</div>}
                  {vendor?.email && <div className="reorder-vendor-contact">{vendor.email}</div>}
                  {vendor?.website && <a className="reorder-vendor-contact detail-link" href={vendor.website} target="_blank" rel="noreferrer">{vendor.website.replace(/^https?:\/\//, "")}</a>}
                </div>
                <span className="badge badge-warn">{vendorParts.length} part{vendorParts.length > 1 ? "s" : ""}</span>
              </div>
              <ul className="item-list">
                {vendorParts.map(p => {
                  const suggested = p.min > 0 ? Math.max(0, p.min * 2 - p.quantity) : null;
                  return (
                    <li key={p.id} className="item-row">
                      <div className="item-main">
                        <span className="item-name">{p.name}</span>
                        <span className="item-sub">
                          {p.barcode ? `Barcode: ${p.barcode} · ` : ""}
                          {p.cost > 0 ? `$${p.cost.toFixed(2)}/unit` : "No cost set"}
                        </span>
                      </div>
                      <div className="item-right" style={{flexDirection:"column", alignItems:"flex-end", gap:2}}>
                        <span className={`qty-badge ${p.quantity === 0 ? "danger" : "warn"}`}>{p.quantity} left</span>
                        {suggested && <span style={{fontSize:"0.72rem", color:"var(--text-muted)"}}>Order ~{suggested}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
