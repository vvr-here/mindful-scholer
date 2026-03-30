const { Router } = require("express");
const ctrl = require("../controllers/network.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { apiLimiter }   = require("../middleware/rateLimiter.middleware");
const { validate, connectSchema, respondSchema } = require("../middleware/validate.middleware");

const router = Router();
router.use(authenticate, apiLimiter);

router.get("/discover",           ctrl.discover);
router.get("/connections",        ctrl.connections);
router.get("/requests",           ctrl.pendingRequests);
router.post("/connect",           validate(connectSchema), ctrl.connect);
router.put("/requests/:id",       validate(respondSchema), ctrl.respond);

module.exports = router;
