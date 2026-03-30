const { Router } = require("express");
const ctrl = require("../controllers/task.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { apiLimiter }   = require("../middleware/rateLimiter.middleware");
const { validate, createTaskSchema, updateTaskSchema } = require("../middleware/validate.middleware");

const router = Router();
router.use(authenticate, apiLimiter);

router.get("/",          ctrl.list);
router.get("/stats",     ctrl.stats);
router.get("/:id",       ctrl.getOne);
router.post("/",         validate(createTaskSchema), ctrl.create);
router.put("/:id",       validate(updateTaskSchema), ctrl.update);
router.delete("/:id",    ctrl.remove);

module.exports = router;
