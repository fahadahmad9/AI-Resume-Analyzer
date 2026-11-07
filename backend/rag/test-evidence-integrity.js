const assert = require('node:assert/strict');
const test = require('node:test');

const { chunkResume } = require('./chunker');
const {
  hasMeaningfulContent,
  isValidEvidence,
  splitAlternatives,
  buildRequirementQueries,
  classifyRequirement,
} = require('./matcher');

test('does not index score and metadata fields as resume evidence', () => {
  const chunks = chunkResume({
    summary: 'Backend engineer.',
    education: ['Bachelor of Science in Computer Science.'],
    score: { strengths: [], weaknesses: [] },
    sections: { education: true },
    profiles: { github: [] },
    skills: ['SQL', 'Git'],
  });

  assert.deepEqual(
    chunks.map((chunk) => chunk.section),
    ['summary', 'education', 'skills', 'skills'],
  );
  assert.ok(chunks.every((chunk) => chunk.section !== 'score'));
});

test('does not create chunks for empty arrays or objects', () => {
  const chunks = chunkResume({
    summary: '',
    education: [],
    experience: {},
    projects: [],
    skills: [],
  });

  assert.deepEqual(chunks, []);
});

test('rejects empty and metadata-only evidence content', () => {
  assert.equal(hasMeaningfulContent(''), false);
  assert.equal(hasMeaningfulContent('[]'), false);
  assert.equal(hasMeaningfulContent('{}'), false);
  assert.equal(hasMeaningfulContent('strengths: []\nweaknesses: {}'), false);
  assert.equal(isValidEvidence({ section: 'score', content: 'strengths: []' }), false);
  assert.equal(isValidEvidence({ section: 'skills', content: '[]' }), false);
  assert.equal(isValidEvidence({ section: 'skills', content: 'SQL' }), true);
});

test('retains valid education, experience, projects, and skills evidence', () => {
  const chunks = chunkResume({
    education: ['Bachelor of Science in Computer Science, FAST-NUCES.'],
    experience: [{ role: 'Engineer', details: 'Built PostgreSQL services.' }],
    projects: [{ name: 'Search tool', details: 'Implemented vector search.' }],
    skills: ['SQL', 'Git'],
  });

  for (const section of ['education', 'experience', 'projects', 'skills']) {
    assert.ok(
      chunks.some((chunk) => chunk.section === section && chunk.content.length > 0),
      `missing ${section} evidence`,
    );
  }
});

test('formats education and skills chunks as readable labeled evidence', () => {
  const chunks = chunkResume({
    education: ['Bachelor of Science in Computer Science at FAST-NUCES, 2022-2026'],
    skillCategories: {
      'Programming Languages': ['Python', 'JavaScript', 'SQL'],
      Databases: ['PostgreSQL'],
    },
    skills: ['Python', 'JavaScript', 'SQL'],
  });

  assert.deepEqual(chunks.map((chunk) => chunk.content), [
    'Section: Education | Education: Bachelor of Science in Computer Science at FAST-NUCES, 2022-2026',
    'Section: Skills | Technical skills. Programming Languages: Python, JavaScript, SQL; Databases: PostgreSQL',
    'Section: Skills | Skills - Programming Languages: Python, JavaScript, SQL',
    'Section: Skills | Skills - Databases: PostgreSQL',
  ]);
  assert.ok(chunks.every((chunk) => !/\b\d+:\s/.test(chunk.content)));
});

