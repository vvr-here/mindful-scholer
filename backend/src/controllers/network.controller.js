/**
 * network.controller.js — Connection requests and social feed
 */

const MatchModel = require("../models/match.model");
const UserModel  = require("../models/user.model");
const { rankMatches, computeMatch } = require("../../matching.engine");

// GET /api/network/discover — ranked candidates (proxy to match engine)
async function discover(req, res, next) {
  try {
    const me = await UserModel.findById(req.user.sub);
    if (!me) return res.status(404).json({ success: false, message: "User not found." });

    // Map user fields to profile shape expected by matching engine
    const myProfile = {
      userId:        me.id,
      studySubjects: me.subjects ?? [],
      workoutLevel:  me.workoutLevel,
      availability:  me.availability ?? [],
    };

    const others = await UserModel.listForMatching(req.user.sub);
    const candidates = others.map((u) => ({
      userId:        u.id,
      studySubjects: u.subjects ?? [],
      workoutLevel:  u.workoutLevel,
      availability:  u.availability ?? [],
      bio:           u.bio,
      name:          u.name,
    }));

    const ranked = rankMatches(myProfile, candidates, { minScore: 0, limit: 20 });

    // Hydrate with name and bio
    const matches = ranked.map((r) => {
      const candidate = candidates.find((c) => c.userId === r.userId) ?? {};
      return {
        userId:         r.userId,
        name:           candidate.name ?? "Unknown",
        score:          r.score,
        reasons:        r.reasons,
        sharedSubjects: r.sharedSubjects,
        profile: {
          workoutLevel:  candidate.workoutLevel,
          bio:           candidate.bio,
          availability:  candidate.availability,
          studySubjects: candidate.studySubjects,
        },
      };
    });

    return res.json({ success: true, data: { matches, total: matches.length } });
  } catch (err) { next(err); }
}

// POST /api/network/connect — send a connection request
async function connect(req, res, next) {
  try {
    const { targetUserId } = req.validated;
    const userId = req.user.sub;

    if (targetUserId === userId) {
      return res.status(400).json({ success: false, message: "Cannot connect with yourself." });
    }

    const target = await UserModel.findById(targetUserId);
    if (!target) return res.status(404).json({ success: false, message: "User not found." });

    // Prevent duplicate pending requests
    const existing = await MatchModel.findExisting(userId, targetUserId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A ${existing.status} connection with this user already exists.`,
      });
    }

    // Score the match
    const myData = await UserModel.findById(userId);
    const myProfile   = { userId, studySubjects: myData.subjects, workoutLevel: myData.workoutLevel, availability: myData.availability };
    const candProfile = { userId: targetUserId, studySubjects: target.subjects, workoutLevel: target.workoutLevel, availability: target.availability };
    const result      = computeMatch(myProfile, candProfile);

    const match = await MatchModel.upsert({
      userId,
      matchedUserId:     targetUserId,
      compatibilityScore: result.score,
      scoreBreakdown:    result.breakdown,
      matchReasons:      result.reasons,
      sharedSubjects:    result.sharedSubjects,
      status:            "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Connection request sent.",
      data:    { match },
    });
  } catch (err) { next(err); }
}

// PUT /api/network/requests/:id — accept or decline
async function respond(req, res, next) {
  try {
    const { action } = req.validated; // 'accepted' | 'declined'
    const matchRecord = await MatchModel.findById(req.params.id);

    if (!matchRecord) return res.status(404).json({ success: false, message: "Request not found." });
    if (matchRecord.matchedUserId !== req.user.sub) {
      return res.status(403).json({ success: false, message: "You cannot respond to this request." });
    }
    if (matchRecord.status !== "pending") {
      return res.status(409).json({ success: false, message: `Request is already ${matchRecord.status}.` });
    }

    const updated = await MatchModel.updateStatus(matchRecord.id, action);
    return res.json({
      success: true,
      message: `Connection ${action}.`,
      data:    { match: updated },
    });
  } catch (err) { next(err); }
}

// GET /api/network/connections — accepted connections
async function connections(req, res, next) {
  try {
    const list = await MatchModel.getConnections(req.user.sub);
    return res.json({ success: true, data: { connections: list, count: list.length } });
  } catch (err) { next(err); }
}

// GET /api/network/requests — pending incoming requests
async function pendingRequests(req, res, next) {
  try {
    const requests = await MatchModel.getPendingRequests(req.user.sub);
    return res.json({ success: true, data: { requests, count: requests.length } });
  } catch (err) { next(err); }
}

module.exports = { discover, connect, respond, connections, pendingRequests };
