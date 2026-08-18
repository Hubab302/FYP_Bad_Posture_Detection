const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/posture_coach';
  try {
    mongoose.set('bufferCommands', false); // Fail fast instead of hanging when disconnected
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
      socketTimeoutMS: 10000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (err) {
    logger.error('MongoDB connection error:', err.message);
    throw err;
  }
}

module.exports = { connectDB };
