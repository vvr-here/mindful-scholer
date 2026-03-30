/**
 * match.model.js — Match model helpers (Prisma-backed)
 *
 * Maps to the `matches` table.
 *
 * Match shape:
 * {
 *   id, userId, matchedUserId,
 *   compatibilityScore,
 *   scoreBreakdown: { subjects, workoutLevel, availability },
 *   matchReasons: string[],
 *   sharedSubjects: string[],
 *   status: 'pending' | 'accepted' | 'declined',
 *   createdAt, updatedAt
 * }
 *
 * NOTE: this replaces the in-memory Map used in the old profile.model.js.
 * The matching ENGINE (scoring math) stays in matching.engine.js — this file
 * only handles DB persistence.
 */

const { getPrisma } = require("../config/db");

const MatchModel = {
  /**
   * findById — single match record.
   */
  async findById(id) {
    const prisma = getPrisma();
    return prisma.match.findUnique({
      where:   { id },
      include: {
        user:        { select: { id: true, name: true } },
        matchedUser: { select: { id: true, name: true } },
      },
    });
  },

  /**
   * findExisting — look up a directed edge (userId → matchedUserId).
   * Used to prevent duplicate connect requests.
   */
  async findExisting(userId, matchedUserId) {
    const prisma = getPrisma();
    return prisma.match.findUnique({
      where: { userId_matchedUserId: { userId, matchedUserId } },
    });
  },

  /**
   * upsert — create OR update the directed edge with the latest score.
   * Called each time we run the matching engine.
   *
   * @param {{
   *   userId, matchedUserId, compatibilityScore,
   *   scoreBreakdown?, matchReasons?, sharedSubjects?, status?
   * }} data
   */
  async upsert({ userId, matchedUserId, compatibilityScore, scoreBreakdown, matchReasons, sharedSubjects, status }) {
    const prisma = getPrisma();
    return prisma.match.upsert({
      where: { userId_matchedUserId: { userId, matchedUserId } },
      create: {
        userId,
        matchedUserId,
        compatibilityScore,
        scoreBreakdown:  scoreBreakdown  ?? null,
        matchReasons:    matchReasons    ?? [],
        sharedSubjects:  sharedSubjects  ?? [],
        status:          status          ?? "pending",
      },
      update: {
        compatibilityScore,
        scoreBreakdown:  scoreBreakdown  ?? undefined,
        matchReasons:    matchReasons    ?? undefined,
        sharedSubjects:  sharedSubjects  ?? undefined,
      },
    });
  },

  /**
   * updateStatus — accept or decline a connection request.
   * Only the RECEIVER (matchedUserId) should call this.
   *
   * @param {string} id
   * @param {'accepted'|'declined'} status
   */
  async updateStatus(id, status) {
    const prisma = getPrisma();
    return prisma.match.update({ where: { id }, data: { status } });
  },

  /**
   * getRankedCandidates — fetch all pending/accepted matches for a user,
   * sorted by compatibilityScore descending.
   *
   * @param {string}  userId
   * @param {{ minScore?, limit?, status? }} opts
   */
  async getRankedCandidates(userId, { minScore = 0, limit = 20, status } = {}) {
    const prisma = getPrisma();
    const where  = {
      userId,
      compatibilityScore: { gte: minScore },
    };
    if (status) where.status = status;

    return prisma.match.findMany({
      where,
      orderBy: { compatibilityScore: "desc" },
      take:    limit,
      include: {
        matchedUser: {
          select: { id: true, name: true, subjects: true, workoutLevel: true, availability: true, bio: true },
        },
      },
    });
  },

  /**
   * getConnections — fetch all ACCEPTED matches for a user (both directions).
   * Returns a flat list of the partner's user objects.
   *
   * @param {string} userId
   */
  async getConnections(userId) {
    const prisma = getPrisma();
    const [sent, received] = await Promise.all([
      // Matches I initiated that were accepted
      prisma.match.findMany({
        where:   { userId, status: "accepted" },
        include: { matchedUser: { select: { id: true, name: true, bio: true, workoutLevel: true } } },
      }),
      // Matches others sent me that were accepted
      prisma.match.findMany({
        where:   { matchedUserId: userId, status: "accepted" },
        include: { user: { select: { id: true, name: true, bio: true, workoutLevel: true } } },
      }),
    ]);

    const connections = [
      ...sent.map((m) => ({ ...m.matchedUser, matchId: m.id, score: m.compatibilityScore })),
      ...received.map((m) => ({ ...m.user, matchId: m.id, score: m.compatibilityScore })),
    ];

    return connections;
  },

  /**
   * getPendingRequests — incoming connection requests (status = 'pending').
   */
  async getPendingRequests(userId) {
    const prisma = getPrisma();
    return prisma.match.findMany({
      where:   { matchedUserId: userId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, bio: true, workoutLevel: true } },
      },
    });
  },

  /**
   * delete — remove a match record entirely.
   */
  async delete(id) {
    const prisma = getPrisma();
    return prisma.match.delete({ where: { id } });
  },
};

module.exports = MatchModel;
