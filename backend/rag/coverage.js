const pool = require('../db/pool');

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function run() {
  const publicId = process.argv[2];
  if (!publicId) {
    throw new Error('Usage: node rag/coverage.js <publicId>');
  }

  const resume = await pool.query(
    'SELECT id, raw_text FROM resumes WHERE public_id = $1',
    [publicId],
  );
  if (resume.rowCount === 0) throw new Error(`Resume ${publicId} not found`);
  const resumeId = resume.rows[0].id;

  const chunks = await pool.query(
    'SELECT chunk_type, content FROM resume_chunks WHERE resume_id = $1 ORDER BY ordinal, id',
    [resumeId],
  );
  const chunkText = chunks.rows.map((row) => normalize(row.content));
  const lines = String(resume.rows[0].raw_text || '')
    .split(/\r?\n/)
    .map(normalize)
    .filter(Boolean);
  const uncovered = lines.filter((line) => !chunkText.some((content) => content.includes(line)));
  const counts = chunks.rows.reduce((result, row) => {
    result[row.chunk_type || 'unknown'] = (result[row.chunk_type || 'unknown'] || 0) + 1;
    return result;
  }, {});

  console.log(`Resume ${publicId} coverage`);
  console.log(`Lines: ${lines.length}`);
  console.log(`Covered: ${lines.length - uncovered.length}`);
  console.log(`Uncovered: ${uncovered.length}`);
  console.log('Counts by chunk_type:', counts);
  if (uncovered.length) {
    console.log('Uncovered lines:');
    uncovered.forEach((line) => console.log(`- ${line}`));
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error('RAG coverage failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
