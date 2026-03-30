/**
 * errorHandler.middleware.js — Centralized Express error handler
 *
 * Catches all errors thrown by controllers (via next(err)) and formats
 * them into consistent JSON responses.
 *
 * Never leaks stack traces to the client in production.
 */

function errorHandler(err, req, res, _next) {
  const isDev = process.env.NODE_ENV === "development";

  // Log the full error in every environment (for server-side visibility)
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);
  if (isDev) console.error(err.stack);

  // ── Prisma-specific errors ────────────────────────────────────────────────
  if (err.code === "P2002") {
    // Unique constraint violation (e.g. duplicate email)
    const field = err.meta?.target?.join(", ") ?? "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  if (err.code === "P2025") {
    // Record not found for update/delete
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // ── JWT / auth errors ─────────────────────────────────────────────────────
  if (err.name === "UnauthorizedError" || err.status === 401) {
    return res.status(401).json({ success: false, message: err.message || "Unauthorized." });
  }

  // ── CORS errors ───────────────────────────────────────────────────────────
  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // ── Payload too large ─────────────────────────────────────────────────────
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large." });
  }

  // ── Validation errors (passed manually) ───────────────────────────────────
  if (err.status === 422) {
    return res.status(422).json({ success: false, message: err.message, errors: err.errors });
  }

  // ── Default: 500 Internal Server Error ───────────────────────────────────
  return res.status(err.status ?? 500).json({
    success: false,
    message: isDev ? err.message : "An internal server error occurred.",
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
