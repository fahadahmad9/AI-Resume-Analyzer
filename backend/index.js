const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { createApp } = require('./src/app');
const pool = require('./db/pool');

const PORT = Number(process.env.PORT) || 5000;
const retentionHours = Number(process.env.RETENTION_HOURS) || 24;

async function deleteExpiredResumes() {
  try {
    const result = await pool.query(
      `DELETE FROM resumes
       WHERE created_at < NOW() - ($1 * INTERVAL '1 hour')`,
      [retentionHours],
    );
    console.log(`[retention] deleted ${result.rowCount} resumes`);
  } catch (error) {
    console.error('[retention] cleanup failed:', error);
  }
}

async function start() {
  const app = createApp();
  await deleteExpiredResumes();
  const cleanupTimer = setInterval(deleteExpiredResumes, 60 * 60 * 1000);
  cleanupTimer.unref();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
