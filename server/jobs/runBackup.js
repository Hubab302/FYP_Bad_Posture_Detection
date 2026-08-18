/**
 * Manual backup script — run with: node jobs/runBackup.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { connectDB } = require('../config/db');
const { runBackup } = require('./dailyBackup');

async function main() {
  await connectDB();
  const backupPath = await runBackup();
  console.log(`Manual backup complete: ${backupPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Manual backup failed:', err);
  process.exit(1);
});
