/**
 * rateLimiter.middleware.js — Per-IP rate limiting
 *
 * Tiers:
 *   globalLimiter — 200 req / 15 min  (all routes)
 *   authLimiter   — 10  req / 15 min  (login/register only)
 *   apiLimiter    — 100 req / 15 min  (authenticated API routes)
 */

const rateLimit = require("express-rate-limit");

const limiterOptions = (max, windowMs, message) => ({
  windowMs,
  max,
  standardHeaders: true,   // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders:   false,
  message: { success: false, message },
  skip: () => process.env.NODE_ENV === "test", // don't limit during tests
});

const globalLimiter = rateLimit(
  limiterOptions(200, 15 * 60 * 1000, "Too many requests. Please slow down.")
);

const authLimiter = rateLimit(
  limiterOptions(10, 15 * 60 * 1000, "Too many authentication attempts. Try again in 15 minutes.")
);

const apiLimiter = rateLimit(
  limiterOptions(100, 15 * 60 * 1000, "API rate limit exceeded. Try again in 15 minutes.")
);

module.exports = { globalLimiter, authLimiter, apiLimiter };
