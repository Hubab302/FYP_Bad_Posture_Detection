/**
 * seedHistoryReportTestData.js — Idempotent seed script for History/Report testing.
 *
 * Creates/reuses the test user (hubabmasood47@gmail.com) and inserts
 * deterministic PostureHistory records for 10 consecutive days:
 *   2026-08-09 through 2026-08-18
 *
 * This populates the REAL MongoDB collections used by the production
 * History and Report endpoints. No fake JSON files are created.
 *
 * Usage:
 *   cd server
 *   node scripts/seedHistoryReportTestData.js
 *
 * Idempotency:
 *   Running multiple times will NOT duplicate data.
 *   Existing records for the test user are upserted (replaced) with
 *   the same deterministic values.
 *   Records for OTHER users are never touched.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const PostureHistory = require('../models/PostureHistory');
const PostureSession = require('../models/PostureSession');
const PostureReport = require('../models/PostureReport');

const TEST_EMAIL = 'hubabmasood47@gmail.com';
const TEST_USERNAME = 'hubab47';
const TEST_PASSWORD = 'hubab47';

// ─── Posture types from the real classifier ───
// From vision-service/posture_classifier.py:
//   "Forward Head", "Slouching", "Shoulder Tilt",
//   "Leaning Left", "Leaning Right", "Too Close", "Leaning Back"

/**
 * Deterministic test data for 10 consecutive days.
 *
 * Each day has realistic, mathematically consistent values:
 *   goodSeconds + badSeconds = monitoringSeconds
 *   badPercentage = badSeconds / monitoringSeconds * 100
 *   goodPercentage = goodSeconds / monitoringSeconds * 100
 *
 * Monitoring ranges from ~15–90 minutes/day.
 * Bad posture percentage varies from ~15–65%.
 * Posture type durations sum to badSeconds for each day.
 */
const SEED_DATA = [
  {
    localDate: '2026-08-09',
    monitoringDurationSeconds: 2700,  // 45:00
    goodDurationSeconds: 1890,        // 70%
    badDurationSeconds: 810,          // 30%
    postureTypeDurations: { 'Forward Head': 486, 'Slouching': 324 },
    postureTypes: ['Forward Head', 'Slouching'],
  },
  {
    localDate: '2026-08-10',
    monitoringDurationSeconds: 3600,  // 60:00
    goodDurationSeconds: 2520,        // 70%
    badDurationSeconds: 1080,         // 30%
    postureTypeDurations: { 'Forward Head': 648, 'Leaning Right': 432 },
    postureTypes: ['Forward Head', 'Leaning Right'],
  },
  {
    localDate: '2026-08-11',
    monitoringDurationSeconds: 1200,  // 20:00
    goodDurationSeconds: 420,         // 35%
    badDurationSeconds: 780,          // 65%
    postureTypeDurations: { 'Slouching': 546, 'Shoulder Tilt': 234 },
    postureTypes: ['Slouching', 'Shoulder Tilt'],
  },
  {
    localDate: '2026-08-12',
    monitoringDurationSeconds: 4200,  // 70:00
    goodDurationSeconds: 2940,        // 70%
    badDurationSeconds: 1260,         // 30%
    postureTypeDurations: { 'Forward Head': 756, 'Slouching': 252, 'Leaning Left': 252 },
    postureTypes: ['Forward Head', 'Slouching', 'Leaning Left'],
  },
  {
    localDate: '2026-08-13',
    monitoringDurationSeconds: 5400,  // 90:00
    goodDurationSeconds: 4590,        // 85%
    badDurationSeconds: 810,          // 15%
    postureTypeDurations: { 'Forward Head': 486, 'Leaning Right': 324 },
    postureTypes: ['Forward Head', 'Leaning Right'],
  },
  {
    localDate: '2026-08-14',
    monitoringDurationSeconds: 900,   // 15:00
    goodDurationSeconds: 540,         // 60%
    badDurationSeconds: 360,          // 40%
    postureTypeDurations: { 'Slouching': 216, 'Too Close': 144 },
    postureTypes: ['Slouching', 'Too Close'],
  },
  {
    localDate: '2026-08-15',
    monitoringDurationSeconds: 3000,  // 50:00
    goodDurationSeconds: 1800,        // 60%
    badDurationSeconds: 1200,         // 40%
    postureTypeDurations: { 'Leaning Left': 480, 'Slouching': 360, 'Forward Head': 360 },
    postureTypes: ['Leaning Left', 'Slouching', 'Forward Head'],
  },
  {
    localDate: '2026-08-16',
    monitoringDurationSeconds: 2400,  // 40:00
    goodDurationSeconds: 1200,        // 50%
    badDurationSeconds: 1200,         // 50%
    postureTypeDurations: { 'Forward Head': 600, 'Shoulder Tilt': 360, 'Leaning Back': 240 },
    postureTypes: ['Forward Head', 'Shoulder Tilt', 'Leaning Back'],
  },
  {
    localDate: '2026-08-17',
    monitoringDurationSeconds: 4800,  // 80:00
    goodDurationSeconds: 3840,        // 80%
    badDurationSeconds: 960,          // 20%
    postureTypeDurations: { 'Slouching': 576, 'Forward Head': 384 },
    postureTypes: ['Slouching', 'Forward Head'],
  },
  {
    localDate: '2026-08-18',
    monitoringDurationSeconds: 1800,  // 30:00
    goodDurationSeconds: 990,         // 55%
    badDurationSeconds: 810,          // 45%
    postureTypeDurations: { 'Forward Head': 405, 'Leaning Right': 243, 'Slouching': 162 },
    postureTypes: ['Forward Head', 'Leaning Right', 'Slouching'],
  },
];

