/**
 * useWorkoutStore.js — Workout Plans slice (Zustand)
 *
 * State:
 *   plans           — SavedPlan[]       (fetched from GET /api/workouts/plans)
 *   activePlan      — Plan | null       (currently viewed / just generated)
 *   selectedLevel   — 'beginner' | 'intermediate' | 'advanced'
 *   status          — 'idle' | 'loading' | 'generating' | 'success' | 'error'
 *   error           — last error message
 *
 * Actions:
 *   fetchPlans()            — GET /api/workouts/plans
 *   generatePlan(level)     — POST /api/workouts/generate
 *   setActivePlan(plan)     — select a saved plan to display
 *   convertToTasks(planId)  — POST /api/workouts/plans/:id/tasks
 *   setLevel(level)         — update selectedLevel
 *   markExerciseDone(index) — local toggle for exercise completion
 *
 * Selectors:
 *   progressStats()         — { total, done, pct } for the activePlan
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { workouts as workoutsApi } from "../services/api";

const useWorkoutStore = create(
  devtools(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────
      plans:         [],
      activePlan:    null,
      selectedLevel: "beginner",
      status:        "idle",
      error:         null,

      // ── Selectors ─────────────────────────────────────────────────────
      progressStats: () => {
        const plan = get().activePlan ?? get().plans[0] ?? null;
        const exercises = plan?.exercises ?? plan?.routine ?? [];
        const done  = exercises.filter((e) => e.done).length;
        const total = exercises.length;
        const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
        return { total, done, pct, plan };
      },

      // ── Actions ────────────────────────────────────────────────────────

      fetchPlans: async () => {
        set({ status: "loading", error: null }, false, "workouts/fetchPlans/start");
        try {
          const res   = await workoutsApi.plans();
          const plans = res?.data?.plans ?? res?.data ?? [];
          set({ plans, status: "success" }, false, "workouts/fetchPlans/success");
        } catch (err) {
          set({ status: "error", error: err.message }, false, "workouts/fetchPlans/fail");
        }
      },

      generatePlan: async (level) => {
        set({ status: "generating", error: null }, false, "workouts/generate/start");
        try {
          const res  = await workoutsApi.generate({ level });
          const plan = res?.data?.plan ?? res?.data ?? null;
          set(
            (s) => ({
              activePlan: plan,
              // Prepend to saved plans if the server saved it
              plans: plan?._id ? [plan, ...s.plans.filter((p) => p._id !== plan._id)] : s.plans,
              status: "success",
            }),
            false,
            "workouts/generate/success"
          );
          return plan;
        } catch (err) {
          set({ status: "error", error: err.message }, false, "workouts/generate/fail");
          throw err;
        }
      },

      setActivePlan: (plan) =>
        set({ activePlan: plan }, false, "workouts/setActivePlan"),

      setLevel: (level) =>
        set({ selectedLevel: level }, false, "workouts/setLevel"),

      /**
       * markExerciseDone — Toggles a single exercise's `done` flag locally.
       * Does not call the API (exercise completion is local-only for now).
       */
      markExerciseDone: (index) =>
        set(
          (s) => {
            if (!s.activePlan) return {};
            const exercises = (s.activePlan.exercises ?? s.activePlan.routine ?? []).map(
              (ex, i) => (i === index ? { ...ex, done: !ex.done } : ex)
            );
            const key = s.activePlan.exercises ? "exercises" : "routine";
            return { activePlan: { ...s.activePlan, [key]: exercises } };
          },
          false,
          "workouts/markExerciseDone"
        ),

      convertToTasks: async (planId) => {
        try {
          const res = await workoutsApi.planToTasks(planId);
          return res;
        } catch (err) {
          set({ error: err.message }, false, "workouts/convertToTasks/fail");
          throw err;
        }
      },

      clearError: () => set({ error: null }, false, "workouts/clearError"),
    }),
    { name: "WorkoutStore" }
  )
);

export default useWorkoutStore;
