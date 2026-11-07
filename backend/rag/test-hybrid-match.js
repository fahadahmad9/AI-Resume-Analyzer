const assert = require('node:assert/strict');
const test = require('node:test');

const {
  escapeRegex,
  hasKeywordHit,
  mergeRankedLists,
} = require('./retriever');
const {
  fallbackVerdict,
  findSupportingTerm,
  matchedBy,
  parseJudgeResponse,
  supportingTermInResume,
} = require('./matcher');
const { sanitizeKeywords } = require('./jdExtractor');

test('sanitizes keyword lists and excludes soft skills', () => {
  assert.deepEqual(sanitizeKeywords([' Git ', 'git', 4, 'PostgreSQL'], 'skill'), ['Git', 'PostgreSQL']);
  assert.deepEqual(sanitizeKeywords(['communication'], 'soft_skill'), []);
});

test('matches punctuation-heavy keywords without substring false positives', () => {
  assert.equal(hasKeywordHit('Built a Node.js service and C++ worker.', ['Node.js']), true);
  assert.equal(hasKeywordHit('Built a Node.js service.', ['Node']), false);
  assert.equal(escapeRegex('C++'), 'C\\+\\+');
});

test('fuses ranked evidence, boosts exact hits, and prefers structured chunks', () => {
  const rows = mergeRankedLists([
    [
      { id: 1, chunk_type: 'raw_window', content: 'Git', similarity: 0.9 },
      { id: 2, chunk_type: 'skills_category', content: 'Git', similarity: 0.8 },
    ],
    [
      { id: 2, chunk_type: 'skills_category', content: 'Git', similarity: 0.8 },
      { id: 1, chunk_type: 'raw_window', content: 'Git', similarity: 0.9 },
    ],
  ], ['Git']);
  assert.equal(rows[0].id, 2);
  assert.equal(rows[0].keywordHit, true);
});

test('fallback and matchedBy distinguish keyword and semantic evidence', () => {
  const evidenceTop4 = [{ id: 4, keywordHit: true, similarity: 0.2 }];
  assert.equal(fallbackVerdict({ evidenceTop4 }).verdict, 'met');
  assert.equal(matchedBy(evidenceTop4), 'keyword');
  assert.equal(matchedBy([{ keywordHit: false, similarity: 0.9 }]), 'semantic');
});

test('judge response parser accepts JSON fences and rejects non-arrays', () => {
  assert.deepEqual(parseJudgeResponse('```json\n[]\n```'), []);
  assert.throws(() => parseJudgeResponse('{}'), /invalid JSON|not iterable/i);
});

test('verifies supporting terms against raw resume text with boundaries and variants', () => {
  const rawText = 'Built REST API services with PostgreSQL. Google Cloud Vision OCR.';
  assert.equal(supportingTermInResume(rawText, 'RESTful'), true);
  assert.equal(supportingTermInResume(rawText, 'GCP'), false);
  assert.equal(supportingTermInResume(rawText, 'Cloud'), true);
  assert.equal(supportingTermInResume(rawText, 'PostgreSQL'), true);
  assert.equal(supportingTermInResume(rawText, 'SQL'), false);
  assert.equal(findSupportingTerm(rawText, ['GCP', 'PostgreSQL']), 'PostgreSQL');
});
