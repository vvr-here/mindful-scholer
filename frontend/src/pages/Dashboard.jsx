/**
 * Dashboard.jsx — Home screen backed by Zustand stores
 *
 * Reads from:  useAuthStore  → user greeting
 *              useTaskStore  → today's task stats + preview rows
 *              useMatchStore → connections (study buddies feed)
 */

import React, { useEffect } from "react";
import { useAuthStore, useTaskStore, useMatchStore } from "../store";
import SkeletonCard from "../components/SkeletonCard";
import ErrorBanner  from "../components/ErrorBanner";
import BottomNav    from "../components/BottomNav";

export default function Dashboard({ onNavigate }) {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Task store
  const tasks      = useTaskStore((s) => s.tasks);
  const taskStatus = useTaskStore((s) => s.status);
  const taskError  = useTaskStore((s) => s.error);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const todayStats = useTaskStore((s) => s.todayStats);

  // Match / connections store
  const connections      = useMatchStore((s) => s.connections);
  const fetchConnections = useMatchStore((s) => s.fetchConnections);

  useEffect(() => {
    fetchTasks();
    fetchConnections();
  }, [fetchTasks, fetchConnections]);

  const { total, completed, pct } = todayStats();

  const academicTasks = tasks.filter((t) => t.type === "academic").slice(0, 3);
  const workoutTasks  = tasks.filter((t) => t.type === "workout").slice(0, 2);
  const buddies       = connections.slice(0, 3);

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="user-meta">
          <div className="avatar">{(user?.name ?? "A")[0].toUpperCase()}</div>
          <div>
            <p className="greeting">Good morning,</p>
            <h1 className="username">{user?.name ?? "Scholar"}</h1>
            <span className="badge">
              Level {user?.level ?? 12} Scholar · {user?.xp ?? 420} XP
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="icon-btn"
            onClick={() => document.documentElement.classList.toggle('dark')}
            title="Toggle Dark Mode"
          >
            <span className="material-symbols-rounded">dark_mode</span>
          </button>
          <button
            className="icon-btn"
            aria-label="Logout"
            onClick={logout}
            title="Log out"
          >
            <span className="material-symbols-rounded">logout</span>
          </button>
        </div>
      </header>

      <main className="page-content">
        {/* ── Daily Goal ── */}
        <section className="card goal-card">
          <div className="goal-text">
            <p className="label">Daily Goal</p>
            <h2 className="display-num">
              {completed}<span className="of-total">/{total}</span>
            </h2>
            <p className="sub-label">tasks completed today</p>
          </div>
          <div className="progress-ring-wrap">
            <svg className="progress-ring" viewBox="0 0 60 60">
              <circle className="ring-bg"   cx="30" cy="30" r="24" />
              <circle
                className="ring-fill" cx="30" cy="30" r="24"
                strokeDasharray={`${(pct / 100) * 150.8} 150.8`}
              />
            </svg>
            <span className="ring-label">{pct}%</span>
          </div>
        </section>

        {/* ── Academic Tasks Preview ── */}
        <section className="section-block">
          <div className="section-header">
            <h2 className="section-title">Today's Tasks</h2>
            <button className="link-btn" onClick={() => onNavigate("tasks")}>See all</button>
          </div>

          {taskStatus === "loading" && <SkeletonCard count={3} />}
          {taskError && <ErrorBanner message={taskError} onRetry={fetchTasks} />}

          {taskStatus !== "loading" && academicTasks.length === 0 && !taskError && (
            <p className="empty-state">No academic tasks today — add one!</p>
          )}
          {academicTasks.map((task) => (
            <div key={task._id ?? task.id} className={`task-row ${task.completed ? "done" : ""}`}>
              <span className="material-symbols-rounded task-check">
                {task.completed ? "check_circle" : "radio_button_unchecked"}
              </span>
              <span className="task-title">{task.title}</span>
              <span className="task-chip chip-academic">Academic</span>
            </div>
          ))}
        </section>

        {/* ── Workout Preview ── */}
        <section className="section-block">
          <div className="section-header">
            <h2 className="section-title">Active Body</h2>
            <button className="link-btn" onClick={() => onNavigate("workouts")}>View Plan</button>
          </div>

          {taskStatus !== "loading" && workoutTasks.length === 0 && !taskError && (
            <p className="empty-state">No workouts today — generate a plan!</p>
          )}
          {workoutTasks.map((task) => (
            <div key={task._id ?? task.id} className={`task-row ${task.completed ? "done" : ""}`}>
              <span className="material-symbols-rounded task-check">
                {task.completed ? "check_circle" : "radio_button_unchecked"}
              </span>
              <span className="task-title">{task.title}</span>
              <span className="task-chip chip-workout">Workout</span>
            </div>
          ))}
        </section>

        {/* ── Study Buddies ── */}
        <section className="section-block">
          <div className="section-header">
            <h2 className="section-title">Study Buddies</h2>
            <button className="link-btn" onClick={() => onNavigate("buddies")}>Find More</button>
          </div>

          {buddies.length === 0 && (
            <p className="empty-state">No connections yet — find study partners!</p>
          )}
          {buddies.map((buddy) => (
            <div key={buddy.userId ?? buddy._id} className="buddy-row">
              <div className="buddy-avatar">{(buddy.name ?? "?")[0]}</div>
              <div>
                <p className="buddy-name">{buddy.name}</p>
                <p className="buddy-sub">{buddy.bio ?? "Scholar"}</p>
              </div>
              <span className="online-dot" />
            </div>
          ))}
        </section>
      </main>

      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  );
}
