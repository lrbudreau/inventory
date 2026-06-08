import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";
import { DeleteIcon, CloseIcon } from "./Icons";

export default function Users({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username:"", email:"", password:"", roleID:"basicUser" });
  const [msg, setMsg] = useState(null);

  async function load() {
    const u = await apiGet("users");
    setUsers(Array.isArray(u) ? u : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    const res = await apiPost("users/create", form);
    if (res.success) {
      setShowAdd(false);
      setForm({ username:"", email:"", password:"", roleID:"basicUser" });
      setMsg({ ok:true, text:"User created!" });
      await load();
    } else {
      setMsg({ ok:false, text: res.error || "Failed to create user." });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleDelete(user) {
    if (user.id === currentUser.id) return;
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
      setMsg({ ok:true, text:`Password reset for ${resetUser.username}.` });
      setResetUser(null);
      setNewPassword("");
    } else {
      setMsg({ ok:false, text: res.error || "Reset failed." });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Users</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add User</button>
      </div>

      {msg && <div className={`result-msg ${msg.ok ? "ok" : "fail"}`}>{msg.text}</div>}

      {/* Add User Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New User</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleAdd} className="inline-form">
              <div className="field">
                <label>Username</label>
                <input value={form.username} onChange={e => setForm({...form,username:e.target.value})} placeholder="jsmith" required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="jsmith@email.com" />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="Temporary password" required />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={form.roleID} onChange={e => setForm({...form,roleID:e.target.value})}>
                  <option value="basicUser">Basic User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Create User"}</button>
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
              <div className="field">
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" required />
              </div>
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

      <div className="card no-pad">
        {loading ? <p className="loading pad">Loading…</p> : (
          <ul className="item-list">
            {users.map(u => (
              <li key={u.id} className="item-row">
                <div className="item-main">
                  <span className="item-name">
                    {u.username}
                    {u.id === currentUser.id && <span className="you-badge">you</span>}
                  </span>
                  <span className="item-sub">{u.email || "—"}</span>
                </div>
                <div className="item-right">
                  <span className={`badge ${u.roleID === "admin" ? "badge-warn" : "badge-active"}`}>
                    {u.roleID === "admin" ? "Admin" : "Basic"}
                  </span>
                  <button className="btn-icon" onClick={() => setResetUser(u)} title="Reset password">🔑</button>
                  {u.id !== currentUser.id && (
                    <button className="btn-icon" onClick={() => setConfirmDelete(u)}><DeleteIcon /></button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
