const fs = require('fs');
const pool = require('../db/pool');
const { matchResumeToJob } = require('./matcher');

async function run() {
  const publicId = process.argv[2];
  const jdPath = process.argv[3];
  if (!publicId || !jdPath) {
    throw new Error('Usage: npm run rag:match-id -- <publicId> <jdTextFile>');
  }

  const resume = await pool.query('SELECT id FROM resumes WHERE public_id = $1', [publicId]);
  if (resume.rowCount === 0) throw new Error(`Resume ${publicId} not found`);
  const jobDescription = fs.readFileSync(jdPath, 'utf8');
  const result = await matchResumeToJob(resume.rows[0].id, jobDescription);
  const rows = [...result.matched, ...result.partiallyMatched, ...result.missing, ...result.notAssessed];
  console.table(rows.map((item) => {
    const best = item.evidenceTop3?.[0];
    return {
      requirement: item.requirement,
      verdict: item.verdict || item.status,
      matchedBy: item.matchedBy || '',
      reason: item.reason || item.explanation || item.note || '',
      bestChunk: best?.title || best?.chunk_type || '',
      similarity: best?.similarity == null ? '' : Number(best.similarity).toFixed(3),
      keywordHit: best?.keywordHit ? 'yes' : 'no',
      supportingTerm: item.supportingTerm || '',
      downgraded: item.downgraded ? 'yes' : 'no',
    };
  }));
  console.log(`Final score: ${result.score}/100`);
  console.log(`Judge: ${result.judge}`);
}

run()
  .catch((error) => {
    console.error('RAG match failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
