/**
 * App.jsx — Root application.
 *
 * Bootstraps the auth store on mount, then renders the correct page
 * based on auth status and current navigation state.
 */

import React, { useState, useEffect } from "react";
import { useAuthStore } from "./store";
import LoginPage      from "./pages/LoginPage";
import Dashboard      from "./pages/Dashboard";
import TaskList       from "./pages/TaskList";
import WorkoutPlanner from "./pages/WorkoutPlanner";
import BuddyFinder    from "./pages/BuddyFinder";

function AppRouter() {
  const status    = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const [page, setPage] = useState("home");

  // Run once on mount — checks for a persisted JWT
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="splash">
        <span className="material-symbols-rounded splash-icon">school</span>
        <p>The Mindful Scholar</p>
      </div>
    );
  }

  // === DEV BYPASS: Commented out to test frontend without logging in ===
  // if (status !== "authenticated") {
  //   return <LoginPage onSuccess={() => setPage("home")} />;
  // }
  // ======================================================================

  switch (page) {
    case "tasks":    return <TaskList       onNavigate={setPage} />;
    case "workouts": return <WorkoutPlanner onNavigate={setPage} />;
    case "social":
    case "buddies":  return <BuddyFinder    onNavigate={setPage} />;
    default:         return <Dashboard      onNavigate={setPage} />;
  }
}

export default function App() {
  return <AppRouter />;
}
