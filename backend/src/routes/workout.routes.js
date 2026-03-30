const { Router } = require("express");
const ctrl = require("../controllers/workout.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { apiLimiter }   = require("../middleware/rateLimiter.middleware");
const { validate, generateWorkoutSchema } = require("../middleware/validate.middleware");

const router = Router();
router.use(authenticate, apiLimiter);

router.get("/plans",              ctrl.listPlans);
router.get("/plans/:id",          ctrl.getPlan);
router.post("/generate",          validate(generateWorkoutSchema), ctrl.generate);
router.post("/plans/:id/tasks",   ctrl.planToTasks);
router.delete("/plans/:id",       ctrl.deletePlan);

module.exports = router;
