const ProfileStore = require("../models/profile.model");
const UserStore    = require("../models/user.model");
const { rankMatches, DEFAULT_WEIGHTS } = require("../utils/matching.engine");
const { validateProfileUpsert, validateMatchQuery } = require("../utils/match.validation");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/match/profile
// Return the authenticated user's own profile.
// ─────────────────────────────────────────────────────────────────────────────
async function getMyProfile(req, res, next) {
  try {
    const profile = ProfileStore.findByUserId(req.user.sub);
    if (!profile)
      return res.status(404).json({ success: false, message: "Profile not found. Create one first." });

    return res.status(200).json({ success: true, data: { profile } });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/match/profile
// Create or replace the authenticated user's profile.
// Body: { studySubjects, workoutLevel, bio?, availability? }
// ─────────────────────────────────────────────────────────────────────────────
async function upsertProfile(req, res, next) {
  try {
    const { studySubjects, workoutLevel, bio, availability } = req.body;

    const errors = validateProfileUpsert({ studySubjects, workoutLevel, bio, availability });
    if (errors.length)
      return res.status(422).json({ success: false, errors });

    const profile = ProfileStore.upsert(req.user.sub, {
      studySubjects, workoutLevel, bio, availability,
    });

    return res.status(200).json({
      success: true,
      message: "Profile saved.",
      data: { profile },
    });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/match/candidates
// Return ranked compatible users for the authenticated user.
//
// Query params:
//   minScore  — minimum composite score 0–100 (default 0)
//   limit     — max results (default 10, max 100)
//   explain   — "true" to include full breakdown and reasons
// ─────────────────────────────────────────────────────────────────────────────
async function getCandidates(req, res, next) {
  try {
    // Ensure requester has a profile
    const myProfile = ProfileStore.findByUserId(req.user.sub);
    if (!myProfile)
      return res.status(400).json({
        success: false,
        message: "Create your profile at PUT /api/match/profile before searching for matches.",
      });

    const { minScore, limit, explain } = req.query;

    const errors = validateMatchQuery({ minScore, limit });
    if (errors.length)
      return res.status(422).json({ success: false, errors });

    // Collect all other users that have profiles
    const candidates = ProfileStore.allExcept(req.user.sub);

    if (candidates.length === 0)
      return res.status(200).json({
        success: true,
        data: { matches: [], total: 0, message: "No other users have profiles yet." },
      });

    const ranked = rankMatches(myProfile, candidates, {
      minScore: minScore ? Number(minScore) : 0,
      limit:    limit    ? Number(limit)    : 10,
    });

    // Hydrate with user names (strip sensitive fields)
    const matches = ranked.map((result) => {
      const user    = UserStore.findById(result.userId);
      const profile = ProfileStore.findByUserId(result.userId);

      const base = {
        userId: result.userId,
        name:   user?.name  ?? "Unknown",
        score:  result.score,
      };

      if (explain === "true") {
        return {
          ...base,
          breakdown:      result.breakdown,
          reasons:        result.reasons,
          sharedSubjects: result.sharedSubjects,
          profile: {
            workoutLevel:   profile?.workoutLevel   ?? null,
            studySubjects:  profile?.studySubjects  ?? [],
            availability:   profile?.availability   ?? [],
            bio:            profile?.bio            ?? null,
          },
        };
      }

      return {
        ...base,
        reasons: result.reasons,
        sharedSubjects: result.sharedSubjects,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        matches,
        total:    matches.length,
        sourceProfile: {
          studySubjects: myProfile.studySubjects,
          workoutLevel:  myProfile.workoutLevel,
        },
        weights: DEFAULT_WEIGHTS,
      },
    });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/match/candidates/:userId
// Score a specific user against the requester.
// ─────────────────────────────────────────────────────────────────────────────
async function scoreCandidate(req, res, next) {
  try {
    const myProfile   = ProfileStore.findByUserId(req.user.sub);
    const candProfile = ProfileStore.findByUserId(req.params.userId);

    if (!myProfile)
      return res.status(400).json({ success: false, message: "Create your profile first." });
    if (!candProfile)
      return res.status(404).json({ success: false, message: "Candidate profile not found." });
    if (req.params.userId === req.user.sub)
      return res.status(400).json({ success: false, message: "Cannot match with yourself." });

    const { rankMatches: _r, computeMatch } = require("../utils/matching.engine");
    const result = computeMatch(myProfile, candProfile);
    const user   = UserStore.findById(req.params.userId);

    return res.status(200).json({
      success: true,
      data: {
        userId:    candProfile.userId,
        name:      user?.name ?? "Unknown",
        score:     result.score,
        breakdown: result.breakdown,
        reasons:   result.reasons,
        sharedSubjects: result.sharedSubjects,
        profile: {
          workoutLevel:  candProfile.workoutLevel,
          studySubjects: candProfile.studySubjects,
          availability:  candProfile.availability,
          bio:           candProfile.bio,
        },
      },
    });
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/match/meta
// Expose valid enumerations to the client.
// ─────────────────────────────────────────────────────────────────────────────
async function getMeta(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        studySubjects:   ProfileStore.VALID_SUBJECTS,
        workoutLevels:   ProfileStore.VALID_WORKOUT_LEVELS,
        availabilitySlots: ProfileStore.VALID_AVAILABILITY,
        weights:         DEFAULT_WEIGHTS,
      },
    });
  } catch (err) { next(err); }
}

module.exports = { getMyProfile, upsertProfile, getCandidates, scoreCandidate, getMeta };
