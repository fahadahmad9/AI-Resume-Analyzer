const pool = require('./pool');

function randomVector(dimension) {
  return `[${Array.from({ length: dimension }, () => Math.random()).join(',')}]`;
}

async function runTest() {
  const embedding = randomVector(768);
  let resumeId;

  try {
    const resume = await pool.query(
      `INSERT INTO resumes (filename, raw_text, parsed)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['db-test-resume.pdf', 'Database test resume', { test: true }],
    );
    resumeId = resume.rows[0].id;

    await pool.query(
      `INSERT INTO resume_chunks (resume_id, section, content, embedding)
       VALUES ($1, $2, $3, $4)`,
      [resumeId, 'test', 'Database test chunk', embedding],
    );

    const result = await pool.query(
      `SELECT id, resume_id, embedding <=> $1 AS cosine_distance
       FROM resume_chunks
       WHERE resume_id = $2
       ORDER BY embedding <=> $1
       LIMIT 1`,
      [embedding, resumeId],
    );
    console.log('Cosine-distance query result:', result.rows[0]);
  } finally {
    if (resumeId !== undefined) {
      await pool.query('DELETE FROM resumes WHERE id = $1', [resumeId]);
    }
  }
}

runTest()
  .catch((error) => {
    console.error('Database test failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
