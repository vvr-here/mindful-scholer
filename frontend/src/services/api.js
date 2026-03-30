/**
 * api.js — Central Axios client with JWT auth, error handling, and loading state helpers.
 *
 * All API calls go through this module so token management is consistent.
 * The auth token is stored in localStorage under the key "scholar_token".
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// ─── Token helpers ────────────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem("scholar_token");
export const setToken = (token) => localStorage.setItem("scholar_token", token);
export const clearToken = () => localStorage.removeItem("scholar_token");

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request(method, path, body = null) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method: method.toUpperCase(), headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);

  // Parse JSON regardless of status so we can read error messages
  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: res.statusText };
  }

  if (!res.ok) {
    // Attach the parsed server error for callers to surface
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  /** Register a new student. */
  register: (payload) => request("POST", "/auth/register", payload),

  /**
   * Login and automatically persist the JWT.
   * Returns the full { success, data: { token, user } } response.
   */
  async login(payload) {
    const res = await request("POST", "/auth/login", payload);
    if (res?.data?.token) setToken(res.data.token);
    return res;
  },

  /** Fetch the current authenticated user's profile. */
  me: () => request("GET", "/auth/me"),

  /** Remove the token from storage (client-side logout). */
  logout: () => clearToken(),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks = {
  /** Get all tasks. Pass { type: 'academic' | 'workout' } to filter. */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/tasks${qs ? `?${qs}` : ""}`);
  },

  /** Create a new task. payload: { title, type, date?, notes? } */
  create: (payload) => request("POST", "/tasks", payload),

  /** Update a task (or toggle completion). */
  update: (id, payload) => request("PUT", `/tasks/${id}`, payload),

  /** Delete a task. */
  remove: (id) => request("DELETE", `/tasks/${id}`),
};

// ─── Workouts ─────────────────────────────────────────────────────────────────

export const workouts = {
  /**
   * Generate a workout plan.
   * payload: { level: 'beginner' | 'intermediate' | 'advanced' }
   */
  generate: (payload) => request("POST", "/workouts/generate", payload),

  /** Fetch previously saved plans for the user. */
  plans: () => request("GET", "/workouts/plans"),

  /** Convert a saved plan into to-do tasks. */
  planToTasks: (planId) => request("POST", `/workouts/plans/${planId}/tasks`),
};

// ─── Match / Buddy Finder ─────────────────────────────────────────────────────

export const match = {
  /** Get metadata (valid subjects, levels, availability). */
  meta: () => request("GET", "/match/meta"),

  /** Get your own matching profile. */
  myProfile: () => request("GET", "/match/profile"),

  /**
   * Create / update your matching profile.
   * payload: { studySubjects, workoutLevel, bio?, availability? }
   */
  upsertProfile: (payload) => request("PUT", "/match/profile", payload),

  /**
   * Get ranked candidates.
   * params: { minScore?, limit?, explain? }
   */
  candidates: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/match/candidates${qs ? `?${qs}` : ""}`);
  },

  /** Score a specific candidate against the current user. */
  scoreUser: (userId) => request("GET", `/match/candidates/${userId}`),
};

// ─── Network / Connections ────────────────────────────────────────────────────

export const network = {
  /** Discover potential partners. */
  discover: () => request("GET", "/network/discover"),

  /** Send a connection request. payload: { targetUserId } */
  connect: (payload) => request("POST", "/network/connect", payload),

  /** Accept or decline a request. payload: { action: 'accept' | 'decline' } */
  respondToRequest: (requestId, payload) =>
    request("PUT", `/network/requests/${requestId}`, payload),

  /** List established connections. */
  connections: () => request("GET", "/network/connections"),
};
