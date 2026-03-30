/**
 * task.controller.js — CRUD for Tasks
 * All routes are protected (authenticate middleware applied in router).
 */

const TaskModel = require("../models/task.model");

// GET /api/tasks?category=academic|workout&status=pending
async function list(req, res, next) {
  try {
    const { category, status } = req.query;
    const tasks = await TaskModel.findAllByUser(req.user.sub, {
      category: category || undefined,
      status:   status   || undefined,
    });
    return res.json({ success: true, data: { tasks, count: tasks.length } });
  } catch (err) { next(err); }
}

// GET /api/tasks/stats  — today's completion stats
async function stats(req, res, next) {
  try {
    const data = await TaskModel.todayStats(req.user.sub);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// GET /api/tasks/:id
async function getOne(req, res, next) {
  try {
    const task = await TaskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });
    // Ownership check
    if (task.userId !== req.user.sub) return res.status(403).json({ success: false, message: "Forbidden." });
    return res.json({ success: true, data: { task } });
  } catch (err) { next(err); }
}

// POST /api/tasks
async function create(req, res, next) {
  try {
    const task = await TaskModel.create({ userId: req.user.sub, ...req.validated });
    return res.status(201).json({ success: true, message: "Task created.", data: { task } });
  } catch (err) { next(err); }
}

// PUT /api/tasks/:id
async function update(req, res, next) {
  try {
    const existing = await TaskModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Task not found." });
    if (existing.userId !== req.user.sub) return res.status(403).json({ success: false, message: "Forbidden." });

    const task = await TaskModel.update(req.params.id, req.validated);
    return res.json({ success: true, message: "Task updated.", data: { task } });
  } catch (err) { next(err); }
}

// DELETE /api/tasks/:id
async function remove(req, res, next) {
  try {
    const existing = await TaskModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Task not found." });
    if (existing.userId !== req.user.sub) return res.status(403).json({ success: false, message: "Forbidden." });

    await TaskModel.delete(req.params.id);
    return res.json({ success: true, message: "Task deleted." });
  } catch (err) { next(err); }
}

module.exports = { list, stats, getOne, create, update, remove };
