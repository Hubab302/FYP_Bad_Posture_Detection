const mongoose = require('mongoose');
const PostureSession = require('./models/PostureSession');
require('dotenv').config();

async function clean() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/posture_coach');
  console.log('Connected to MongoDB');
  
  // Find all active/paused sessions today and complete them if they are broken
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const sessions = await PostureSession.find({
    startedAt: { $gte: startOfDay },
    status: { $in: ['active', 'paused'] }
  });
  
  console.log(`Found ${sessions.length} today's active/paused sessions.`);
  for (const session of sessions) {
    if (!session.trackingToken && session.status === 'active') {
      console.log(`Fixing broken session ${session._id}... marking completed.`);
      session.status = 'completed';
      session.endedAt = new Date();
      await session.save();
    } else {
       console.log(`Completing session ${session._id}...`);
       session.status = 'completed';
       session.endedAt = new Date();
       await session.save();
    }
  }
  
  console.log('Cleanup done.');
  process.exit(0);
}

clean();
