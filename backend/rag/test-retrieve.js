const pool = require('../db/pool');
const { ingestResume } = require('./ingest');
const { retrieveChunks } = require('./retriever');

const sample = {
  summary: 'Backend engineer building reliable web services.',
  experience: [
    { company: 'Acme', role: 'Engineer', details: 'Built Python APIs and PostgreSQL services.' },
  ],
  projects: [
    { name: 'Search Tool', details: 'Implemented a vector search system.' },
  ],
  skills: ['Python', 'PostgreSQL', 'JavaScript'],
};

async function runTest() {
  const { resumeId } = await ingestResume({
    filename: 'retrieve-test-resume.json',
    rawText: JSON.stringify(sample),
    parsed: sample,
  });

  try {
    for (const query of ['Python PostgreSQL skills', 'medieval European history']) {
      console.log(`Results for "${query}":`, await retrieveChunks(query, { resumeId, k: 3 }));
    }
  } finally {
    await pool.query('DELETE FROM resumes WHERE id = $1', [resumeId]);
  }
}

runTest()
  .catch((error) => {
    console.error('RAG retrieval test failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
