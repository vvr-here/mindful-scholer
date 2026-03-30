const { VALID_SUBJECTS, VALID_WORKOUT_LEVELS, VALID_AVAILABILITY } = require("../models/profile.model");

function validateProfileUpsert({ studySubjects, workoutLevel, bio, availability }) {
  const errors = [];

  if (studySubjects !== undefined) {
    if (!Array.isArray(studySubjects))
      errors.push("studySubjects must be an array.");
    else {
      if (studySubjects.length > 10)
        errors.push("studySubjects may contain at most 10 items.");
      const invalid = studySubjects.filter((s) => !VALID_SUBJECTS.includes(s));
      if (invalid.length)
        errors.push(`Unknown subjects: ${invalid.join(", ")}. Valid: ${VALID_SUBJECTS.join(", ")}.`);
    }
  }

  if (workoutLevel !== undefined && workoutLevel !== null) {
    if (!VALID_WORKOUT_LEVELS.includes(workoutLevel))
      errors.push(`workoutLevel must be one of: ${VALID_WORKOUT_LEVELS.join(", ")}.`);
  }

  if (bio !== undefined && bio !== null) {
    if (typeof bio !== "string") errors.push("bio must be a string.");
    else if (bio.length > 500)   errors.push("bio must be 500 characters or fewer.");
  }

  if (availability !== undefined) {
    if (!Array.isArray(availability))
      errors.push("availability must be an array.");
    else {
      const invalid = availability.filter((s) => !VALID_AVAILABILITY.includes(s));
      if (invalid.length)
        errors.push(`Unknown availability slots: ${invalid.join(", ")}. Valid: ${VALID_AVAILABILITY.join(", ")}.`);
    }
  }

  return errors;
}

function validateMatchQuery({ minScore, limit }) {
  const errors = [];
  if (minScore !== undefined) {
    const n = Number(minScore);
    if (isNaN(n) || n < 0 || n > 100)
      errors.push("minScore must be a number between 0 and 100.");
  }
  if (limit !== undefined) {
    const n = Number(limit);
    if (isNaN(n) || n < 1 || n > 100)
      errors.push("limit must be a number between 1 and 100.");
  }
  return errors;
}

module.exports = { validateProfileUpsert, validateMatchQuery };
