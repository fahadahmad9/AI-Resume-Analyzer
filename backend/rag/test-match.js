const pool = require('../db/pool');
const { ingestResume } = require('./ingest');
const { matchResumeToJob } = require('./matcher');

const sample = {
  summary: 'Backend engineer building Python services.',
  experience: [{ company: 'Acme', role: 'Engineer', details: 'Built Python APIs with PostgreSQL.' }],
  projects: [{ name: 'Search Tool', details: 'Implemented vector search.' }],
  skills: ['Python', 'PostgreSQL', 'JavaScript'],
};

const jobDescription = `
We need a backend engineer with Python, PostgreSQL, and Docker experience.
Candidates should have 3+ years of Node.js development. Kubernetes is a nice-to-have.
Applicants must hold a history degree and have medieval European history expertise.
`;

async function runTest() {
  const { internalId } = await ingestResume({
    filename: 'match-test-resume.json',
    rawText: JSON.stringify(sample),
    parsed: sample,
  });

  try {
    const result = await matchResumeToJob(internalId, jobDescription);
    console.log('Match score:', result.score, 'threshold:', result.threshold);
    for (const item of [...result.matched, ...result.missing]) {
      const evidence = item.evidenceTop3 || [];
      console.log(
        `${item.requirement}: ${evidence.map((candidate) => (
          `${Math.round(Number(candidate.similarity) * 100)}%`
        )).join(', ')}`,
      );
    }
    console.log('Not assessed:', result.notAssessed);
  } finally {
    await pool.query('DELETE FROM resumes WHERE id = $1', [internalId]);
  }
}

runTest()
  .catch((error) => {
    console.error('RAG match test failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
