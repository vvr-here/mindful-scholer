/**
 * db.js — Prisma Client singleton
 *
 * Prevents multiple PrismaClient instances during hot-reload in development.
 * In production, the module cache guarantees a single instance.
 *
 * Usage in any model:
 *   const { getPrisma } = require('../config/db');
 *   const prisma = getPrisma();
 *   await prisma.user.findUnique(...)
 */

const { PrismaClient } = require("@prisma/client");

let _prisma;

function getPrisma() {
  if (!_prisma) {
    _prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
    });
  }
  return _prisma;
}

async function disconnectPrisma() {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}

module.exports = { getPrisma, disconnectPrisma };
