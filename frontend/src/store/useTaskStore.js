/**
 * useTaskStore.js — Tasks slice (Zustand)
 *
 * State:
 *   tasks         — Task[]
 *   status        — 'idle' | 'loading' | 'error' | 'success'
 *   error         — last error message
 *   filter        — '' | 'academic' | 'workout'  (active filter)
 *
 * Actions:
 *   fetchTasks(type?)   — GET /api/tasks  (type: optional filter)
 *   addTask(payload)    — POST /api/tasks      (optimistic)
 *   toggleTask(task)    — PUT  /api/tasks/:id  (optimistic)
 *   updateTask(id, d)   — PUT  /api/tasks/:id
 *   removeTask(id)      — DELETE /api/tasks/:id (optimistic)
 *   setFilter(type)     — local filter change; triggers re-fetch
 *
 * Selectors (use outside the store):
 *   filteredTasks()     — tasks filtered by current filter
 *   todayStats()        — { total, completed, pct }
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { tasks as tasksApi } from "../services/api";

const useTaskStore = create(
  devtools(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────
      tasks:  [],
      status: "idle",
      error:  null,
      filter: "",

      // ── Selectors (called as functions) ───────────────────────────────
      filteredTasks: () => {
        const { tasks, filter } = get();
        return filter ? tasks.filter((t) => t.type === filter) : tasks;
      },

      todayStats: () => {
        const { tasks } = get();
        const total     = tasks.length;
        const completed = tasks.filter((t) => t.completed).length;
        const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, pct };
      },

      // ── Actions ────────────────────────────────────────────────────────

      fetchTasks: async (type) => {
        set({ status: "loading", error: null }, false, "tasks/fetch/start");
        try {
          const params = type ? { type } : {};
          const res    = await tasksApi.list(params);
          const tasks  = res?.data?.tasks ?? res?.data ?? [];
          set({ tasks, status: "success" }, false, "tasks/fetch/success");
        } catch (err) {
          set({ status: "error", error: err.message }, false, "tasks/fetch/fail");
        }
      },

      addTask: async (payload) => {
        // Optimistic insert with a temp id
        const tempId = `temp-${Date.now()}`;
        const optimistic = { ...payload, _id: tempId, completed: false, createdAt: new Date().toISOString() };
        set((s) => ({ tasks: [optimistic, ...s.tasks] }), false, "tasks/add/optimistic");

        try {
          const res     = await tasksApi.create(payload);
          const created = res?.data?.task ?? res?.data ?? optimistic;
          // Replace temp with real
          set(
            (s) => ({ tasks: s.tasks.map((t) => (t._id === tempId ? created : t)) }),
            false,
            "tasks/add/success"
          );
          return created;
        } catch (err) {
          // Roll back
          set(
            (s) => ({ tasks: s.tasks.filter((t) => t._id !== tempId), error: err.message }),
            false,
            "tasks/add/rollback"
          );
          throw err;
        }
      },

      toggleTask: async (task) => {
        const id      = task._id ?? task.id;
        const toggled = !task.completed;
        // Optimistic update
        set(
          (s) => ({ tasks: s.tasks.map((t) => ((t._id ?? t.id) === id ? { ...t, completed: toggled } : t)) }),
          false,
          "tasks/toggle/optimistic"
        );
        try {
          await tasksApi.update(id, { completed: toggled });
        } catch (err) {
          // Revert
          set(
            (s) => ({ tasks: s.tasks.map((t) => ((t._id ?? t.id) === id ? { ...t, completed: !toggled } : t)) }),
            false,
            "tasks/toggle/rollback"
          );
        }
      },

      updateTask: async (id, data) => {
        set(
          (s) => ({ tasks: s.tasks.map((t) => ((t._id ?? t.id) === id ? { ...t, ...data } : t)) }),
          false,
          "tasks/update/optimistic"
        );
        try {
          const res     = await tasksApi.update(id, data);
          const updated = res?.data?.task ?? res?.data;
          if (updated) {
            set(
              (s) => ({ tasks: s.tasks.map((t) => ((t._id ?? t.id) === id ? updated : t)) }),
              false,
              "tasks/update/success"
            );
          }
        } catch (err) {
          set({ error: err.message }, false, "tasks/update/error");
          throw err;
        }
      },

      removeTask: async (id) => {
        const prev = get().tasks;
        set(
          (s) => ({ tasks: s.tasks.filter((t) => (t._id ?? t.id) !== id) }),
          false,
          "tasks/remove/optimistic"
        );
        try {
          await tasksApi.remove(id);
        } catch (err) {
          set({ tasks: prev, error: err.message }, false, "tasks/remove/rollback");
          throw err;
        }
      },

      setFilter: (filter) => {
        set({ filter }, false, "tasks/setFilter");
        get().fetchTasks(filter || undefined);
      },

      clearError: () => set({ error: null }, false, "tasks/clearError"),
    }),
    { name: "TaskStore" }
  )
);

export default useTaskStore;
