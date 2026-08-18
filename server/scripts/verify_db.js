/**
 * Direct MongoDB verification of seeded data.
 * Does NOT rely on seed script output.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const PostureHistory = require('../models/PostureHistory');
const PostureSession = require('../models/PostureSession');

const TEST_EMAIL = 'hubabmasood47@gmail.com';
const TEST_USER_ID = '6a82ea0c7fbc05aa4f365c85';
const EXPECTED_DATES = [
  '2026-08-09','2026-08-10','2026-08-11','2026-08-12','2026-08-13',
  '2026-08-14','2026-08-15','2026-08-16','2026-08-17','2026-08-18'
];

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/posture_coach');
  console.log('Connected to MongoDB\n');

  // 1. Verify user exists
  const user = await User.findOne({ email: TEST_EMAIL });
  console.log(`User: ${user ? user.email + ' (' + user._id + ')' : 'NOT FOUND'}`);
  if (!user) { process.exit(1); }

  const userId = user._id;

  // 2. Count history records
  const histories = await PostureHistory.find({ userId }).sort({ localDate: 1 });
  console.log(`\nPostureHistory records for user: ${histories.length}`);

  // 3. Check exact dates
  const foundDates = histories.map(h => h.localDate);
  console.log(`Found dates: ${foundDates.join(', ')}`);
  
  const missingDates = EXPECTED_DATES.filter(d => !foundDates.includes(d));
  const extraDates = foundDates.filter(d => !EXPECTED_DATES.includes(d));
  console.log(`Missing dates: ${missingDates.length === 0 ? 'NONE ✓' : missingDates.join(', ')}`);
  console.log(`Extra dates: ${extraDates.length === 0 ? 'NONE ✓' : extraDates.join(', ')}`);

  // 4. Check for duplicates
  const pipeline = await PostureHistory.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: '$localDate', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  console.log(`Duplicate dates: ${pipeline.length === 0 ? 'NONE ✓' : JSON.stringify(pipeline)}`);

  // 5. Mathematical validation
  console.log('\n─── Per-day validation ───');
  let allValid = true;
  for (const h of histories) {
    const good = h.goodDurationSeconds;
    const bad = h.badDurationSeconds;
    const mon = h.monitoringDurationSeconds;
    const sumOk = (good + bad === mon);
    
    const typeDur = h.postureTypeDurations instanceof Map 
      ? Object.fromEntries(h.postureTypeDurations) 
      : (h.postureTypeDurations || {});
    const typeSum = Object.values(typeDur).reduce((a, b) => a + b, 0);
    const typeOk = (typeSum === bad);
    const hasTypes = Object.keys(typeDur).length > 0;

    const status = sumOk && typeOk && hasTypes ? '✓' : '✗';
    if (!sumOk || !typeOk || !hasTypes) allValid = false;
    
    console.log(`  ${h.localDate}: mon=${mon}s good=${good}s bad=${bad}s sum=${sumOk?'OK':'FAIL'} types=${JSON.stringify(typeDur)} typeSum=${typeSum}=${typeOk?'OK':'FAIL'}`);
  }
  console.log(`\nAll records mathematically valid: ${allValid ? 'YES ✓' : 'NO ✗'}`);

  // 6. Sessions count
  const sessions = await PostureSession.find({ userId, status: 'completed' });
  console.log(`\nCompleted PostureSessions: ${sessions.length}`);

  await mongoose.disconnect();
  console.log('\n✓ Verification complete');
}

verify().catch(e => { console.error(e); process.exit(1); });
