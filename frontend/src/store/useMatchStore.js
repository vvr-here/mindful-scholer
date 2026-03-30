/**
 * useMatchStore.js — Buddy Finder / Matches slice (Zustand)
 *
 * State:
 *   meta            — { studySubjects, workoutLevels, availabilitySlots, weights }
 *   myProfile       — { studySubjects, workoutLevel, bio, availability } or null
 *   candidates      — MatchResult[]  (ranked list from GET /match/candidates)
 *   connections     — Connection[]   (established partners from GET /network/connections)
 *   sentRequests    — Set<userId>    (local tracking, so button shows "Sent")
 *   view            — 'discover' | 'profile'   (active sub-view in BuddyFinder)
 *   status          — 'idle' | 'loading' | 'saving' | 'success' | 'error'
 *   error           — last error message
 *
 * Actions:
 *   fetchMeta()                — GET /api/match/meta
 *   fetchMyProfile()           — GET /api/match/profile
 *   saveProfile(payload)       — PUT /api/match/profile  → auto-refresh candidates
 *   fetchCandidates(params?)   — GET /api/match/candidates
 *   fetchConnections()         — GET /api/network/connections
 *   sendConnect(userId)        — POST /api/network/connect  (optimistic sentRequests)
 *   setView(view)              — toggle 'discover' | 'profile'
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { match, network } from "../services/api";

const useMatchStore = create(
  devtools(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────
      meta:         null,
      myProfile:    null,
      candidates:   [],
      connections:  [],
      sentRequests: new Set(),
      view:         "discover",
      status:       "idle",
      error:        null,

      // ── Actions ────────────────────────────────────────────────────────

      fetchMeta: async () => {
        try {
          const res  = await match.meta();
          const data = res?.data ?? res;
          set({ meta: data }, false, "match/fetchMeta/success");
        } catch (err) {
          set({ error: err.message }, false, "match/fetchMeta/fail");
        }
      },

      fetchMyProfile: async () => {
        try {
          const res     = await match.myProfile();
          const profile = res?.data?.profile ?? res?.data ?? null;
          set({ myProfile: profile }, false, "match/fetchMyProfile/success");
        } catch (err) {
          // 404 just means no profile yet — not a real error
          if (err.status !== 404) set({ error: err.message }, false, "match/fetchMyProfile/fail");
        }
      },

      saveProfile: async (payload) => {
        set({ status: "saving", error: null }, false, "match/saveProfile/start");
        try {
          const res     = await match.upsertProfile(payload);
          const profile = res?.data?.profile ?? res?.data ?? payload;
          set({ myProfile: profile, status: "success" }, false, "match/saveProfile/success");
          // Auto-refresh candidates after profile changes
          await get().fetchCandidates({ limit: 20, explain: "true" });
          return profile;
        } catch (err) {
          set({ status: "error", error: err.message }, false, "match/saveProfile/fail");
          throw err;
        }
      },

      fetchCandidates: async (params = { limit: 20, explain: "true" }) => {
        set({ status: "loading", error: null }, false, "match/fetchCandidates/start");
        try {
          const res        = await match.candidates(params);
          const candidates = res?.data?.matches ?? res?.data ?? [];
          set({ candidates, status: "success" }, false, "match/fetchCandidates/success");
        } catch (err) {
          // If no profile exists the API returns 400 — surface a friendly message
          const msg = err.status === 400
            ? "Set up your profile to find matches."
            : err.message;
          set({ status: "error", error: msg }, false, "match/fetchCandidates/fail");
        }
      },

      fetchConnections: async () => {
        try {
          const res         = await network.connections();
          const connections = res?.data?.connections ?? res?.data ?? [];
          set({ connections }, false, "match/fetchConnections/success");
        } catch (err) {
          set({ error: err.message }, false, "match/fetchConnections/fail");
        }
      },

      sendConnect: async (userId) => {
        // Optimistically mark as sent immediately
        set(
          (s) => ({ sentRequests: new Set([...s.sentRequests, userId]) }),
          false,
          "match/sendConnect/optimistic"
        );
        try {
          await network.connect({ targetUserId: userId });
        } catch (err) {
          // Rollback only the specific userId on failure
          set(
            (s) => {
              const next = new Set(s.sentRequests);
              next.delete(userId);
              return { sentRequests: next, error: err.message };
            },
            false,
            "match/sendConnect/rollback"
          );
          throw err;
        }
      },

      setView: (view) => set({ view }, false, "match/setView"),

      clearError: () => set({ error: null }, false, "match/clearError"),
    }),
    { name: "MatchStore" }
  )
);

export default useMatchStore;
