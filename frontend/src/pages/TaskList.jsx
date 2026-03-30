/**
 * TaskList.jsx — Focus Hub backed by useTaskStore
 */

import React, { useEffect, useState } from "react";
import { useTaskStore } from "../store";
import SkeletonCard from "../components/SkeletonCard";
import ErrorBanner  from "../components/ErrorBanner";
import BottomNav    from "../components/BottomNav";

const FILTERS = [
  { key: "",         label: "All"      },
  { key: "academic", label: "Academic" },
  { key: "workout",  label: "Workout"  },
];

export default function TaskList({ onNavigate }) {
  // Store slices
  const status       = useTaskStore((s) => s.status);
  const error        = useTaskStore((s) => s.error);
  const filter       = useTaskStore((s) => s.filter);
  const setFilter    = useTaskStore((s) => s.setFilter);
  const fetchTasks   = useTaskStore((s) => s.fetchTasks);
  const addTask      = useTaskStore((s) => s.addTask);
  const toggleTask   = useTaskStore((s) => s.toggleTask);
  const removeTask   = useTaskStore((s) => s.removeTask);
  const filteredTasks = useTaskStore((s) => s.filteredTasks);
  const todayStats   = useTaskStore((s) => s.todayStats);

  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType,  setNewType]  = useState("academic");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTasks(filter || undefined);
  }, []);  // only on mount; setFilter triggers re-fetch internally

  const { total, completed, pct } = todayStats();
  const tasks = filteredTasks();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await addTask({ title: newTitle, type: newType });
      setNewTitle("");
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  const academicTasks = tasks.filter((t) => t.type === "academic");
  const workoutTasks  = tasks.filter((t) => t.type === "workout");

  return (
    <div className="app-shell">
      <header className="page-header">
        <button className="icon-btn" onClick={() => onNavigate("home")}>
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="page-title">Focus Hub</h1>
        <button className="icon-btn" onClick={() => setShowForm(true)} aria-label="Add task">
          <span className="material-symbols-rounded">add_circle</span>
        </button>
      </header>

      <main className="page-content">
        {/* ── Stats Bar ── */}
        <section className="card stats-bar">
          <div>
            <p className="label">Completed Today</p>
            <h2 className="display-num">
              {completed} <span className="of-total">/ {total}</span>
            </h2>
          </div>
          <div className="progress-wrap">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="pct-label">{pct}%</p>
          </div>
        </section>

        {/* ── Filter Pills ── */}
        <div className="filter-row" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={`filter-pill ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Add Task Form ── */}
        {showForm && (
          <form className="card add-form" onSubmit={handleCreate}>
            <input
              id="task-title-input"
              className="text-input"
              placeholder="Task title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <div className="form-row">
              <select
                id="task-type-select"
                className="select-input"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                <option value="academic">Academic</option>
                <option value="workout">Workout</option>
              </select>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Saving…" : "Add"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {status === "loading" && <SkeletonCard count={5} />}
        {error && <ErrorBanner message={error} onRetry={() => fetchTasks(filter || undefined)} />}

        {status !== "loading" && (
          <>
            {(filter === "" || filter === "academic") && (
              <section className="section-block">
                <h2 className="section-title">Academic</h2>
                {academicTasks.length === 0 && (
                  <p className="empty-state">No academic tasks. Add one above!</p>
                )}
                {academicTasks.map((task) => (
                  <TaskRow
                    key={task._id ?? task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={removeTask}
                  />
                ))}
              </section>
            )}

            {(filter === "" || filter === "workout") && (
              <section className="section-block">
                <h2 className="section-title">Workouts</h2>
                {workoutTasks.length === 0 && (
                  <p className="empty-state">No workout tasks. Generate a plan!</p>
                )}
                {workoutTasks.map((task) => (
                  <TaskRow
                    key={task._id ?? task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={removeTask}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav active="tasks" onNavigate={onNavigate} />
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }) {
  return (
    <div className={`task-row ${task.completed ? "done" : ""}`}>
      <button className="icon-btn" onClick={() => onToggle(task)} aria-label="Toggle">
        <span className="material-symbols-rounded task-check">
          {task.completed ? "check_circle" : "radio_button_unchecked"}
        </span>
      </button>
      <div className="task-body">
        <span className="task-title">{task.title}</span>
        {task.notes && <p className="task-notes">{task.notes}</p>}
      </div>
      <span className={`task-chip ${task.type === "workout" ? "chip-workout" : "chip-academic"}`}>
        {task.type}
      </span>
      <button
        className="icon-btn danger"
        onClick={() => onDelete(task._id ?? task.id)}
        aria-label="Delete"
      >
        <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>delete</span>
      </button>
    </div>
  );
}
