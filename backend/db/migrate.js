const fs = require('fs/promises');
const path = require('path');
const pool = require('./pool');

async function migrate() {
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Database migration completed successfully.');
}

migrate()
  .catch((error) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
