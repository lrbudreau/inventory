import { useState } from "react";
import { apiPost } from "../auth";

export default function ChangePassword({ currentUser }) {
  const [form, setForm] = useState({ oldPassword:"", newPassword:"", confirm:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setMsg({ ok:false, text:"New passwords don't match." });
      return;
    }
    if (form.newPassword.length < 6) {
      setMsg({ ok:false, text:"Password must be at least 6 characters." });
      return;
    }
    setSaving(true);
    const res = await apiPost("users/changePassword", {
      id: currentUser.id,
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    });
    if (res.success) {
      setMsg({ ok:true, text:"Password changed successfully!" });
      setForm({ oldPassword:"", newPassword:"", confirm:"" });
    } else {
      setMsg({ ok:false, text: res.error || "Failed to change password." });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Change Password</h1>
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <form onSubmit={handleSubmit} className="inline-form">
          <div className="field">
            <label>Current Password</label>
            <input
              type="password"
              value={form.oldPassword}
              onChange={e => setForm({...form, oldPassword:e.target.value})}
              placeholder="Your current password"
              required
            />
          </div>
          <div className="field">
            <label>New Password</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={e => setForm({...form, newPassword:e.target.value})}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div className="field">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm({...form, confirm:e.target.value})}
              placeholder="Repeat new password"
              required
            />
          </div>
          {msg && <div className={`result-msg ${msg.ok ? "ok" : "fail"}`}>{msg.text}</div>}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
