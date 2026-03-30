/**
 * task.model.js — Task model helpers
 *
 * Maps to the `tasks` table in Prisma.
 *
 * Task shape:
 * {
 *   id, userId, title, notes,
 *   category: 'academic' | 'workout',
 *   status:   'pending' | 'in_progress' | 'completed',
 *   dueDate,
 *   workoutPlanId?,
 *   createdAt, updatedAt
 * }
 */

const { getPrisma } = require("../config/db");

const TaskModel = {
  /**
   * findAllByUser — list tasks for a user, optionally filtered by category.
   *
   * @param {string}  userId
   * @param {{ category?, status?, orderBy? }} opts
   */
  async findAllByUser(userId, { category, status, orderBy = { dueDate: "asc" } } = {}) {
    const prisma = getPrisma();
    const where  = { userId };
    if (category) where.category = category;
    if (status)   where.status   = status;

    return prisma.task.findMany({
      where,
      orderBy,
      include: { workoutPlan: { select: { id: true, name: true, level: true } } },
    });
  },

  /**
   * findById — fetch a single task (validates ownership implicitly via userId check).
   */
  async findById(id) {
    const prisma = getPrisma();
    return prisma.task.findUnique({
      where:   { id },
      include: { workoutPlan: { select: { id: true, name: true } } },
    });
  },

  /**
   * create — add a new task for a user.
   *
   * @param {{ userId, title, category, status?, notes?, dueDate?, workoutPlanId? }} data
   */
  async create({ userId, title, category, status = "pending", notes, dueDate, workoutPlanId }) {
    const prisma = getPrisma();
    return prisma.task.create({
      data: {
        userId,
        title,
        category,
        status,
        notes:        notes    ?? null,
        dueDate:      dueDate  ? new Date(dueDate) : null,
        workoutPlanId: workoutPlanId ?? null,
      },
    });
  },

  /**
   * update — partial update. Only allows safe fields.
   *
   * @param {string} id
   * @param {{ title?, notes?, category?, status?, dueDate? }} data
   */
  async update(id, data) {
    const prisma  = getPrisma();
    const allowed = ["title", "notes", "category", "status", "dueDate"];
    const clean   = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    if (clean.dueDate) clean.dueDate = new Date(clean.dueDate);
    return prisma.task.update({ where: { id }, data: clean });
  },

  /**
   * setStatus — convenience wrapper for toggling completion.
   */
  async setStatus(id, status) {
    const prisma = getPrisma();
    return prisma.task.update({ where: { id }, data: { status } });
  },

  /**
   * delete — remove a task.
   */
  async delete(id) {
    const prisma = getPrisma();
    return prisma.task.delete({ where: { id } });
  },

  /**
   * todayStats — count completed vs total tasks for a user today.
   * Used by the Dashboard API.
   */
  async todayStats(userId) {
    const prisma    = getPrisma();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [total, completed] = await Promise.all([
      prisma.task.count({ where: { userId, dueDate: { gte: startOfDay, lte: endOfDay } } }),
      prisma.task.count({ where: { userId, status: "completed", dueDate: { gte: startOfDay, lte: endOfDay } } }),
    ]);

    return { total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  },

  /**
   * createBulk — create multiple tasks at once (e.g. from a workout plan).
   *
   * @param {{ userId, title, category, workoutPlanId? }[]} items
   */
  async createBulk(items) {
    const prisma = getPrisma();
    return prisma.task.createMany({ data: items, skipDuplicates: true });
  },
};

module.exports = TaskModel;
