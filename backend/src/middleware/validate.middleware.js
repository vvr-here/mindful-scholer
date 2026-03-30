/**
 * validate.middleware.js — Input validation using Zod schemas
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register)
 *
 * On failure: returns HTTP 422 with an array of { field, message } errors.
 * On success: attaches the parsed (and type-coerced) body to req.validated.
 */

const { z } = require("zod");

// ── Reusable field definitions ────────────────────────────────────────────────

const VALID_SUBJECTS = [
  "mathematics","physics","chemistry","biology",
  "computer_science","literature","history",
  "economics","philosophy","psychology",
];

const VALID_WORKOUT_LEVELS   = ["beginner","intermediate","advanced"];
const VALID_AVAILABILITY     = ["weekday_morning","weekday_evening","weekend_morning","weekend_evening"];
const VALID_TASK_CATEGORIES  = ["academic","workout"];
const VALID_TASK_STATUSES    = ["pending","in_progress","completed"];
const VALID_MATCH_STATUSES   = ["accepted","declined"];

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email:    z.string().trim().toLowerCase().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").max(128),
});

const loginSchema = z.object({
  email:    z.string().trim().toLowerCase().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  title:    z.string().trim().min(1, "Title is required.").max(200),
  category: z.enum(VALID_TASK_CATEGORIES, { errorMap: () => ({ message: `category must be: ${VALID_TASK_CATEGORIES.join(", ")}` }) }),
  notes:    z.string().trim().max(1000).optional().nullable(),
  dueDate:  z.string().datetime({ offset: true }).optional().nullable(),
  status:   z.enum(VALID_TASK_STATUSES).optional(),
});

const updateTaskSchema = z.object({
  title:    z.string().trim().min(1).max(200).optional(),
  notes:    z.string().trim().max(1000).optional().nullable(),
  category: z.enum(VALID_TASK_CATEGORIES).optional(),
  status:   z.enum(VALID_TASK_STATUSES).optional(),
  dueDate:  z.string().datetime({ offset: true }).optional().nullable(),
  completed: z.boolean().optional().transform((val, ctx) => {
    // Allow `completed: true/false` as a shorthand for status
    if (val === undefined) return undefined;
    return val ? "completed" : "pending";
  }),
}).transform((data) => {
  // completed shorthand → status field
  if (data.completed !== undefined) {
    data.status = data.completed;
    delete data.completed;
  }
  return data;
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKOUT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const generateWorkoutSchema = z.object({
  level: z.enum(VALID_WORKOUT_LEVELS, {
    errorMap: () => ({ message: `level must be: ${VALID_WORKOUT_LEVELS.join(", ")}` }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// MATCH / PROFILE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const upsertProfileSchema = z.object({
  studySubjects: z.array(z.enum(VALID_SUBJECTS)).max(10, "Max 10 subjects.").optional(),
  workoutLevel:  z.enum(VALID_WORKOUT_LEVELS).optional().nullable(),
  bio:           z.string().trim().max(500).optional().nullable(),
  availability:  z.array(z.enum(VALID_AVAILABILITY)).optional(),
});

const matchQuerySchema = z.object({
  minScore: z.coerce.number().min(0).max(100).optional(),
  limit:    z.coerce.number().min(1).max(100).optional(),
  explain:  z.enum(["true","false"]).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// NETWORK SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const connectSchema = z.object({
  targetUserId: z.string().min(1, "targetUserId is required."),
});

const respondSchema = z.object({
  action: z.enum(VALID_MATCH_STATUSES, {
    errorMap: () => ({ message: "action must be 'accepted' or 'declined'" }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// validate() — middleware factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {z.ZodSchema} schema  — Zod schema to validate against
 * @param {'body'|'query'|'params'} source — which req property to validate
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field:   e.path.join(".") || source,
        message: e.message,
      }));
      return res.status(422).json({ success: false, errors });
    }
    req.validated = result.data;
    return next();
  };
}

module.exports = {
  validate,
  // Export schemas for use in routes
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  generateWorkoutSchema,
  upsertProfileSchema,
  matchQuerySchema,
  connectSchema,
  respondSchema,
};
