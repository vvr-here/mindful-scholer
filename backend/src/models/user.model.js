/**
 * user.model.js — User model helpers
 *
 * Wraps Prisma's User CRUD with safe field projection (never leaks passwordHash).
 *
 * Public shape (returned to API callers):
 * {
 *   id, name, email, subjects, workoutLevel, availability,
 *   bio, xp, level, createdAt
 * }
 */

const { getPrisma } = require("../config/db");

// Fields we ALWAYS exclude from API responses
const SAFE_SELECT = {
  id:           true,
  name:         true,
  email:        true,
  subjects:     true,
  workoutLevel: true,
  availability: true,
  bio:          true,
  xp:           true,
  level:        true,
  createdAt:    true,
  updatedAt:    true,
  // passwordHash intentionally omitted
};

const UserModel = {
  /**
   * findById — fetch one user by primary key (safe projection).
   */
  async findById(id) {
    const prisma = getPrisma();
    return prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  },

  /**
   * findByEmail — used during login to fetch the password hash for comparison.
   * Returns the FULL record including passwordHash.
   */
  async findByEmail(email) {
    const prisma = getPrisma();
    return prisma.user.findUnique({ where: { email } });
  },

  /**
   * create — register a new user.
   * Caller is responsible for hashing the password BEFORE calling this.
   *
   * @param {{ name, email, passwordHash, subjects?, workoutLevel?, bio? }} data
   */
  async create({ name, email, passwordHash, subjects = [], workoutLevel = null, bio = null }) {
    const prisma = getPrisma();
    return prisma.user.create({
      data: { name, email, passwordHash, subjects, workoutLevel, bio },
      select: SAFE_SELECT,
    });
  },

  /**
   * updateProfile — partial update for profile fields.
   * Does NOT allow updating email or passwordHash here (separate flows).
   *
   * @param {string} id
   * @param {{ name?, subjects?, workoutLevel?, availability?, bio? }} data
   */
  async updateProfile(id, data) {
    const prisma = getPrisma();
    const allowed = ["name", "subjects", "workoutLevel", "availability", "bio"];
    const clean   = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    return prisma.user.update({ where: { id }, data: clean, select: SAFE_SELECT });
  },

  /**
   * addXp — increment XP and auto-level-up (every 500 XP = 1 level).
   */
  async addXp(id, amount) {
    const prisma = getPrisma();
    const user   = await prisma.user.findUnique({ where: { id }, select: { xp: true, level: true } });
    if (!user) throw new Error("User not found");
    const newXp    = user.xp + amount;
    const newLevel = Math.floor(newXp / 500) + 1;
    return prisma.user.update({
      where: { id },
      data:  { xp: newXp, level: newLevel },
      select: SAFE_SELECT,
    });
  },

  /**
   * listForMatching — fetch all users EXCEPT the requesting user,
   * returning only the fields needed by the matching engine.
   */
  async listForMatching(excludeUserId) {
    const prisma = getPrisma();
    return prisma.user.findMany({
      where:  { id: { not: excludeUserId } },
      select: { id: true, name: true, subjects: true, workoutLevel: true, availability: true, bio: true },
    });
  },

  /**
   * delete — hard delete (cascades to tasks, plans, matches via schema).
   */
  async delete(id) {
    const prisma = getPrisma();
    return prisma.user.delete({ where: { id } });
  },
};

module.exports = UserModel;
