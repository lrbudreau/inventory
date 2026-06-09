import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../auth";

const LOGO_URL = "https://cdn.shopify.com/oxygen-v2/30746/18450/38098/3736725/logo.png?width=300&crop=center";

export default function Settings() {
  const [form, setForm] = useState({
    companyName: "",
    companyAddress: "",
    companyCity: "",
    companyPhone: "",
    companyEmail: "",
    companyWebsite: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    async function load() {
      const s = await apiGet("settings");
      if (s) {
        setForm({
          companyName:    s.companyName    || "",
          companyAddress: s.companyAddress || "",
          companyCity:    s.companyCity    || "",
          companyPhone:   s.companyPhone   || "",
          companyEmail:   s.companyEmail   || "",
          companyWebsite: s.companyWebsite || "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const res = await apiPost("settings/save", form);
    if (res.success) {
      setMsg({ ok: true, text: "Settings saved!" });
    } else {
      setMsg({ ok: false, text: res.error || "Failed to save." });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  }

  function f(field) { return e => setForm({ ...form, [field]: e.target.value }); }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* Logo Preview */}
      <div className="card settings-logo-card">
        <h2>Company Logo</h2>
        <img src={LOGO_URL} alt="Holscher Products Inc" className="settings-logo" />
        <p className="hint" style={{marginTop:8}}>Logo is used on printed invoices. To change it, update the URL in the source code.</p>
      </div>

      {/* Company Info */}
      <div className="card">
        <h2>Company Info</h2>
        {loading ? <p className="loading">Loading…</p> : (
          <form onSubmit={handleSave} className="inline-form">
            <div className="field">
              <label>Company Name</label>
              <input value={form.companyName} onChange={f("companyName")} placeholder="Holscher Products Inc" />
            </div>
            <div className="field">
              <label>Street Address</label>
              <input value={form.companyAddress} onChange={f("companyAddress")} placeholder="123 Main St." />
            </div>
            <div className="field">
              <label>City, State ZIP</label>
              <input value={form.companyCity} onChange={f("companyCity")} placeholder="Indianapolis, IN 46202" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="tel" value={form.companyPhone} onChange={f("companyPhone")} placeholder="555-555-5555" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.companyEmail} onChange={f("companyEmail")} placeholder="info@holscherproducts.com" />
            </div>
            <div className="field">
              <label>Website</label>
              <input type="url" value={form.companyWebsite} onChange={f("companyWebsite")} placeholder="https://holscherproducts.com" />
            </div>
            {msg && <div className={`result-msg ${msg.ok ? "ok" : "fail"}`}>{msg.text}</div>}
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
