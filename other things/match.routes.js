const { Router } = require("express");
const {
  getMyProfile,
  upsertProfile,
  getCandidates,
  scoreCandidate,
  getMeta,
} = require("../controllers/match.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { apiLimiter } = require("../middleware/rateLimiter.middleware");

const router = Router();

router.use(authenticate);
router.use(apiLimiter);

/**
 * @route  GET /api/match/meta
 * @desc   Valid enums — subjects, levels, availability slots, weights
 * @access Protected
 */
router.get("/meta", getMeta);

/**
 * @route  GET /api/match/profile
 * @desc   Get your own matching profile
 * @access Protected
 */
router.get("/profile", getMyProfile);

/**
 * @route  PUT /api/match/profile
 * @desc   Create / update your matching profile
 * @body   { studySubjects, workoutLevel, bio?, availability? }
 * @access Protected
 */
router.put("/profile", upsertProfile);

/**
 * @route  GET /api/match/candidates
 * @desc   Ranked list of compatible users
 * @query  minScore  — 0–100, default 0
 * @query  limit     — 1–100, default 10
 * @query  explain   — "true" to include score breakdown + candidate profile
 * @access Protected
 */
router.get("/candidates", getCandidates);

/**
 * @route  GET /api/match/candidates/:userId
 * @desc   Detailed score breakdown for a specific user
 * @access Protected
 */
router.get("/candidates/:userId", scoreCandidate);

module.exports = router;
