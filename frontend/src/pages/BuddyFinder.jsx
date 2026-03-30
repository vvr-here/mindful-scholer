/**
 * BuddyFinder.jsx — Backed by useMatchStore
 */

import React, { useEffect, useState } from "react";
import { useMatchStore } from "../store";
import SkeletonCard from "../components/SkeletonCard";
import ErrorBanner  from "../components/ErrorBanner";
import BottomNav    from "../components/BottomNav";

const SCORE_COLOR = (s) => (s >= 70 ? "#00675e" : s >= 40 ? "#4a40e0" : "#983772");

export default function BuddyFinder({ onNavigate }) {
  // Match store
  const meta            = useMatchStore((s) => s.meta);
  const myProfile       = useMatchStore((s) => s.myProfile);
  const candidates      = useMatchStore((s) => s.candidates);
  const sentRequests    = useMatchStore((s) => s.sentRequests);
  const view            = useMatchStore((s) => s.view);
  const status          = useMatchStore((s) => s.status);
  const error           = useMatchStore((s) => s.error);
  const fetchMeta       = useMatchStore((s) => s.fetchMeta);
  const fetchMyProfile  = useMatchStore((s) => s.fetchMyProfile);
  const fetchCandidates = useMatchStore((s) => s.fetchCandidates);
  const saveProfile     = useMatchStore((s) => s.saveProfile);
  const sendConnect     = useMatchStore((s) => s.sendConnect);
  const setView         = useMatchStore((s) => s.setView);

  // Local form state (profile editor)
  const [bio,              setBio]              = useState("");
  const [workoutLevel,     setWorkoutLevel]     = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedSlots,    setSelectedSlots]    = useState([]);
  const [toastMsg,         setToastMsg]         = useState("");

  useEffect(() => {
    fetchMeta();
    fetchMyProfile();
    fetchCandidates({ limit: 20, explain: "true" });
  }, [fetchMeta, fetchMyProfile, fetchCandidates]);

  // Pre-fill form when profile loads
  useEffect(() => {
    if (myProfile) {
      setBio(myProfile.bio ?? "");
      setWorkoutLevel(myProfile.workoutLevel ?? "");
      setSelectedSubjects(myProfile.studySubjects ?? []);
      setSelectedSlots(myProfile.availability ?? []);
    }
  }, [myProfile]);

  const subjects = meta?.studySubjects ?? [];
  const levels   = meta?.workoutLevels ?? ["beginner", "intermediate", "advanced"];
  const slots    = meta?.availabilitySlots ?? [];

  const toggleSubject = (s) =>
    setSelectedSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleSlot = (s) =>
    setSelectedSlots((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await saveProfile({ studySubjects: selectedSubjects, workoutLevel, bio, availability: selectedSlots });
      showToast("Profile saved! Finding your matches… ✅");
      setView("discover");
    } catch (err) {
      showToast(err.message ?? "Failed to save profile.");
    }
  };

  const handleConnect = async (userId) => {
    try {
      await sendConnect(userId);
      showToast("Connection request sent! 🤝");
    } catch {
      showToast("Failed to send request.");
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const isLoading = status === "loading";
  const isSaving  = status === "saving";

  return (
    <div className="app-shell">
      {toastMsg && <div className="toast">{toastMsg}</div>}

      <header className="page-header">
        <button className="icon-btn" onClick={() => onNavigate("home")}>
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="page-title">
          {view === "discover" ? "Find Your Tribe" : "My Profile"}
        </h1>
        <button
          className="icon-btn"
          onClick={() => setView(view === "discover" ? "profile" : "discover")}
          aria-label="Toggle view"
        >
          <span className="material-symbols-rounded">
            {view === "discover" ? "manage_accounts" : "group"}
          </span>
        </button>
      </header>

      <main className="page-content">
        {view === "discover" ? (
          <>
            <p className="hero-sub">
              Connect with scholars who match your academic rigor and fitness energy.
            </p>

            {isLoading && <SkeletonCard count={4} />}
            {error && (
              <ErrorBanner
                message={error}
                onRetry={() => fetchCandidates({ limit: 20, explain: "true" })}
              />
            )}

            {!isLoading && candidates.length === 0 && !error && (
              <div className="card empty-card">
                <span className="material-symbols-rounded empty-icon">group_off</span>
                <p>No matches found yet.</p>
                <button className="btn-primary" onClick={() => setView("profile")}>
                  Set Up Your Profile
                </button>
              </div>
            )}

            {candidates.map((cand) => (
              <div key={cand.userId} className="buddy-card">
                <div className="buddy-card-top">
                  <div className="buddy-avatar large">
                    {(cand.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="buddy-info">
                    <h3 className="buddy-name">{cand.name}</h3>
                    {cand.profile?.bio && <p className="buddy-bio">{cand.profile.bio}</p>}
                    <div className="reason-pills">
                      {cand.reasons?.slice(0, 2).map((r, i) => (
                        <span key={i} className="reason-pill">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="score-badge"
                    style={{ background: SCORE_COLOR(cand.score) }}
                  >
                    {cand.score}
                    <span className="score-label">/ 100</span>
                  </div>
                </div>

                {cand.sharedSubjects?.length > 0 && (
                  <div className="shared-subjects">
                    {cand.sharedSubjects.map((s) => (
                      <span key={s} className="subject-chip">
                        {s.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  id={`connect-${cand.userId}`}
                  className={`btn-primary full-width ${sentRequests.has(cand.userId) ? "sent" : ""}`}
                  onClick={() => handleConnect(cand.userId)}
                  disabled={sentRequests.has(cand.userId)}
                >
                  {sentRequests.has(cand.userId) ? "✓ Request Sent" : "Connect"}
                </button>
              </div>
            ))}
          </>
        ) : (
          /* ── Profile Editor ── */
          <form className="profile-form" onSubmit={handleSaveProfile}>
            <section className="section-block">
              <h2 className="section-title">Bio</h2>
              <textarea
                id="bio-input"
                className="textarea-input"
                placeholder="Tell others about yourself (max 500 chars)"
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </section>

            <section className="section-block">
              <h2 className="section-title">Workout Level</h2>
              <div className="level-pills">
                {levels.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`level-pill ${workoutLevel === lvl ? "active" : ""}`}
                    onClick={() => setWorkoutLevel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </section>

            <section className="section-block">
              <h2 className="section-title">Study Subjects</h2>
              <div className="chip-grid">
                {subjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`subject-chip selectable ${selectedSubjects.includes(s) ? "selected" : ""}`}
                    onClick={() => toggleSubject(s)}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </section>

            <section className="section-block">
              <h2 className="section-title">Availability</h2>
              <div className="chip-grid">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`subject-chip selectable ${selectedSlots.includes(slot) ? "selected" : ""}`}
                    onClick={() => toggleSlot(slot)}
                  >
                    {slot.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </section>

            {error && <ErrorBanner message={error} />}

            <button
              id="save-profile-btn"
              type="submit"
              className="btn-primary full-width"
              disabled={isSaving}
              style={{ marginTop: 20 }}
            >
              {isSaving ? <span className="spinner" /> : "Save & Find Matches"}
            </button>
          </form>
        )}
      </main>

      <BottomNav active="social" onNavigate={onNavigate} />
    </div>
  );
}
