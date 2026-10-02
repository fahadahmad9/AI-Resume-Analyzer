const assert = require('node:assert/strict')
const test = require('node:test')

const { applyContextualScore, parseResumeText } = require('./src/utils/resumeParser')

function createResume() {
  return parseResumeText([
    'Candidate Name',
    'candidate@example.com',
    'Education',
    'University, 2020',
    'Experience',
    'Researcher, 2021-2024',
    'Projects',
    'Study project with 12 samples',
    'Skills',
    'Research, Communication',
  ].join('\n'))
}

test('parser creates facts without a deterministic final score', () => {
  const resume = createResume()

  assert.equal(resume.score.total, null)
  assert.equal(typeof resume.score.deterministicFacts, 'object')
  assert.equal(resume.score.deterministicFacts.educationEntryCount, 1)
  assert.equal(resume.score.deterministicFacts.experienceEntryCount, 1)
})

test('accepts only finite numeric overall scores within 0 to 100', () => {
  for (const overallScore of [0, 42.5, 100]) {
    const result = applyContextualScore(createResume(), { overallScore })
    assert.equal(result.score.total, overallScore)
  }
})

test('rejects invalid overall scores without changing the unavailable score', () => {
  for (const overallScore of ['85', NaN, Infinity, -1, 101, null, undefined]) {
    const resume = createResume()
    const result = applyContextualScore(resume, { overallScore })

    assert.equal(result.score.total, null)
    assert.deepEqual(result.score.deterministicFacts, resume.score.deterministicFacts)
  }
})

test('Gemini failure preserves facts and does not imply a zero score', () => {
  const resume = createResume()
  const result = applyContextualScore(resume, null)

  assert.equal(result.score.total, null)
  assert.ok(result.score.deterministicFacts.totalEntryCount > 0)
})