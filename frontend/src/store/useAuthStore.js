/**
 * useAuthStore.js — User session slice (Zustand)
 *
 * State:
 *   user          — authenticated user object or null
 *   token         — JWT string or null
 *   status        — 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
 *   error         — last auth error message
 *
 * Actions:
 *   bootstrap()   — on app mount: read token from localStorage, call GET /auth/me
 *   login(creds)  — POST /auth/login, persist token
 *   register(data)— POST /auth/register then auto-login
 *   logout()      — clear token + reset state
 *   updateUser(p) — merge partial user updates (e.g. after profile edit)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { auth as authApi, getToken, setToken, clearToken } from "../services/api";

const useAuthStore = create(
  devtools(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────
      user:   null,
      token:  null,
      status: "idle",   // 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
      error:  null,

      // ── Derived (computed via selectors, not stored) ───────────────────
      isAuthenticated: () => get().status === "authenticated",

      // ── Actions ────────────────────────────────────────────────────────

      /**
       * bootstrap — Called once on app mount.
       * Reads the persisted JWT, then validates it by calling GET /api/auth/me.
       */
      bootstrap: async () => {
        const stored = getToken();
        if (!stored) {
          set({ status: "unauthenticated" }, false, "auth/bootstrap/noToken");
          return;
        }
        set({ status: "loading", token: stored }, false, "auth/bootstrap/start");
        try {
          const res = await authApi.me();
          const user = res?.data?.user ?? res?.data ?? null;
          set({ user, status: "authenticated" }, false, "auth/bootstrap/success");
        } catch {
          clearToken();
          set({ user: null, token: null, status: "unauthenticated" }, false, "auth/bootstrap/fail");
        }
      },

      /**
       * login — Authenticates existing user.
       * On success: persists JWT, stores user in state.
       * Throws on failure so the UI can catch and display the error.
       */
      login: async ({ email, password }) => {
        set({ status: "loading", error: null }, false, "auth/login/start");
        try {
          const res = await authApi.login({ email, password });
          const token = res?.data?.token ?? null;
          const user  = res?.data?.user  ?? null;
          if (token) setToken(token);
          set({ user, token, status: "authenticated", error: null }, false, "auth/login/success");
          return user;
        } catch (err) {
          set({ status: "error", error: err.message }, false, "auth/login/fail");
          throw err;
        }
      },

      /**
       * register — Creates account then auto-logs in.
       */
      register: async ({ name, email, password }) => {
        set({ status: "loading", error: null }, false, "auth/register/start");
        try {
          await authApi.register({ name, email, password });
          return await get().login({ email, password });
        } catch (err) {
          set({ status: "error", error: err.message }, false, "auth/register/fail");
          throw err;
        }
      },

      /**
       * logout — Clears token from storage and resets all auth state.
       */
      logout: () => {
        clearToken();
        set({ user: null, token: null, status: "unauthenticated", error: null }, false, "auth/logout");
      },

      /**
       * updateUser — Merge a partial user object (e.g. after a profile save).
       */
      updateUser: (partial) =>
        set(
          (state) => ({ user: state.user ? { ...state.user, ...partial } : partial }),
          false,
          "auth/updateUser"
        ),
    }),
    { name: "AuthStore" }
  )
);

export default useAuthStore;
