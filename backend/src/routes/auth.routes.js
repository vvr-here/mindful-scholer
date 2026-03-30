const { Router } = require("express");
const ctrl    = require("../controllers/auth.controller");
const { authenticate }  = require("../middleware/auth.middleware");
const { authLimiter }   = require("../middleware/rateLimiter.middleware");
const { validate, registerSchema, loginSchema } = require("../middleware/validate.middleware");

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), ctrl.register);
router.post("/login",    authLimiter, validate(loginSchema),    ctrl.login);
router.get("/me",        authenticate, ctrl.me);
router.put("/me",        authenticate, ctrl.updateMe);

module.exports = router;
