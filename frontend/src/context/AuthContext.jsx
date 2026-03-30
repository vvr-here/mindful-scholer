/**
 * AuthContext.jsx — Global authentication context.
 *
 * Provides: { user, loading, login, logout, isAuthenticated }
 * to the entire application tree.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, getToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true on first load to check token

  // On mount, if a token exists, fetch the current user profile
  useEffect(() => {
    const bootstrap = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await auth.me();
        setUser(res?.data?.user ?? res?.data ?? null);
      } catch {
        // Token is invalid or expired — clear it
        auth.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await auth.login(credentials);
    const userData = res?.data?.user ?? null;
    setUser(userData);
    return res;
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook: const { user, login, logout } = useAuth(); */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
