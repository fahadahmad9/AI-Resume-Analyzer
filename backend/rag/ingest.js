const pool = require('../db/pool');
const { chunkResume } = require('./chunker');
const { embedTexts } = require('./embedder');

async function ingestResume({ filename, rawText, parsed }) {
  const startedAt = Date.now();
  const chunkStartedAt = Date.now();
  const chunks = chunkResume(parsed);
  console.log(`[timing] ingestion chunk ms=${Date.now() - chunkStartedAt}`);

  const embedStartedAt = Date.now();
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  console.log(`[timing] ingestion embed ms=${Date.now() - embedStartedAt}`);

  const client = await pool.connect();

  try {
    const insertStartedAt = Date.now();
    await client.query('BEGIN');
    const resume = await client.query(
      `INSERT INTO resumes (filename, raw_text, parsed)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [filename, rawText, parsed],
    );
    const resumeId = resume.rows[0].id;

    for (let i = 0; i < chunks.length; i += 1) {
      await client.query(
        `INSERT INTO resume_chunks (resume_id, section, content, embedding)
         VALUES ($1, $2, $3, $4::vector)`,
        [resumeId, chunks[i].section, chunks[i].content, `[${embeddings[i].join(',')}]`],
      );
    }
    await client.query('COMMIT');
    console.log(`[timing] ingestion insert ms=${Date.now() - insertStartedAt}`);
    console.log(`[timing] ingestion total ms=${Date.now() - startedAt}`);
    return { resumeId, chunkCount: chunks.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ingestResume };
