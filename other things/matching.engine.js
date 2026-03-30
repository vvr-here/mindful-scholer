/**
 * matching.engine.js
 *
 * Pure scoring functions — no I/O, no Express, no side effects.
 * Each scorer takes (sourceProfile, candidateProfile) and returns a score in [0, 1].
 * The composite scorer combines them with configurable weights.
 *
 * ─── Scoring model ───────────────────────────────────────────────────────────
 *
 *  Component           Weight   Algorithm
 *  ──────────────────  ──────   ──────────────────────────────────────────────
 *  Study subjects      0.50     Jaccard similarity of subject arrays
 *  Workout level       0.35     Proximity on a 3-step ordinal scale (exact = 1,
 *                               adjacent = 0.5, two-apart = 0)
 *  Availability        0.15     Jaccard similarity of availability arrays
 *
 *  Total score = weighted sum, normalised to [0, 1].
 *
 *  Each match result also surfaces per-component breakdown + human-readable
 *  reasons so the API consumer can explain the match to the end-user.
 *
 * ─── Extensibility ───────────────────────────────────────────────────────────
 *  Add a new signal:
 *    1. Export a new scorer function following the (src, cand) → [0,1] pattern.
 *    2. Add it to DEFAULT_WEIGHTS with a weight.
 *    3. Normalise the weights so they sum to 1.
 *  No changes needed in the controller or routes.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Jaccard similarity between two arrays (treated as sets).
 * Returns 0 if both empty; 1 if identical.
 */
function jaccard(a = [], b = []) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = [...setA].filter((x) => setB.has(x));
  const unionSize = new Set([...setA, ...setB]).size;
  return intersection.length / unionSize;
}

/**
 * Shared elements between two arrays (de-duplicated).
 */
function sharedElements(a = [], b = []) {
  const setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
}

// Ordinal scale for workout level comparisons
const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };

// ─── Individual scorers ───────────────────────────────────────────────────────

/**
 * scoreSubjects — Jaccard similarity on study subject arrays.
 * [0, 1] — 1 = all subjects match, 0 = no overlap at all.
 */
function scoreSubjects(src, cand) {
  return jaccard(src.studySubjects, cand.studySubjects);
}

/**
 * scoreWorkoutLevel — ordinal proximity on the beginner→intermediate→advanced scale.
 *  Distance 0  → 1.0
 *  Distance 1  → 0.5
 *  Distance 2  → 0.0
 * If either profile has no level, return 0.
 */
function scoreWorkoutLevel(src, cand) {
  const r1 = LEVEL_RANK[src.workoutLevel];
  const r2 = LEVEL_RANK[cand.workoutLevel];
  if (r1 == null || r2 == null) return 0;
  const dist = Math.abs(r1 - r2);
  return Math.max(0, 1 - dist * 0.5);
}

/**
 * scoreAvailability — Jaccard similarity on availability slot arrays.
 * [0, 1] — 1 = perfectly aligned schedules, 0 = no shared slots.
 */
function scoreAvailability(src, cand) {
  return jaccard(src.availability ?? [], cand.availability ?? []);
}

// ─── Default weights ──────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS = {
  subjects:     0.50,
  workoutLevel: 0.35,
  availability: 0.15,
};

// Validate weights sum to 1 at module load (catches config mistakes)
const weightTotal = Object.values(DEFAULT_WEIGHTS).reduce((s, w) => s + w, 0);
if (Math.abs(weightTotal - 1) > 0.001) {
  throw new Error(`DEFAULT_WEIGHTS must sum to 1, got ${weightTotal}`);
}

// ─── Composite scorer ─────────────────────────────────────────────────────────

/**
 * computeMatch(sourceProfile, candidateProfile, weights?)
 *
 * Returns a MatchResult:
 * {
 *   userId        : string
 *   score         : number     [0–100], rounded to 1 decimal
 *   breakdown     : {
 *     subjects     : number    raw [0,1]
 *     workoutLevel : number    raw [0,1]
 *     availability : number    raw [0,1]
 *   }
 *   reasons       : string[]  human-readable match explanation bullets
 *   sharedSubjects: string[]
 * }
 */
function computeMatch(src, cand, weights = DEFAULT_WEIGHTS) {
  const subjectScore  = scoreSubjects(src, cand);
  const workoutScore  = scoreWorkoutLevel(src, cand);
  const availScore    = scoreAvailability(src, cand);

  const compositeScore =
    subjectScore  * weights.subjects     +
    workoutScore  * weights.workoutLevel +
    availScore    * weights.availability;

  const shared = sharedElements(src.studySubjects, cand.studySubjects);

  // Build human-readable reasons
  const reasons = [];

  if (shared.length > 0) {
    const fmt = (s) => s.replace(/_/g, " ");
    reasons.push(
      shared.length === 1
        ? `Studies ${fmt(shared[0])}`
        : `Shares ${shared.length} subjects: ${shared.slice(0, 3).map(fmt).join(", ")}${shared.length > 3 ? "…" : ""}`
    );
  }

  const levelDist = Math.abs(
    (LEVEL_RANK[src.workoutLevel] ?? -1) - (LEVEL_RANK[cand.workoutLevel] ?? -1)
  );
  if (cand.workoutLevel) {
    if (levelDist === 0) reasons.push(`Same workout level (${cand.workoutLevel})`);
    else if (levelDist === 1) reasons.push(`Nearby workout level (${cand.workoutLevel})`);
  }

  const sharedSlots = sharedElements(src.availability ?? [], cand.availability ?? []);
  if (sharedSlots.length > 0) {
    const fmtSlot = (s) => s.replace(/_/g, " ");
    reasons.push(`Available: ${sharedSlots.slice(0, 2).map(fmtSlot).join(", ")}`);
  }

  if (reasons.length === 0) reasons.push("No strong overlap found");

  return {
    userId:        cand.userId,
    score:         Math.round(compositeScore * 1000) / 10, // e.g. 87.3
    breakdown: {
      subjects:     Math.round(subjectScore  * 1000) / 10,
      workoutLevel: Math.round(workoutScore  * 1000) / 10,
      availability: Math.round(availScore    * 1000) / 10,
    },
    reasons,
    sharedSubjects: shared,
  };
}

// ─── Rank function ────────────────────────────────────────────────────────────

/**
 * rankMatches(sourceProfile, candidateProfiles, options?)
 *
 * options:
 *   weights   — override DEFAULT_WEIGHTS
 *   minScore  — filter out matches below this score (0–100, default 0)
 *   limit     — max results to return (default 20)
 *
 * Returns MatchResult[] sorted descending by score.
 */
function rankMatches(src, candidates, options = {}) {
  const {
    weights  = DEFAULT_WEIGHTS,
    minScore = 0,
    limit    = 20,
  } = options;

  return candidates
    .map((cand) => computeMatch(src, cand, weights))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  computeMatch,
  rankMatches,
  scoreSubjects,
  scoreWorkoutLevel,
  scoreAvailability,
  DEFAULT_WEIGHTS,
  LEVEL_RANK,
};
