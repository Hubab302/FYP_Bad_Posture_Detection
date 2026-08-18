const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const zlib = require('zlib');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const gzip = promisify(zlib.gzip);

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.json.gz`);

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    logger.info('Backup started...');

    const db = mongoose.connection.db;
    const collections = ['users', 'posturesessions', 'posturehistories', 'posturereports', 'alerts'];
    const backupData = {};

    for (const collName of collections) {
      try {
        const docs = await db.collection(collName).find({}).toArray();
        // Remove passwordHash from user backups for human-readable export
        if (collName === 'users') {
          backupData[collName] = docs.map(({ passwordHash, ...rest }) => rest);
        } else {
          backupData[collName] = docs;
        }
      } catch {
        backupData[collName] = [];
      }
    }

    const jsonStr = JSON.stringify(backupData, null, 2);
    const compressed = await gzip(Buffer.from(jsonStr, 'utf-8'));
    fs.writeFileSync(backupPath, compressed);

    logger.info(`Backup completed: ${backupPath} (${(compressed.length / 1024).toFixed(1)} KB)`);
    return backupPath;
  } catch (err) {
    logger.error('Backup failed:', err);
    throw err;
  }
}

function setupBackupJob() {
  const cronExpr = process.env.BACKUP_CRON || '0 3 * * *'; // Default: 3 AM daily
  cron.schedule(cronExpr, async () => {
    try {
      await runBackup();
    } catch (err) {
      logger.error('Scheduled backup failed:', err);
    }
  });
  logger.info(`Daily backup scheduled: ${cronExpr}`);
}

module.exports = { setupBackupJob, runBackup };
