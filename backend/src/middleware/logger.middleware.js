/**
 * logger.middleware.js — Simple request logger for development
 */

function requestLogger(req, _res, next) {
  const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.ms
  console.log(`[${ts}] ${req.method.padEnd(6)} ${req.path}`);
  next();
}

module.exports = { requestLogger };
