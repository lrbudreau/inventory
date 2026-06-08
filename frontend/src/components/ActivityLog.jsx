import { useEffect, useState } from "react";
import { apiGet } from "../auth";

export default function ActivityLog() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function load() {
      const l = await apiGet("activityLog");
      setLog(Array.isArray(l) ? l : []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = log.filter(l =>
    !filter ||
    l.username?.toLowerCase().includes(filter.toLowerCase()) ||
    l.action?.toLowerCase().includes(filter.toLowerCase()) ||
    l.details?.toLowerCase().includes(filter.toLowerCase())
  );

  function actionBadge(action) {
    if (action === "build") return "badge-active";
    if (action === "delete") return "badge-danger";
    return "badge-ok";
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Activity Log</h1>
      </div>
      <div className="search-bar">
        <input className="search-input full-width" placeholder="Filter by user, action, details…" value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <div className="card no-pad">
        {loading ? <p className="loading pad">Loading…</p> : (
          <ul className="item-list">
            {filtered.map(l => (
              <li key={l.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">{l.details}</span>
                  <span className="item-sub">{l.timestamp} · {l.username}</span>
                </div>
                <div className="item-right">
                  <span className={`badge ${actionBadge(l.action)}`}>{l.action}</span>
                </div>
              </li>
            ))}
            {filtered.length === 0 && <li className="empty pad">No activity recorded yet.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
