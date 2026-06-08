import { useState } from "react";
import { apiGet, apiPost } from "../auth";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("login", { username, password });
      if (res.success) {
        onLogin(res);
      } else if (res.pending) {
        setError("Your account is pending admin approval. Please check back soon.");
      } else {
        setError("Invalid username or password.");
      }
    } catch (err) {
      setError("Could not connect. Try again.");
    }
    setLoading(false);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost("users/signup", { username, password, email });
      if (res.success) {
        setSuccess("Account requested! An admin will approve your account shortly.");
        setMode("login");
        setUsername("");
        setPassword("");
        setConfirm("");
        setEmail("");
      } else {
        setError(res.error || "Sign up failed. Try again.");
      }
    } catch (err) {
      setError("Could not connect. Try again.");
    }
    setLoading(false);
  }

  function switchMode(m) {
    setMode(m);
    setError("");
    setSuccess("");
    setUsername("");
    setPassword("");
    setConfirm("");
    setEmail("");
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <span className="logo-icon">⚙</span>
          <h1>FabTrack</h1>
          <p>Parts &amp; Production Management</p>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>Sign In</button>
          <button className={`login-tab ${mode === "signup" ? "active" : ""}`} onClick={() => switchMode("signup")}>Request Access</button>
        </div>

        {success && <div className="success-msg">{success}</div>}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="login-form">
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required autoFocus />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="login-form">
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" required autoFocus />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Submitting…" : "Request Access"}
            </button>
            <p className="signup-note">An admin will review and approve your request.</p>
          </form>
        )}
      </div>
    </div>
  );
}
