/**
 * workout.controller.js — Workout plan generation and retrieval
 */

const WorkoutPlanModel = require("../models/workoutPlan.model");
const TaskModel        = require("../models/task.model");

// GET /api/workouts/plans
async function listPlans(req, res, next) {
  try {
    const plans = await WorkoutPlanModel.findAllByUser(req.user.sub);
    return res.json({ success: true, data: { plans } });
  } catch (err) { next(err); }
}

// GET /api/workouts/plans/:id
async function getPlan(req, res, next) {
  try {
    const plan = await WorkoutPlanModel.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });
    if (plan.userId !== req.user.sub) return res.status(403).json({ success: false, message: "Forbidden." });
    return res.json({ success: true, data: { plan } });
  } catch (err) { next(err); }
}

// POST /api/workouts/generate  — generate plan from template
async function generate(req, res, next) {
  try {
    const { level } = req.validated;
    const plan = await WorkoutPlanModel.generate(req.user.sub, level);
    return res.status(201).json({
      success: true,
      message: `${level} workout plan generated.`,
      data:    { plan },
    });
  } catch (err) { next(err); }
}

// POST /api/workouts/plans/:id/tasks  — convert plan exercises into tasks
async function planToTasks(req, res, next) {
  try {
    const plan = await WorkoutPlanModel.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });
    if (plan.userId !== req.user.sub) return res.status(403).json({ success: false, message: "Forbidden." });

    const exercises = plan.exercises ?? [];
    if (exercises.length === 0) {
      return res.status(400).json({ success: false, message: "This plan has no exercises." });
    }

    const taskData = exercises.map((ex) => ({
      userId:       req.user.sub,
      title:        ex.name ?? "Unnamed Exercise",
      category:     "workout",
      status:       "pending",
      workoutPlanId: plan.id,
    }));

    const result = await TaskModel.createBulk(taskData);
    return res.status(201).json({
      success: true,
      message: `${result.count} workout tasks added to your to-do list.`,
      data:    { count: result.count },
    });
  } catch (err) { next(err); }
}

// DELETE /api/workouts/plans/:id
async function deletePlan(req, res, next) {
  try {
    const plan = await WorkoutPlanModel.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });
    if (plan.userId !== req.user.sub) return res.status(403).json({ success: false, message: "Forbidden." });
    await WorkoutPlanModel.delete(req.params.id);
    return res.json({ success: true, message: "Plan deleted." });
  } catch (err) { next(err); }
}

module.exports = { listPlans, getPlan, generate, planToTasks, deletePlan };
