/**
 * workoutPlan.model.js — WorkoutPlan model helpers
 *
 * Maps to the `workout_plans` table.
 *
 * Plan shape:
 * {
 *   id, userId, name, level,
 *   exercises: [{ name, sets, reps, duration, done }],
 *   weeklySchedule: { Mon: "Upper Body", ... } | null,
 *   isActive,
 *   createdAt, updatedAt
 * }
 *
 * The exercises field is Json[] — each element is a plain JS object.
 * This is intentional: exercise schemas vary by type (strength vs cardio).
 */

const { getPrisma } = require("../config/db");

// Pre-built templates per level — returned by POST /api/workouts/generate
const PLAN_TEMPLATES = {
  beginner: {
    name: "Beginner Foundation",
    exercises: [
      { name: "Bodyweight Squats",  sets: 3, reps: "12",   duration: null, done: false },
      { name: "Push-ups",           sets: 3, reps: "10",   duration: null, done: false },
      { name: "Glute Bridges",      sets: 3, reps: "15",   duration: null, done: false },
      { name: "Plank Hold",         sets: 3, reps: null,   duration: "30 secs", done: false },
      { name: "Walking Lunges",     sets: 2, reps: "10 ea", duration: null, done: false },
    ],
    weeklySchedule: {
      Mon: "Foundation A",
      Tue: "Rest / Light Walk",
      Wed: "Foundation B",
      Thu: "Rest",
      Fri: "Foundation A",
      Sat: "Active Recovery",
      Sun: "Rest",
    },
  },
  intermediate: {
    name: "Intermediate Builder",
    exercises: [
      { name: "Barbell Squats",    sets: 4, reps: "8",    duration: null, done: false },
      { name: "Dumbbell Rows",     sets: 4, reps: "10",   duration: null, done: false },
      { name: "Incline Push-ups",  sets: 3, reps: "12",   duration: null, done: false },
      { name: "Romanian Deadlift", sets: 3, reps: "10",   duration: null, done: false },
      { name: "Plank + Shoulder Tap", sets: 3, reps: null, duration: "45 secs", done: false },
      { name: "Box Jumps",         sets: 3, reps: "8",    duration: null, done: false },
    ],
    weeklySchedule: {
      Mon: "Upper Body Push",
      Tue: "Lower Body",
      Wed: "Active Recovery",
      Thu: "Upper Body Pull",
      Fri: "Full Body",
      Sat: "Cardio / HIIT",
      Sun: "Rest",
    },
  },
  advanced: {
    name: "Advanced Performance",
    exercises: [
      { name: "Back Squat",         sets: 5, reps: "5",    duration: null, done: false },
      { name: "Weighted Pull-ups",  sets: 5, reps: "5",    duration: null, done: false },
      { name: "Bench Press",        sets: 4, reps: "6",    duration: null, done: false },
      { name: "Deadlift",           sets: 4, reps: "5",    duration: null, done: false },
      { name: "Overhead Press",     sets: 4, reps: "6",    duration: null, done: false },
      { name: "Farmers Walk",       sets: 3, reps: null,   duration: "40m carry", done: false },
      { name: "Ab Wheel Rollout",   sets: 3, reps: "10",   duration: null, done: false },
    ],
    weeklySchedule: {
      Mon: "Squat Day",
      Tue: "Bench / Press",
      Wed: "Accessory / Recovery",
      Thu: "Deadlift Day",
      Fri: "Olympic / Conditioning",
      Sat: "Sport / Cardio",
      Sun: "Rest",
    },
  },
};

const WorkoutPlanModel = {
  PLAN_TEMPLATES,

  /**
   * findAllByUser — list all saved plans for a user (most recent first).
   */
  async findAllByUser(userId) {
    const prisma = getPrisma();
    return prisma.workoutPlan.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * findById — fetch a single plan.
   */
  async findById(id) {
    const prisma = getPrisma();
    return prisma.workoutPlan.findUnique({ where: { id } });
  },

  /**
   * generate — create a new plan from a template for a user.
   *
   * @param {string} userId
   * @param {'beginner'|'intermediate'|'advanced'} level
   */
  async generate(userId, level) {
    const prisma   = getPrisma();
    const template = PLAN_TEMPLATES[level];
    if (!template) throw new Error(`Invalid level: ${level}`);

    // Deactivate any previously active plan at the same level
    await prisma.workoutPlan.updateMany({
      where: { userId, level, isActive: true },
      data:  { isActive: false },
    });

    return prisma.workoutPlan.create({
      data: {
        userId,
        name:          template.name,
        level,
        exercises:     template.exercises,
        weeklySchedule: template.weeklySchedule,
        isActive:      true,
      },
    });
  },

  /**
   * update — update plan metadata or exercise completion state.
   *
   * @param {string} id
   * @param {{ name?, exercises?, isActive? }} data
   */
  async update(id, data) {
    const prisma  = getPrisma();
    const allowed = ["name", "exercises", "weeklySchedule", "isActive"];
    const clean   = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    return prisma.workoutPlan.update({ where: { id }, data: clean });
  },

  /**
   * delete — remove a plan (also nullifies task.workoutPlanId via SetNull in schema).
   */
  async delete(id) {
    const prisma = getPrisma();
    return prisma.workoutPlan.delete({ where: { id } });
  },
};

module.exports = WorkoutPlanModel;