test('creates typed chunks with context headers and raw coverage windows', () => {
  const rawText = [
    'Bachelor of Science in Computer Science',
    'Designable AI',
    'Built a FastAPI service with Docker.',
  ].join('\n');
  const chunks = chunkResume({
    education: ['Bachelor of Science in Computer Science, FAST-NUCES'],
    projects: [{ name: 'Designable AI', details: 'Built a FastAPI service with Docker.' }],
    skillCategories: { Tools: ['Git', 'Docker'] },
  }, rawText);

  assert.ok(chunks.some((chunk) => chunk.chunk_type === 'education'));
  assert.ok(chunks.some((chunk) => chunk.chunk_type === 'project' && chunk.content.includes('Designable AI')));
  assert.ok(chunks.some((chunk) => chunk.chunk_type === 'skills_overview'));
  assert.ok(chunks.some((chunk) => chunk.chunk_type === 'skills_category'));
  const rawChunks = chunks.filter((chunk) => chunk.chunk_type === 'raw_window');
  assert.ok(rawChunks.length > 0);
  assert.ok(rawChunks.every((chunk) => chunk.char_start >= 0 && chunk.char_end > chunk.char_start));
  assert.ok(chunks.every((chunk) => chunk.content.startsWith('Section: ')));
});

test('repeats entry headers when long entries are split', () => {
  const details = Array.from({ length: 30 }, (_, index) => `Bullet ${index} describes project delivery.`).join(' ');
  const chunks = chunkResume({
    projects: [{ name: 'Long Project', details }],
  });
  const projectChunks = chunks.filter((chunk) => chunk.chunk_type === 'project');
  assert.ok(projectChunks.length > 1);
  assert.ok(projectChunks.every((chunk) => chunk.content.includes('Long Project')));
});

test('keeps alternative requirements together while exposing query alternatives', () => {
  assert.deepEqual(splitAlternatives('React or Node.js'), ['React', 'Node.js']);
  assert.deepEqual(splitAlternatives('Python, JavaScript, or SQL'), ['Python', 'JavaScript', 'SQL']);
  assert.deepEqual(buildRequirementQueries('React or Node.js'), ['React or Node.js', 'React', 'Node.js']);
});

function evidence(content, section = 'skills', similarity = 0.9) {
  return { section, content, similarity };
}

test('does not infer OOP and data structures from Python alone', () => {
  const result = classifyRequirement(
    { requirement: 'Object-oriented programming and data structures', category: 'skill' },
    [evidence('Skills: Programming Languages: Python')],
  );
  assert.equal(result.status, 'missing');
});

test('requires both SQL and relational database concepts', () => {
  const result = classifyRequirement(
    { requirement: 'SQL and relational databases', category: 'skill' },
    [evidence('Skills: Programming Languages: SQL, Databases: PostgreSQL')],
  );
  assert.equal(result.status, 'matched');
});

test('matches an alternative when GCP supports Google Cloud', () => {
  const result = classifyRequirement(
    { requirement: 'Google Cloud or AWS', category: 'skill' },
    [evidence('Skills: Cloud & DevOps: GCP')],
  );
  assert.equal(result.status, 'matched');
});

test('does not match an alternative when neither technology is present', () => {
  const result = classifyRequirement(
    { requirement: 'Google Cloud or AWS', category: 'skill' },
    [evidence('Skills: Cloud & DevOps: Docker')],
  );
  assert.equal(result.status, 'missing');
});

test('matches React without inferring Node.js', () => {
  const result = classifyRequirement(
    { requirement: 'React or Node.js', category: 'skill' },
    [evidence('Skills: Frontend: React')],
  );
  assert.equal(result.status, 'matched');
});

test('rejects a high-similarity irrelevant chunk', () => {
  const result = classifyRequirement(
    { requirement: 'Kubernetes', category: 'skill' },
    [evidence('Experience: Built Python APIs with PostgreSQL.', 'experience', 0.99)],
  );
  assert.equal(result.status, 'missing');
});

test('marks a compound requirement partially matched when one concept is present', () => {
  const result = classifyRequirement(
    { requirement: 'SQL and relational databases', category: 'skill' },
    [evidence('Skills: SQL')],
  );
  assert.equal(result.status, 'partially_matched');
});

test('does not treat an explicit skill mention as practical experience', () => {
  const result = classifyRequirement(
    { requirement: 'Python experience', category: 'experience' },
    [evidence('Skills: Programming Languages: Python')],
  );
  assert.equal(result.status, 'partially_matched');
});
