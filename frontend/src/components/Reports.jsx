import { useEffect, useState } from "react";
import { apiGet } from "../auth";

function fmt(n) { return "$" + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function fmtPct(n) { return Number(n || 0).toFixed(1) + "%"; }

function StatTile({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{flex:1, minWidth:130}}>
      <span className="stat-num" style={color ? {color} : {}}>{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span style={{fontSize:"0.7rem", color:"var(--text-muted)", marginTop:2}}>{sub}</span>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:"0.82rem", marginBottom:3}}>
        <span style={{color:"var(--text)"}}>{label}</span>
        <span style={{color:"var(--text-muted)", fontWeight:600}}>{fmt(value)}</span>
      </div>
      <div style={{height:8, background:"var(--border)", borderRadius:4, overflow:"hidden"}}>
        <div style={{height:"100%", width:`${pct}%`, background: color || "var(--green)", borderRadius:4, transition:"width 0.4s"}} />
      </div>
    </div>
  );
}

export default function Reports() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10);
  const todayStr = today.toISOString().slice(0,10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet("reports", { startDate, endDate });
      if (data?.error) { setError(data.error); setReport(null); }
      else setReport(data);
    } catch(e) {
      setError("Failed to load report.");
    }
    setLoading(false);
  }

  useEffect(() => { loadReport(); }, []);

  function setPreset(preset) {
    const now = new Date();
    let s, e = now.toISOString().slice(0,10);
    if (preset === "this_month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    } else if (preset === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      s = lm.toISOString().slice(0,10);
      e = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10);
    } else if (preset === "this_year") {
      s = new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10);
    } else if (preset === "last_30") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      s = d.toISOString().slice(0,10);
    } else if (preset === "last_90") {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      s = d.toISOString().slice(0,10);
    }
    setStartDate(s);
    setEndDate(e);
  }

  const r = report;

  // Margin color
  function marginColor(m) {
    if (m >= 40) return "var(--green)";
    if (m >= 20) return "#f59e0b";
    return "var(--danger)";
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      {/* Date range picker */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:10}}>
          {[
            ["this_month", "This Month"],
            ["last_month", "Last Month"],
            ["last_30", "Last 30 Days"],
            ["last_90", "Last 90 Days"],
            ["this_year", "This Year"],
          ].map(([key, label]) => (
            <button
              key={key}
              className="btn-secondary"
              style={{fontSize:"0.8rem", padding:"4px 10px"}}
              onClick={() => setPreset(key)}
            >{label}</button>
          ))}
        </div>
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end"}}>
          <div className="field" style={{margin:0, flex:1, minWidth:130}}>
            <label>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="field" style={{margin:0, flex:1, minWidth:130}}>
            <label>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={loadReport} disabled={loading} style={{height:38, whiteSpace:"nowrap"}}>
            {loading ? "Loading…" : "Run Report"}
          </button>
        </div>
      </div>

      {error && <div className="result-msg fail">{error}</div>}

      {loading && <p className="loading pad">Loading report…</p>}

      {r && !loading && (
        <>
          {/* KPI tiles */}
          <div className="stats-row" style={{flexWrap:"wrap", gap:10, marginBottom:16}}>
            <StatTile label="Revenue" value={fmt(r.revenue)} sub="price × units built" color="var(--green)" />
            <StatTile label="Material Cost" value={fmt(r.materialCost)} sub="parts used" />
            <StatTile label="Gross Profit" value={fmt(r.grossProfit)} color={r.grossProfit >= 0 ? "var(--green)" : "var(--danger)"} />
            <StatTile label="Scrap Cost" value={fmt(r.scrapCost)} color={r.scrapCost > 0 ? "var(--danger)" : undefined} sub={`${r.scrapCount} units scrapped`} />
            <StatTile label="Net Profit" value={fmt(r.netProfit)} color={r.netProfit >= 0 ? "var(--green)" : "var(--danger)"} />
            <StatTile label="Margin" value={fmtPct(r.margin)} color={marginColor(r.margin)} sub="after scrap" />
          </div>

          {/* Profit breakdown bar chart */}
          <div className="card" style={{marginBottom:16}}>
            <h2 style={{marginBottom:14}}>Profit Breakdown</h2>
            {r.revenue === 0 ? (
              <p className="empty" style={{padding:"8px 0", color:"var(--text-muted)"}}>No revenue data for this period. Make sure products have a price set.</p>
            ) : (
              <>
                <MiniBar label="Revenue" value={r.revenue} max={r.revenue} color="var(--green)" />
                <MiniBar label="Material Cost" value={r.materialCost} max={r.revenue} color="#f59e0b" />
                <MiniBar label="Scrap Cost" value={r.scrapCost} max={r.revenue} color="var(--danger)" />
                <div style={{marginTop:12, paddingTop:12, borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <span style={{fontSize:"0.9rem", color:"var(--text-muted)"}}>Net Profit</span>
                  <span style={{fontSize:"1.15rem", fontWeight:800, color: r.netProfit >= 0 ? "var(--green)" : "var(--danger)"}}>
                    {fmt(r.netProfit)} &nbsp;
                    <span style={{fontSize:"0.85rem", fontWeight:500}}>({fmtPct(r.margin)} margin)</span>
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Scrap summary */}
          <div className="card" style={{marginBottom:16}}>
            <h2 style={{marginBottom:14}}>Scrap Summary</h2>
            {r.scrapCount === 0 ? (
              <p className="empty" style={{padding:"8px 0", color:"var(--text-muted)"}}>No scrapped units in this period. 🎉</p>
            ) : (
              <div style={{display:"flex", gap:24, flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:"0.72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4}}>Units Scrapped</div>
                  <div style={{fontSize:"1.8rem", fontWeight:800, color:"var(--danger)"}}>{r.scrapCount}</div>
                </div>
                <div>
                  <div style={{fontSize:"0.72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4}}>Material Lost</div>
                  <div style={{fontSize:"1.8rem", fontWeight:800, color:"var(--danger)"}}>{fmt(r.scrapCost)}</div>
                </div>
                {r.revenue > 0 && (
                  <div>
                    <div style={{fontSize:"0.72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4}}>% of Revenue</div>
                    <div style={{fontSize:"1.8rem", fontWeight:800, color:"var(--danger)"}}>
                      {fmtPct((r.scrapCost / r.revenue) * 100)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity summary */}
          <div className="card">
            <h2 style={{marginBottom:14}}>Activity Summary</h2>
            <div style={{display:"flex", gap:24, flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:"0.72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4}}>Builds Logged</div>
                <div style={{fontSize:"1.8rem", fontWeight:800, color:"var(--text)"}}>{r.builds}</div>
              </div>
            </div>
            {r.revenue === 0 && (
              <p style={{marginTop:12, fontSize:"0.82rem", color:"var(--text-muted)"}}>
                💡 Tip: Add a sale price to your products to start tracking revenue and profit.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
