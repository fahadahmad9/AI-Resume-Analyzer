const pool = require('../db/pool');
const { embedTexts } = require('./embedder');

const RRF_K = 60;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordPattern(keyword) {
  return `(^|[^[:alnum:]_.])${escapeRegex(keyword)}([^[:alnum:]_.]|$)`;
}

function hasKeywordHit(content, keywords) {
  return keywords.some((keyword) => new RegExp(`(^|[^\\p{L}\\p{N}_.])${escapeRegex(keyword)}([^\\p{L}\\p{N}_.]|$)`, 'iu').test(content));
}

function mergeRankedLists(lists, keywords) {
  const merged = new Map();
  lists.forEach((list) => {
    list.forEach((row, index) => {
      const key = String(row.id);
      const keywordHit = Boolean(row.keywordHit) || hasKeywordHit(row.content, keywords);
      const current = merged.get(key) || {
        ...row,
        similarity: Number.isFinite(Number(row.similarity)) ? Number(row.similarity) : 0,
        rrf: 0,
        keywordHit: false,
        _ranks: [],
      };
      current.rrf += 1 / (RRF_K + index + 1);
      current.keywordHit = current.keywordHit || keywordHit;
      current._ranks.push(index);
      merged.set(key, current);
    });
  });

  return [...merged.values()]
    .sort((left, right) => {
      const score = (item) => item.rrf + (item.keywordHit ? 0.01 : 0);
      const difference = score(right) - score(left);
      if (Math.abs(difference) > 0.002) return difference;
      if ((left.chunk_type === 'raw_window') !== (right.chunk_type === 'raw_window')) {
        return left.chunk_type === 'raw_window' ? 1 : -1;
      }
      return Number(right.similarity) - Number(left.similarity);
    })
    .filter((row, index, rows) => {
      if (row.chunk_type !== 'raw_window' || row.char_start === null || row.char_start === undefined) return true;
      return !rows.slice(0, index).some((previous) => (
        previous.chunk_type === 'raw_window'
        && previous.char_start !== null
        && Math.max(previous.char_start, row.char_start) < Math.min(previous.char_end, row.char_end)
      ));
    })
    .map(({ distance, _ranks, ...row }) => row);
}

async function retrieveChunks(query, { resumeId, k = 5 } = {}) {
  const [embedding] = await embedTexts([query], 'RETRIEVAL_QUERY');
  const values = [`[${embedding.join(',')}]`];
  const filter = resumeId === undefined ? '' : 'WHERE resume_id = $2';

  if (resumeId !== undefined) values.push(resumeId);
  values.push(k);

  const result = await pool.query(
    `SELECT id, section, content, chunk_type, title, ordinal, char_start, char_end,
            1 - (embedding <=> $1::vector) AS similarity
     FROM resume_chunks
     ${filter}
     ORDER BY embedding <=> $1::vector
     LIMIT $${values.length}`,
    values,
  );

  return result.rows;
}

async function hybridRetrieve({ resumeId, queryEmbedding, queryText, keywords = [], k = 4 }) {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768) {
    throw new TypeError('queryEmbedding must contain 768 values');
  }
  const cleanKeywords = keywords.filter((keyword) => typeof keyword === 'string' && keyword.trim());
  const vector = `[${queryEmbedding.join(',')}]`;
  const text = `${String(queryText || '').replace(/["']/g, '')} ${cleanKeywords.join(' OR ')}`.trim();
  const keywordPatterns = cleanKeywords.map(keywordPattern);
  const filter = 'WHERE resume_id = $1';

  const [vectorResult, textResult, keywordResult] = await Promise.all([
    pool.query(
      `SELECT id, section, content, chunk_type, title, ordinal, char_start, char_end,
              1 - (embedding <=> $2::vector) AS similarity
       FROM resume_chunks ${filter}
       ORDER BY embedding <=> $2::vector
       LIMIT 8`,
      [resumeId, vector],
    ),
    pool.query(
      `SELECT id, section, content, chunk_type, title, ordinal, char_start, char_end,
              ts_rank_cd(tsv, websearch_to_tsquery('english', $2)) AS text_rank
       FROM resume_chunks
       ${filter} AND tsv @@ websearch_to_tsquery('english', $2)
       ORDER BY text_rank DESC
       LIMIT 8`,
      [resumeId, text],
    ),
    cleanKeywords.length
      ? pool.query(
        `SELECT id, section, content, chunk_type, title, ordinal, char_start, char_end,
                true AS "keywordHit"
         FROM resume_chunks
         ${filter} AND content ~* ANY($2::text[])
         LIMIT 8`,
        [resumeId, keywordPatterns],
      )
      : Promise.resolve({ rows: [] }),
  ]);

  return mergeRankedLists([
    vectorResult.rows,
    textResult.rows,
    keywordResult.rows,
  ], cleanKeywords).slice(0, k);
}

module.exports = {
  retrieveChunks,
  hybridRetrieve,
  escapeRegex,
  hasKeywordHit,
  mergeRankedLists,
};
