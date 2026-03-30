/**
 * seed.js — Development seed script
 *
 * Populates the database with realistic sample data for local development.
 *
 * Run:
 *   node backend/prisma/seed.js
 *   OR add to package.json: "prisma": { "seed": "node prisma/seed.js" }
 *   THEN: npx prisma db seed
 *
 * WARNING: Clears existing data before seeding (development only).
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding database…");

  // ── Clear tables in dependency order ──────────────────────────────────────
  await prisma.match.deleteMany();
  await prisma.task.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.user.deleteMany();
  console.log("   Cleared existing data.");

  // ── Hash a shared dev password ────────────────────────────────────────────
  const hash = await bcrypt.hash("password123", 10);

  // ── Seed Users ─────────────────────────────────────────────────────────────
  const [alex, elena, jordan, priya] = await Promise.all([
    prisma.user.create({
      data: {
        name:         "Alex Rivers",
        email:        "alex@scholar.dev",
        passwordHash: hash,
        subjects:     ["mathematics", "physics", "computer_science"],
        workoutLevel: "intermediate",
        availability: ["weekday_morning", "weekend_morning"],
        bio:          "CS junior obsessed with algorithms and morning runs.",
        xp:           420,
        level:        1,
      },
    }),
    prisma.user.create({
      data: {
        name:         "Elena Chen",
        email:        "elena@scholar.dev",
        passwordHash: hash,
        subjects:     ["biology", "chemistry", "mathematics"],
        workoutLevel: "beginner",
        availability: ["weekday_evening", "weekend_morning"],
        bio:          "Pre-med student who just discovered yoga.",
        xp:           210,
        level:        1,
      },
    }),
    prisma.user.create({
      data: {
        name:         "Jordan Smith",
        email:        "jordan@scholar.dev",
        passwordHash: hash,
        subjects:     ["history", "economics", "literature"],
        workoutLevel: "advanced",
        availability: ["weekday_morning", "weekday_evening"],
        bio:          "History major and powerlifting competitor.",
        xp:           1050,
        level:        3,
      },
    }),
    prisma.user.create({
      data: {
        name:         "Priya Nair",
        email:        "priya@scholar.dev",
        passwordHash: hash,
        subjects:     ["mathematics", "computer_science", "physics"],
        workoutLevel: "intermediate",
        availability: ["weekend_morning", "weekend_evening"],
        bio:          "ML researcher who loves weekend hikes.",
        xp:           680,
        level:        2,
      },
    }),
  ]);
  console.log(`   Created ${4} users.`);

  // ── Seed Tasks ────────────────────────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.task.createMany({
    data: [
      // Alex's tasks
      { userId: alex.id,   title: "Submit Physics Lab Report",    category: "academic", status: "pending",    dueDate: tomorrow },
      { userId: alex.id,   title: "Annotate History Chapter 4",   category: "academic", status: "in_progress",dueDate: tomorrow },
      { userId: alex.id,   title: "Prep for Calculus Quiz",       category: "academic", status: "completed",  dueDate: new Date() },
      { userId: alex.id,   title: "15-min Morning Flow",          category: "workout",  status: "completed",  dueDate: new Date() },
      { userId: alex.id,   title: "30-min Lap Swim",              category: "workout",  status: "pending",    dueDate: tomorrow },
      // Elena's tasks
      { userId: elena.id,  title: "Study Organic Chemistry Ch 5", category: "academic", status: "pending",    dueDate: tomorrow },
      { userId: elena.id,  title: "Morning Yoga Session",         category: "workout",  status: "completed",  dueDate: new Date() },
      // Jordan's tasks
      { userId: jordan.id, title: "Essay Draft: WWII Economics",  category: "academic", status: "in_progress",dueDate: tomorrow },
      { userId: jordan.id, title: "Squat PR Attempt",             category: "workout",  status: "pending",    dueDate: tomorrow },
      // Priya's tasks
      { userId: priya.id,  title: "ML Assignment: CNN Model",     category: "academic", status: "in_progress",dueDate: tomorrow },
      { userId: priya.id,  title: "Weekend Trail Run",            category: "workout",  status: "pending",    dueDate: tomorrow },
    ],
  });
  console.log("   Created tasks.");

  // ── Seed Workout Plans ────────────────────────────────────────────────────
  const alexPlan = await prisma.workoutPlan.create({
    data: {
      userId:   alex.id,
      name:     "Intermediate Builder",
      level:    "intermediate",
      isActive: true,
      exercises: [
        { name: "Barbell Squats",    sets: 4, reps: "8",    duration: null,       done: false },
        { name: "Dumbbell Rows",     sets: 4, reps: "10",   duration: null,       done: true  },
        { name: "Incline Push-ups",  sets: 3, reps: "12",   duration: null,       done: false },
        { name: "Romanian Deadlift", sets: 3, reps: "10",   duration: null,       done: false },
        { name: "Plank Hold",        sets: 3, reps: null,   duration: "45 secs",  done: true  },
      ],
      weeklySchedule: {
        Mon: "Upper Body Push",
        Tue: "Lower Body",
        Wed: "Active Recovery",
        Thu: "Upper Body Pull",
        Fri: "Full Body",
        Sat: "Cardio / HIIT",
        Sun: "Rest",
      },
    },
  });

  await prisma.workoutPlan.create({
    data: {
      userId:   elena.id,
      name:     "Beginner Foundation",
      level:    "beginner",
      isActive: true,
      exercises: [
        { name: "Bodyweight Squats", sets: 3, reps: "12",    duration: null,       done: true  },
        { name: "Push-ups",          sets: 3, reps: "10",    duration: null,       done: false },
        { name: "Plank Hold",        sets: 3, reps: null,    duration: "30 secs",  done: false },
      ],
    },
  });
  console.log("   Created workout plans.");

  // ── Seed Matches ──────────────────────────────────────────────────────────
  await prisma.match.createMany({
    data: [
      {
        userId:            alex.id,
        matchedUserId:     priya.id,
        compatibilityScore: 87.5,
        scoreBreakdown:    { subjects: 80.0, workoutLevel: 100.0, availability: 50.0 },
        matchReasons:      ["Shares 2 subjects: mathematics, computer science", "Same workout level (intermediate)", "Available: weekend morning"],
        sharedSubjects:    ["mathematics", "computer_science"],
        status:            "accepted",
      },
      {
        userId:            alex.id,
        matchedUserId:     elena.id,
        compatibilityScore: 42.0,
        scoreBreakdown:    { subjects: 33.3, workoutLevel: 50.0, availability: 50.0 },
        matchReasons:      ["Studies mathematics", "Nearby workout level (beginner)"],
        sharedSubjects:    ["mathematics"],
        status:            "pending",
      },
      {
        userId:            priya.id,
        matchedUserId:     jordan.id,
        compatibilityScore: 18.5,
        scoreBreakdown:    { subjects: 0.0, workoutLevel: 50.0, availability: 0.0 },
        matchReasons:      ["Nearby workout level (advanced)", "No strong subject overlap found"],
        sharedSubjects:    [],
        status:            "declined",
      },
    ],
  });
  console.log("   Created matches.");

  console.log("✅  Seed complete!");
  console.log("\n   Login credentials (all use password: password123):");
  console.log("   alex@scholar.dev | elena@scholar.dev | jordan@scholar.dev | priya@scholar.dev");
}

main()
  .catch((e) => { console.error("❌  Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
