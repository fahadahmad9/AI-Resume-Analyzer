const pool = require('../db/pool');
const { embedTexts } = require('./embedder');
const { ingestResume } = require('./ingest');

const sample = {
  summary: 'Python engineer focused on machine learning and data products.',
  experience: [
    { company: 'Acme AI', role: 'ML Engineer', details: 'Built Python machine learning services.' },
  ],
  projects: [
    { name: 'Resume Ranker', details: 'Created a semantic search pipeline with vector embeddings.' },
  ],
  education: 'BSc Computer Science',
  skills: ['Python', 'Machine Learning', 'PostgreSQL'],
};

async function runTest() {
  const result = await ingestResume({
    filename: 'rag-test-resume.json',
    rawText: JSON.stringify(sample),
    parsed: sample,
  });
  console.log('Ingestion result:', result);

  try {
    const [queryEmbedding] = await embedTexts(['Python machine learning experience']);
    const query = await pool.query(
      `SELECT section, content, embedding <=> $1::vector AS cosine_distance
       FROM resume_chunks
       WHERE resume_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
      [`[${queryEmbedding.join(',')}]`, result.internalId],
    );
    console.log('Top matching chunks:', query.rows);
  } finally {
    await pool.query('DELETE FROM resumes WHERE id = $1', [result.internalId]);
  }
}

runTest()
  .catch((error) => {
    console.error('RAG ingestion test failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
