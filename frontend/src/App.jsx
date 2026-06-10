import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Parts from "./components/Parts";
import Build from "./components/Build";
import Orders from "./components/Orders";
import Customers from "./components/Customers";
import Vendors from "./components/Vendors";
import Purchases from "./components/Purchases";
import Users from "./components/Users";
import ChangePassword from "./components/ChangePassword";
import ActivityLog from "./components/ActivityLog";
import MoreMenu from "./components/MoreMenu";
import Settings from "./components/Settings";
import { saveSession, clearSession } from "./auth";
import { ToastContainer } from "./components/Toast";
import OfflineBar from "./components/OfflineBar";

// First 4 shown in mobile bottom nav, rest in "More"
const ADMIN_PRIMARY = [
  { id: "dashboard",   label: "Dashboard",  icon: "◈" },
  { id: "orders",      label: "Orders",     icon: "▦" },
  { id: "parts",       label: "Parts",      icon: "⬡" },
  { id: "build",       label: "Products",   icon: "⚙" },
];

const ADMIN_MORE = [
  { id: "purchases",   label: "Purchases",  icon: "↑" },
  { id: "vendors",     label: "Vendors",    icon: "◫" },
  { id: "customers",   label: "Customers",  icon: "◻" },
  { id: "activitylog", label: "Activity",   icon: "◷" },
  { id: "users",       label: "Users",      icon: "◉" },
  { id: "settings",    label: "Settings",   icon: "◬" },
];

const ADMIN_NAV = [...ADMIN_PRIMARY, ...ADMIN_MORE];

const BASIC_NAV = [
  { id: "dashboard",  label: "Dashboard", icon: "◈" },
  { id: "orders",     label: "Orders",    icon: "▦" },
  { id: "parts",      label: "Parts",     icon: "⬡" },
];

export default function App() {
  const [user, setUser] = useState(() => {
    try { const s = localStorage.getItem("fabtrack_user"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
  const [page, setPage] = useState("dashboard");

  function handleLogin(u) { saveSession(u); setUser(u); setPage("dashboard"); }
  function handleLogout() { clearSession(); setUser(null); setPage("dashboard"); }

  if (!user) return <Login onLogin={handleLogin} />;

  const isAdmin = user.roleName === "admin" || user.roleID === "admin";
  const nav = isAdmin ? ADMIN_NAV : BASIC_NAV;
  const adminPages = ["build","purchases","vendors","customers","activitylog","users","settings"];
  const safePage = (!isAdmin && adminPages.includes(page)) ? "dashboard" : page;

  return (
    <div className="app-shell">
      <ToastContainer />
      <OfflineBar />
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚙</span>
          <span className="brand-name">FabTrack</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map(n => (
            <button key={n.id} className={`nav-item ${safePage === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        {/* Mobile bottom nav — primary items + More menu */}
        <nav className="mobile-bottom-nav">
          {(isAdmin ? ADMIN_PRIMARY : BASIC_NAV).map(n => (
            <button key={n.id} className={`nav-item ${safePage === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
          {isAdmin && (
            <MoreMenu items={ADMIN_MORE} currentPage={safePage} onNavigate={setPage} />
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">{user.username?.[0]?.toUpperCase()}</span>
            <div>
              <div className="user-name">{user.username}</div>
              <div className="user-role">{isAdmin ? "Admin" : "Basic User"}</div>
            </div>
          </div>
          <button className="btn-change-pw" onClick={() => setPage("password")}>Change Password</button>
          <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-header">
          <div className="mobile-brand"><span>⚙</span><span>FabTrack</span></div>
          <div className="mobile-user">
            <span className="user-avatar" onClick={() => setPage("password")} style={{cursor:"pointer"}}>{user.username?.[0]?.toUpperCase()}</span>
            <button className="btn-logout" style={{width:"auto"}} onClick={handleLogout}>Out</button>
          </div>
        </div>

        {safePage === "dashboard"   && <Dashboard />}
        {safePage === "orders"      && <Orders currentUser={user} />}
        {safePage === "parts"       && <Parts readOnly={!isAdmin} />}
        {safePage === "build"       && isAdmin && <Build />}
        {safePage === "purchases"   && isAdmin && <Purchases currentUser={user} />}
        {safePage === "vendors"     && isAdmin && <Vendors />}
        {safePage === "customers"   && isAdmin && <Customers />}
        {safePage === "activitylog" && isAdmin && <ActivityLog />}
        {safePage === "users"       && isAdmin && <Users currentUser={user} />}
        {safePage === "settings"    && isAdmin && <Settings />}
        {safePage === "password"    && <ChangePassword currentUser={user} />}
      </main>
    </div>
  );
}
