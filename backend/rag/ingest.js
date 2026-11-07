const pool = require('../db/pool');
const { chunkResume } = require('./chunker');
const { embedTexts } = require('./embedder');

async function insertChunks(client, resumeId, chunks, embeddings) {
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    await client.query(
      `INSERT INTO resume_chunks
       (resume_id, section, content, embedding, chunk_type, title, ordinal, char_start, char_end)
       VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9)`,
      [
        resumeId,
        chunk.section,
        chunk.content,
        `[${embeddings[index].join(',')}]`,
        chunk.chunk_type,
        chunk.title,
        chunk.ordinal,
        chunk.char_start ?? null,
        chunk.char_end ?? null,
      ],
    );
  }
}

async function ingestResume({ filename, rawText, parsed }) {
  const startedAt = Date.now();
  const chunkStartedAt = Date.now();
  const chunks = chunkResume(parsed, rawText);
  chunks.forEach((chunk, index) => {
    console.log(`[rag] ingestion chunk index=${index} section=${chunk.section}\n${chunk.content}`);
  });
  console.log(`[timing] ingestion chunk ms=${Date.now() - chunkStartedAt}`);

  const embedStartedAt = Date.now();
  const embeddings = await embedTexts(
    chunks.map((chunk) => chunk.content),
    'RETRIEVAL_DOCUMENT',
  );
  console.log(`[timing] ingestion embed ms=${Date.now() - embedStartedAt}`);

  const client = await pool.connect();
  try {
    const insertStartedAt = Date.now();
    await client.query('BEGIN');
    const resume = await client.query(
      `INSERT INTO resumes (filename, raw_text, parsed)
       VALUES ($1, $2, $3)
       RETURNING id, public_id`,
      [filename, rawText, parsed],
    );
    const internalId = resume.rows[0].id;
    await insertChunks(client, internalId, chunks, embeddings);
    await client.query('COMMIT');
    console.log(`[timing] ingestion insert ms=${Date.now() - insertStartedAt}`);
    console.log(`[timing] ingestion total ms=${Date.now() - startedAt}`);
    return { resumeId: resume.rows[0].public_id, internalId, chunkCount: chunks.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function reindexResume(resumeId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT raw_text, parsed FROM resumes WHERE id = $1 FOR UPDATE',
      [resumeId],
    );
    if (result.rowCount === 0) throw new Error(`Resume ${resumeId} not found`);

    const { raw_text: rawText, parsed } = result.rows[0];
    const chunks = chunkResume(parsed, rawText);
    const embeddings = await embedTexts(
      chunks.map((chunk) => chunk.content),
      'RETRIEVAL_DOCUMENT',
    );
    await client.query('DELETE FROM resume_chunks WHERE resume_id = $1', [resumeId]);
    await insertChunks(client, resumeId, chunks, embeddings);
    await client.query('COMMIT');
    return { resumeId, chunkCount: chunks.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ingestResume, reindexResume };
