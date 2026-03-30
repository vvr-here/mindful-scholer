/**
 * auth.middleware.js — JWT verification guard
 *
 * Attaches the decoded payload to req.user = { sub: userId, email, iat, exp }
 * Rejects with 401 if token is missing, malformed, or expired.
 */

const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET environment variable is not set.");

/**
 * authenticate — require a valid Bearer token.
 * Use on any route that needs an authenticated user.
 */
function authenticate(req, res, next) {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Missing or malformed Authorization header." });
  }

  const token = header.slice(7); // Strip "Bearer "

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload; // { sub, email, name, iat, exp }
    return next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"  ? "Token expired. Please log in again." :
      err.name === "JsonWebTokenError"  ? "Invalid token."                      :
                                          "Authentication failed.";
    return res.status(401).json({ success: false, message });
  }
}

/**
 * generateToken — create a signed JWT for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" }
  );
}

module.exports = { authenticate, generateToken };
