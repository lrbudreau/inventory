import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Parts from "./components/Parts";
import Build from "./components/Build";
import Orders from "./components/Orders";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "orders",    label: "Orders",    icon: "📋" },
  { id: "parts",     label: "Parts",     icon: "⬡" },
  { id: "build",     label: "Build",     icon: "⚙" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚙</span>
          <span className="brand-name">FabTrack</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">{user.username?.[0]?.toUpperCase()}</span>
            <span className="user-name">{user.username}</span>
          </div>
          <button className="btn-logout" onClick={() => setUser(null)}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-header">
          <div className="mobile-brand">
            <span>⚙</span>
            <span>FabTrack</span>
          </div>
          <div className="mobile-user">
            <span className="user-avatar">{user.username?.[0]?.toUpperCase()}</span>
            <button className="btn-logout" style={{width:"auto"}} onClick={() => setUser(null)}>Out</button>
          </div>
        </div>
        {page === "dashboard" && <Dashboard />}
        {page === "orders"    && <Orders />}
        {page === "parts"     && <Parts />}
        {page === "build"     && <Build />}
      </main>
    </div>
  );
}
