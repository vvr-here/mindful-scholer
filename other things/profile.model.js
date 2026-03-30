/**
 * user.profile.model.js
 * Extends the base user store with richer profile data used by the matching engine.
 *
 * Profile shape:
 * {
 *   userId          : string         (FK → user.id)
 *   studySubjects   : string[]       (e.g. ["mathematics", "physics"])
 *   workoutLevel    : string         "beginner" | "intermediate" | "advanced"
 *   bio             : string | null
 *   availability    : string[]       ["weekday_morning", "weekday_evening",
 *                                     "weekend_morning", "weekend_evening"]
 *   updatedAt       : string         ISO-8601
 * }
 */

const VALID_SUBJECTS = [
  "mathematics", "physics", "chemistry", "biology",
  "computer_science", "literature", "history",
  "economics", "philosophy", "psychology",
];

const VALID_WORKOUT_LEVELS = ["beginner", "intermediate", "advanced"];

const VALID_AVAILABILITY = [
  "weekday_morning", "weekday_evening",
  "weekend_morning", "weekend_evening",
];

const profiles = new Map(); // Map<userId, profile>

const ProfileStore = {
  VALID_SUBJECTS,
  VALID_WORKOUT_LEVELS,
  VALID_AVAILABILITY,

  findByUserId(userId) {
    return profiles.get(userId) ?? null;
  },

  /** Upsert profile for a user. Returns the saved profile. */
  upsert(userId, { studySubjects, workoutLevel, bio = null, availability = [] }) {
    const existing = profiles.get(userId) ?? {};
    const profile = {
      ...existing,
      userId,
      studySubjects: studySubjects ?? existing.studySubjects ?? [],
      workoutLevel:  workoutLevel  ?? existing.workoutLevel  ?? null,
      bio:           bio           !== undefined ? bio : (existing.bio ?? null),
      availability:  availability  ?? existing.availability  ?? [],
      updatedAt: new Date().toISOString(),
    };
    profiles.set(userId, profile);
    return profile;
  },

  /** Return all profiles except the requesting user. */
  allExcept(userId) {
    return [...profiles.values()].filter((p) => p.userId !== userId);
  },
};

module.exports = ProfileStore;
