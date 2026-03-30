/**
 * WorkoutPlanner.jsx — Backed by useWorkoutStore
 */

import React, { useEffect, useState } from "react";
import { useWorkoutStore, useTaskStore } from "../store";
import SkeletonCard from "../components/SkeletonCard";
import ErrorBanner  from "../components/ErrorBanner";
import BottomNav    from "../components/BottomNav";

const LEVELS = ["beginner", "intermediate", "advanced"];
const LEVEL_META = {
  beginner:     { emoji: "🌱", color: "#00675e" },
  intermediate: { emoji: "⚡", color: "#4a40e0" },
  advanced:     { emoji: "🔥", color: "#983772" },
};

export default function WorkoutPlanner({ onNavigate }) {
  // Workout store
  const plans          = useWorkoutStore((s) => s.plans);
  const activePlan     = useWorkoutStore((s) => s.activePlan);
  const selectedLevel  = useWorkoutStore((s) => s.selectedLevel);
  const status         = useWorkoutStore((s) => s.status);
  const error          = useWorkoutStore((s) => s.error);
  const fetchPlans     = useWorkoutStore((s) => s.fetchPlans);
  const generatePlan   = useWorkoutStore((s) => s.generatePlan);
  const setActivePlan  = useWorkoutStore((s) => s.setActivePlan);
  const setLevel       = useWorkoutStore((s) => s.setLevel);
  const markDone       = useWorkoutStore((s) => s.markExerciseDone);
  const convertToTasks = useWorkoutStore((s) => s.convertToTasks);
  const progressStats  = useWorkoutStore((s) => s.progressStats);

  // Task store — to refresh task list after converting a plan
  const fetchTasks = useTaskStore((s) => s.fetchTasks);

  const [toastMsg, setToastMsg]   = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const { pct, plan: displayPlan } = progressStats();
  const exercises = displayPlan?.exercises ?? displayPlan?.routine ?? [];

  const handleGenerate = async () => {
    try {
      await generatePlan(selectedLevel);
      showToast(`${selectedLevel} plan generated! ✅`);
    } catch {
      // error is in the store
    }
  };

  const handleConvert = async (planId) => {
    setConverting(true);
    try {
      await convertToTasks(planId);
      await fetchTasks();  // sync task store so Dashboard also updates
      showToast("Workout added to your to-do list! 🎯");
    } catch {
      showToast("Failed to convert plan.");
    } finally {
      setConverting(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const isGenerating = status === "generating";
  const isLoading    = status === "loading";

  return (
    <div className="app-shell">
      {toastMsg && <div className="toast">{toastMsg}</div>}

      <header className="page-header">
        <button className="icon-btn" onClick={() => onNavigate("home")}>
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="page-title">Workouts</h1>
      </header>

      <main className="page-content">
        {/* ── Today's Goal ── */}
        <section className="card goal-card-wide">
          <div>
            <p className="label">Today's Goal</p>
            <h2 className="display-num">
              {pct}<span className="of-total">% Done</span>
            </h2>
            <p className="sub-label">
              {exercises.length > 0
                ? `${exercises.length - exercises.filter((e) => e.done).length} more exercises to go`
                : "Generate a plan to get started!"}
            </p>
          </div>
          <div className="progress-wrap" style={{ marginTop: 12 }}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </section>

        {/* ── Generator ── */}
        <section className="card generator-card">
          <h2 className="section-title">Generate New Plan</h2>
          <div className="level-pills">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                id={`level-${lvl}`}
                className={`level-pill ${selectedLevel === lvl ? "active" : ""}`}
                style={selectedLevel === lvl
                  ? { borderColor: LEVEL_META[lvl].color, color: LEVEL_META[lvl].color }
                  : {}}
                onClick={() => setLevel(lvl)}
              >
                {LEVEL_META[lvl].emoji} {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>

          {error && <p className="inline-error">{error}</p>}

          <button
            id="generate-plan-btn"
            className="btn-primary full-width"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating
              ? <span className="spinner" />
              : <><span className="material-symbols-rounded">auto_awesome</span> Generate Plan</>}
          </button>
        </section>

        {/* ── Active Plan ── */}
        {displayPlan && (
          <section className="section-block">
            <div className="section-header">
              <h2 className="section-title">{displayPlan.name ?? "Your Plan"}</h2>
              {displayPlan._id && (
                <button
                  className="link-btn"
                  onClick={() => handleConvert(displayPlan._id)}
                  disabled={converting}
                >
                  {converting ? "Adding…" : "→ To-Do"}
                </button>
              )}
            </div>

            {exercises.length === 0 && (
              <p className="empty-state">No exercises in this plan.</p>
            )}
            {exercises.map((ex, i) => (
              <div
                key={i}
                className={`exercise-row ${ex.done ? "done" : ""}`}
                onClick={() => markDone(i)}
                role="button"
                style={{ cursor: "pointer" }}
              >
                <div className="ex-icon">
                  <span className="material-symbols-rounded">fitness_center</span>
                </div>
                <div className="ex-body">
                  <p className="ex-name">{ex.name ?? ex.title}</p>
                  <p className="ex-detail">
                    {ex.sets ? `${ex.sets} sets × ${ex.reps ?? ex.duration}` : ex.detail ?? ""}
                  </p>
                </div>
                {ex.done && (
                  <span className="material-symbols-rounded done-icon">check_circle</span>
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── Saved Plans ── */}
        {isLoading && <SkeletonCard count={2} />}
        {!isLoading && plans.length > 0 && (
          <section className="section-block">
            <h2 className="section-title">Saved Plans</h2>
            {plans.map((plan) => (
              <div
                key={plan._id ?? plan.id}
                className="plan-row"
                role="button"
                onClick={() => setActivePlan(plan)}
              >
                <span className="material-symbols-rounded plan-icon">event_note</span>
                <div>
                  <p className="plan-name">{plan.name ?? "Unnamed Plan"}</p>
                  <p className="plan-meta">
                    {LEVEL_META[plan.level]?.emoji} {plan.level} · {plan.exercises?.length ?? 0} exercises
                  </p>
                </div>
                <span className="material-symbols-rounded arrow-icon">chevron_right</span>
              </div>
            ))}
          </section>
        )}
      </main>

      <BottomNav active="workouts" onNavigate={onNavigate} />
    </div>
  );
}
