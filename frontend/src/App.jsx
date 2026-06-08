import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Parts from "./components/Parts";
import Build from "./components/Build";
import Orders from "./components/Orders";
import Companies from "./components/Companies";
import Vendors from "./components/Vendors";
import Purchases from "./components/Purchases";
import Users from "./components/Users";
import ChangePassword from "./components/ChangePassword";

const ADMIN_NAV = [
  { id: "dashboard",  label: "Dashboard", icon: "◈" },
  { id: "orders",     label: "Orders",    icon: "▦" },
  { id: "parts",      label: "Parts",     icon: "⬡" },
  { id: "build",      label: "Products",  icon: "⚙" },
  { id: "purchases",  label: "Restock",   icon: "↑" },
  { id: "vendors",    label: "Vendors",   icon: "◫" },
  { id: "companies",  label: "Companies", icon: "◻" },
  { id: "users",      label: "Users",     icon: "◉" },
];

const BASIC_NAV = [
  { id: "dashboard",  label: "Dashboard", icon: "◈" },
  { id: "orders",     label: "Orders",    icon: "▦" },
  { id: "parts",      label: "Parts",     icon: "⬡" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  if (!user) return <Login onLogin={(u) => { setUser(u); setPage("dashboard"); }} />;

  const isAdmin = user.roleName === "admin" || user.roleID === "admin";
  const nav = isAdmin ? ADMIN_NAV : BASIC_NAV;

  // Redirect if basicUser tries to access admin page
  const safePage = (!isAdmin && !["dashboard","orders","parts","password"].includes(page))
    ? "dashboard"
    : page;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚙</span>
          <span className="brand-name">FabTrack</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map(n => (
            <button
              key={n.id}
              className={`nav-item ${safePage === n.id ? "active" : ""}`}
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
            <div>
              <div className="user-name">{user.username}</div>
              <div className="user-role">{user.roleName === "admin" || user.roleID === "admin" ? "Admin" : "Basic User"}</div>
            </div>
          </div>
          <button className="btn-change-pw" onClick={() => setPage("password")}>Change Password</button>
          <button className="btn-logout" onClick={() => { setUser(null); setPage("dashboard"); }}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-header">
          <div className="mobile-brand">
            <span>⚙</span>
            <span>FabTrack</span>
          </div>
          <div className="mobile-user">
            <span className="user-avatar" onClick={() => setPage("password")} title="Change password" style={{cursor:"pointer"}}>
              {user.username?.[0]?.toUpperCase()}
            </span>
            <button className="btn-logout" style={{width:"auto"}} onClick={() => { setUser(null); setPage("dashboard"); }}>Out</button>
          </div>
        </div>

        {safePage === "dashboard"  && <Dashboard />}
        {safePage === "orders"     && <Orders />}
        {safePage === "parts"      && <Parts readOnly={!isAdmin} />}
        {safePage === "build"      && isAdmin && <Build />}
        {safePage === "purchases"  && isAdmin && <Purchases />}
        {safePage === "vendors"    && isAdmin && <Vendors />}
        {safePage === "companies"  && isAdmin && <Companies />}
        {safePage === "users"      && isAdmin && <Users currentUser={user} />}
        {safePage === "password"   && <ChangePassword currentUser={user} />}
      </main>
    </div>
  );
}
