require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { connectDB } = require('./config/db');
const { sessionConfig } = require('./config/session');
const { errorHandler } = require('./middleware/errorHandler');
const { setupBackupJob } = require('./jobs/dailyBackup');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const trackingRoutes = require('./routes/tracking');
const historyRoutes = require('./routes/history');
const reportRoutes = require('./routes/reports');
const internalRoutes = require('./routes/internal');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ───
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Database & Session ───
async function startServer() {
  try {
    const mongooseConnection = await connectDB();

    app.use(session(sessionConfig(mongooseConnection)));

    // ─── Routes ───
    app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
    app.use('/api/auth', authRoutes);
    app.use('/api/tracking', trackingRoutes);
    app.use('/api/history', historyRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/internal', internalRoutes);

    // ─── Error Handler ───
    app.use(errorHandler);

    // ─── Backup Job ───
    setupBackupJob();

    app.listen(PORT, () => {
      logger.info(`Express server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
