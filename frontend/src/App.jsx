import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Parts from "./components/Parts";
import Build from "./components/Build";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "parts", label: "Parts", icon: "⬡" },
  { id: "build", label: "Build", icon: "⚙" },
  ];

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState("dashboard");

  if (!user) return <Login onLogin={setUser} />;

  return (
        <div className="app-shell">
              <aside className="sidebar">
                      <div className="sidebar-brand">
                                <span className="brand-icon">⚙</span>span>
                                <span className="brand-name">FabTrack</span>span>
                      </div>div>
                      <nav className="sidebar-nav">
                        {NAV.map((n) => (
                      <button
                                      key={n.id}
                                      className={`nav-item ${page === n.id ? "active" : ""}`}
                                      onClick={() => setPage(n.id)}
                                    >
                                    <span className="nav-icon">{n.icon}</span>span>
                                    <span className="nav-label">{n.label}</span>span>
                      </button>button>
                    ))}
                      </nav>nav>
                      <div className="sidebar-footer">
                                <div className="user-info">
                                            <span className="user-avatar">{user.username?.[0]?.toUpperCase()}</span>span>
                                            <span className="user-name">{user.username}</span>span>
                                </div>div>
                                <button className="btn-logout" onClick={() => setUser(null)}>Sign Out</button>button>
                      </div>div>
              </aside>aside>
        
              <main className="main-content">
                {page === "dashboard" && <Dashboard />}
                {page === "parts" && <Parts />}
                {page === "build" && <Build />}
              </main>main>
        </div>div>
      );
}</div>
