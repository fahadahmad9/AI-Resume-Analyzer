const pool = require('../db/pool');
const { reindexResume } = require('./ingest');

async function run() {
  const requestedId = process.argv[2];
  const ids = requestedId
    ? [{ id: Number(requestedId) }]
    : (await pool.query('SELECT id FROM resumes ORDER BY id')).rows;

  if (requestedId && (!Number.isInteger(ids[0].id) || ids[0].id < 1)) {
    throw new Error('Resume id must be a positive integer');
  }

  for (const { id } of ids) {
    console.log(`Reindexing resume ${id}`);
    console.log(await reindexResume(id));
  }
}

run()
  .catch((error) => {
    console.error('RAG reindex failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
