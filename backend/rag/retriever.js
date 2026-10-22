const pool = require('../db/pool');
const { embedTexts } = require('./embedder');

async function retrieveChunks(query, { resumeId, k = 5 } = {}) {
  const [embedding] = await embedTexts([query]);
  const values = [`[${embedding.join(',')}]`];
  const filter = resumeId === undefined ? '' : 'WHERE resume_id = $2';

  if (resumeId !== undefined) values.push(resumeId);
  values.push(k);

  const result = await pool.query(
    `SELECT section, content, embedding <=> $1::vector AS distance
     FROM resume_chunks
     ${filter}
     ORDER BY embedding <=> $1::vector
     LIMIT $${values.length}`,
    values,
  );

  return result.rows;
}

module.exports = { retrieveChunks };
