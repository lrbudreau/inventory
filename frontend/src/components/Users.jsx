import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { DeleteIcon, CloseIcon } from "./Icons";

export default function Users({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [approveUser, setApproveUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [approveRole, setApproveRole] = useState("basicUser");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username:"", email:"", password:"", roleID:"basicUser" });
  const [msg, setMsg] = useState(null);

  async function load() {
    const u = await apiGet("users");
    setUsers(Array.isArray(u) ? u : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function showMsg(ok, text) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    const res = await apiPost("users/create", form);
    if (res.success) {
      setShowAdd(false);
      setForm({ username:"", email:"", password:"", roleID:"basicUser" });
      showMsg(true, "User created!");
      await load();
    } else {
      showMsg(false, res.error || "Failed to create user.");
    }
    setSaving(false);
  }

  async function handleDelete(user) {
    setSaving(true);
    await apiPost("users/delete", { id: user.id });
    setConfirmDelete(null);
    await load();
    setSaving(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setSaving(true);
    const res = await apiPost("users/resetPassword", { id: resetUser.id, newPassword });
    if (res.success) {
      showMsg(true, `Password reset for ${resetUser.username}.`);
      setResetUser(null);
      setNewPassword("");
    } else {
      showMsg(false, res.error || "Reset failed.");
    }
    setSaving(false);
  }

  async function handleApprove(e) {
    e.preventDefault();
    setSaving(true);
    const res = await apiPost("users/approve", { id: approveUser.id, roleName: approveRole });
    if (res.success) {
      showMsg(true, `${approveUser.username} approved as ${approveRole}!`);
      setApproveUser(null);
    } else {
      showMsg(false, res.error || "Approval failed.");
    }
    await load();
    setSaving(false);
  }

  const pendingUsers = users.filter(u => u.roleName === "pending");
  const activeUsers = users.filter(u => u.roleName !== "pending");

  function roleBadge(roleName) {
    if (roleName === "admin") return "badge-warn";
    if (roleName === "pending") return "badge-danger";
    return "badge-active";
  }

  function roleLabel(roleName) {
    if (roleName === "admin") return "Admin";
    if (roleName === "pending") return "Pending";
    return "Basic";
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Users {pendingUsers.length > 0 && <span className="pending-count">{pendingUsers.length}</span>}</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add</button>
      </div>

      {msg && <div className={`result-msg ${msg.ok ? "ok" : "fail"}`}>{msg.text}</div>}

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div className="card alert-card no-pad" style={{marginBottom:14}}>
          <div style={{padding:"12px 16px 4px"}}><h2 style={{color:"var(--warn)"}}>⏳ Pending Approval</h2></div>
          <ul className="item-list">
            {pendingUsers.map(u => (
              <li key={u.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">{u.username}</span>
                  <span className="item-sub">{u.email || "No email"}</span>
                </div>
                <div className="item-right">
                  <button className="btn-approve" onClick={() => { setApproveUser(u); setApproveRole("basicUser"); }}>Approve</button>
                  <button className="btn-icon" onClick={() => setConfirmDelete(u)}><DeleteIcon /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Users */}
      <div className="card no-pad">
        {loading ? <p className="loading pad">Loading…</p> : (
          <ul className="item-list">
            {activeUsers.map(u => (
              <li key={u.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">
                    {u.username}
                    {u.id == currentUser.id && <span className="you-badge">you</span>}
                  </span>
                  <span className="item-sub">{u.email || "—"}</span>
                </div>
                <div className="item-right">
                  <span className={`badge ${roleBadge(u.roleName)}`}>{roleLabel(u.roleName)}</span>
                  <button className="btn-icon" onClick={() => { setResetUser(u); setNewPassword(""); }} title="Reset password">🔑</button>
                  {u.id != currentUser.id && (
                    <button className="btn-icon" onClick={() => setConfirmDelete(u)}><DeleteIcon /></button>
                  )}
                </div>
              </li>
            ))}
            {activeUsers.length === 0 && <li className="empty pad">No active users.</li>}
          </ul>
        )}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New User</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleAdd} className="inline-form">
              <div className="field"><label>Username</label><input value={form.username} onChange={e => setForm({...form,username:e.target.value})} placeholder="jsmith" required /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="jsmith@email.com" /></div>
              <div className="field"><label>Password</label><input type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="Temporary password" required /></div>
              <div className="field">
                <label>Role</label>
                <select value={form.roleID} onChange={e => setForm({...form,roleID:e.target.value})}>
                  <option value="basicUser">Basic User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveUser && (
        <div className="modal-overlay" onClick={() => setApproveUser(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Approve User</h2>
              <button className="modal-close" onClick={() => setApproveUser(null)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleApprove} className="inline-form">
              <p className="confirm-text">Approve <strong>{approveUser.username}</strong> and assign a role.</p>
              <div className="field">
                <label>Role</label>
                <select value={approveRole} onChange={e => setApproveRole(e.target.value)}>
                  <option value="basicUser">Basic User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setApproveUser(null)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Approving…" : "Approve"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="modal-overlay" onClick={() => setResetUser(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button className="modal-close" onClick={() => setResetUser(null)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleReset} className="inline-form">
              <p className="confirm-text">Set a new password for <strong>{resetUser.username}</strong>.</p>
              <div className="field"><label>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" required /></div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setResetUser(null)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Reset"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Delete User?</h2>
            <p className="confirm-text">Delete <strong>{confirmDelete.username}</strong>? This cannot be undone.</p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