// ─── Self-validation: verify mathematical consistency ───
function validateSeedData() {
  for (const day of SEED_DATA) {
    const { localDate, monitoringDurationSeconds, goodDurationSeconds, badDurationSeconds, postureTypeDurations } = day;

    // goodSeconds + badSeconds must equal monitoringSeconds
    if (goodDurationSeconds + badDurationSeconds !== monitoringDurationSeconds) {
      throw new Error(
        `Seed data inconsistency for ${localDate}: ` +
        `good(${goodDurationSeconds}) + bad(${badDurationSeconds}) != monitoring(${monitoringDurationSeconds})`
      );
    }

    // Sum of posture type durations must equal badSeconds
    const typeDurSum = Object.values(postureTypeDurations).reduce((a, b) => a + b, 0);
    if (typeDurSum !== badDurationSeconds) {
      throw new Error(
        `Seed data inconsistency for ${localDate}: ` +
        `sum of postureTypeDurations(${typeDurSum}) != badSeconds(${badDurationSeconds})`
      );
    }
  }
  console.log('✓ All seed data is mathematically consistent.');
}

// ─── Calculate derived fields ───
function calcPercentage(part, total) {
  if (!total || total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function getMostFrequentBadPosture(postureTypeDurations) {
  let most = null;
  let maxDur = 0;
  for (const [type, dur] of Object.entries(postureTypeDurations)) {
    if (dur > maxDur) {
      maxDur = dur;
      most = type;
    }
  }
  return most;
}

// ─── Main seed function ───
async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/posture_coach';
  console.log(`Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri);
  console.log('✓ Connected to MongoDB');

  // Validate data before inserting
  validateSeedData();

  // ─── Create or reuse test user ───
  let user = await User.findOne({ email: TEST_EMAIL });
  if (user) {
    console.log(`✓ Test user already exists: ${TEST_EMAIL} (${user._id})`);
  } else {
    const passwordHash = await User.hashPassword(TEST_PASSWORD);
    user = await User.create({
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      passwordHash,
    });
    console.log(`✓ Test user created: ${TEST_EMAIL} (${user._id})`);
  }

  const userId = user._id;

  // ─── Seed PostureHistory records (the source of truth for History/Report) ───
  let upserted = 0;
  let updated = 0;

  for (const day of SEED_DATA) {
    const badPercentage = calcPercentage(day.badDurationSeconds, day.monitoringDurationSeconds);
    const goodPercentage = calcPercentage(day.goodDurationSeconds, day.monitoringDurationSeconds);
    const mostFrequentBadPosture = getMostFrequentBadPosture(day.postureTypeDurations);

    const result = await PostureHistory.findOneAndUpdate(
      { userId, localDate: day.localDate },
      {
        userId,
        localDate: day.localDate,
        monitoringDurationSeconds: day.monitoringDurationSeconds,
        goodDurationSeconds: day.goodDurationSeconds,
        badDurationSeconds: day.badDurationSeconds,
        postureTypeDurations: day.postureTypeDurations,
        postureTypes: day.postureTypes,
        badPosturePercentage: badPercentage,
        goodPosturePercentage: goodPercentage,
        mostFrequentBadPosture,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Check if this was a new insert or update
    const isNew = result.createdAt && result.updatedAt &&
      Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
    if (isNew) {
      upserted++;
    } else {
      updated++;
    }
  }

  console.log(`✓ PostureHistory: ${upserted} created, ${updated} updated (${SEED_DATA.length} total days)`);

  // ─── Also create matching PostureSessions for each day ───
  // These make the /range endpoint correctly detect data range.
  // Each day gets one completed session.
  let sessionsCreated = 0;
  let sessionsExist = 0;

  for (const day of SEED_DATA) {
    // Check if a completed session already exists for this user+date
    const dateStart = new Date(day.localDate + 'T09:00:00');
    const dateEnd = new Date(dateStart.getTime() + day.monitoringDurationSeconds * 1000);

    const existingSession = await PostureSession.findOne({
      userId,
      startedAt: { $gte: new Date(day.localDate + 'T00:00:00'), $lt: new Date(day.localDate + 'T23:59:59') },
      status: 'completed',
    });

    if (existingSession) {
      sessionsExist++;
      continue;
    }

    await PostureSession.create({
      userId,
      status: 'completed',
      modelUsed: 'heavy',
      calibrationCompleted: true,
      startedAt: dateStart,
      endedAt: dateEnd,
      monitoringDurationSeconds: day.monitoringDurationSeconds,
      goodDurationSeconds: day.goodDurationSeconds,
      badDurationSeconds: day.badDurationSeconds,
      unobservedDurationSeconds: 0,
      dominantBadPosture: getMostFrequentBadPosture(day.postureTypeDurations),
      postureTypeDurations: day.postureTypeDurations,
      alertCount: 0,
    });
    sessionsCreated++;
  }

  console.log(`✓ PostureSessions: ${sessionsCreated} created, ${sessionsExist} already existed`);

  // ─── Clean up any stale reports for this user's seeded range ───
  // Reports are generated on demand; clearing old ones ensures fresh aggregation
  const deletedReports = await PostureReport.deleteMany({
    userId,
    fromDate: { $gte: '2026-08-03', $lte: '2026-08-18' },
    toDate: { $gte: '2026-08-09', $lte: '2026-08-18' },
  });
  if (deletedReports.deletedCount > 0) {
    console.log(`✓ Cleaned ${deletedReports.deletedCount} stale report snapshots`);
  }

  // ─── Summary ───
  console.log('\n════════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('════════════════════════════════════════');
  console.log(`  Test User:     ${TEST_EMAIL}`);
  console.log(`  Password:      ${TEST_PASSWORD}`);
  console.log(`  User ID:       ${userId}`);
  console.log(`  Date Range:    2026-08-09 → 2026-08-18 (10 days)`);
  console.log(`  History Docs:  ${SEED_DATA.length}`);
  console.log('');
  console.log('  Verification Windows:');
  console.log('  A: endDate=2026-08-18 → 2026-08-12..2026-08-18 (7 days)');
  console.log('  B: endDate=2026-08-17 → 2026-08-11..2026-08-17 (7 days)');
  console.log('  C: endDate=2026-08-16 → 2026-08-10..2026-08-16 (7 days)');
  console.log('  D: endDate=2026-08-15 → 2026-08-09..2026-08-15 (7 days)');
  console.log('════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
