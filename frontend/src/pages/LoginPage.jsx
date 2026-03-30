/**
 * LoginPage.jsx — Authentication page backed by useAuthStore
 */

import React, { useState } from "react";
import { useAuthStore } from "../store";

export default function LoginPage({ onSuccess }) {
  const login    = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const storeErr = useAuthStore((s) => s.error);

  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register({ name, email, password });
      } else {
        await login({ email, password });
      }
      onSuccess();
    } catch (err) {
      setError(err.message || storeErr || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-icon material-symbols-rounded">school</span>
          <h1 className="brand-name">The Mindful Scholar</h1>
          <p className="brand-sub">Your academic &amp; fitness companion</p>
        </div>

        <div className="auth-tabs">
          <button
            id="tab-login"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Login
          </button>
          <button
            id="tab-register"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name" type="text" className="text-input"
                placeholder="Alex Rivers" value={name}
                onChange={(e) => setName(e.target.value)} required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email" type="email" className="text-input"
              placeholder="you@university.edu" value={email}
              onChange={(e) => setEmail(e.target.value)} required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password" type="password" className="text-input"
              placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6}
            />
          </div>

          {error && (
            <div className="error-banner inline" role="alert">
              <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>error</span>
              {error}
            </div>
          )}

          <button id="auth-submit-btn" type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? <span className="spinner" /> : (mode === "login" ? "Sign In" : "Create Account")}
          </button>
        </form>
      </div>
    </div>
  );
}
