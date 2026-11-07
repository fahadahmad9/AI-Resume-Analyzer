const assert = require('node:assert/strict')
const test = require('node:test')

const { parseResumeText } = require('./src/utils/resumeParser')
const { extractEmbeddedPdfLinks } = require('./src/utils/pdfLinks')
const { chunkResume } = require('./rag/chunker')

function createPdfWithLinks(urls) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Annots [${urls.map((_, index) => `${4 + index} 0 R`).join(' ')}] /Contents ${4 + urls.length} 0 R >>`,
    ...urls.map((url, index) => `<< /Type /Annot /Subtype /Link /Rect [${index * 100} 700 ${(index + 1) * 100} 720] /Border [0 0 0] /A << /S /URI /URI (${url}) >> >>`),
    '<< /Length 0 >>\nstream\n\nendstream',
  ]
  const header = '%PDF-1.7\n'
  const body = objects.map((object, index) => `${index + 1} 0 obj\n${object}\nendobj\n`).join('')
  const offsets = objects.reduce((result, _, index) => {
    const objectStart = `${index + 1} 0 obj\n`
    const previousLength = result.body.length
    result.offsets.push(Buffer.byteLength(header) + previousLength)
    result.body += objectStart + objects[index] + '\nendobj\n'
    return result
  }, { body: '', offsets: [] })
  const xrefOffset = Buffer.byteLength(header) + Buffer.byteLength(offsets.body)
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\n`
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(header + offsets.body + xref + trailer)
}

function socialLinks(text, embeddedUrls = []) {
  return parseResumeText(text, embeddedUrls).socialLinks
}

function skillsFromLines(lines) {
  return parseResumeText(['Skills', ...lines].join('\n')).skills
}

test('separates adjacent known skills without concatenating them', () => {
  assert.deepEqual(skillsFromLines(['PythonJavaScriptSQL']), ['Python', 'JavaScript', 'SQL'])
})

test('keeps explicit categories and avoids cross-category duplication', () => {
  const parsed = parseResumeText([
    'Skills',
    'Programming Languages: Python, JavaScript',
    'Laboratory Methods: X-ray diffraction, spectroscopy',
  ].join('\n'))

  assert.deepEqual(parsed.skillCategories['Programming Languages'], ['Python', 'JavaScript'])
  assert.deepEqual(parsed.skillCategories['Laboratory Methods'], ['X-ray diffraction', 'Spectroscopy'])
  assert.equal(parsed.skills.filter((skill) => skill === 'Python').length, 1)
})

test('preserves unfamiliar domain skills and learning labels', () => {
  const parsed = parseResumeText([
    'Skills',
    'Currently Learning: Polymer electrolyte synthesis, market segmentation',
  ].join('\n'))

  assert.ok(parsed.skills.includes('Polymer electrolyte synthesis'))
  assert.ok(parsed.skills.includes('market segmentation'))
  assert.ok(parsed.skillCategories['Currently Learning'])
})

test('extracts recognized skills from project descriptions without a Skills section', () => {
  const parsed = parseResumeText([
    'Projects',
    'Built a data pipeline with Python and PostgreSQL.',
  ].join('\n'))

  assert.ok(parsed.skills.includes('Python'))
  assert.ok(parsed.skills.includes('PostgreSQL'))
})

test('tracks provenance across six professional domains', () => {
  const cases = [
    ['Software Engineering', 'Projects\nBuilt a compiler with dependency graph analysis.', 'dependency graph analysis', 'project'],
    ['Material Science', 'Experience\nConducted interfacial fracture characterization.', 'interfacial fracture characterization', 'experience'],
    ['Healthcare', 'Projects\nImplemented patient reported outcome tracking.', 'patient reported outcome tracking', 'project'],
    ['Finance', 'Experience\nPerformed stochastic credit modeling.', 'stochastic credit modeling', 'experience'],
    ['Mechanical Engineering', 'Projects\nDeveloped thermoelastic fatigue prediction.', 'thermoelastic fatigue prediction', 'project'],
    ['Marketing', 'Experience\nApplied behavioral cohort segmentation.', 'behavioral cohort segmentation', 'experience'],
  ]

  for (const [, text, skill, source] of cases) {
    const parsed = parseResumeText(text)
    assert.ok(parsed.skills.includes(skill), `missing ${skill}`)
    assert.deepEqual(parsed.skillProvenance[skill].map((record) => record.source), [source])
    assert.equal(parsed.skillProvenance[skill][0].section, source === 'project' ? 'projects' : 'experience')
    assert.match(parsed.skillProvenance[skill][0].text, new RegExp(skill))
  }
})

test('recognizes varied practical-experience phrasing without passive mentions', () => {
  const cases = [
    ['Responsible for compiler architecture.', 'compiler architecture'],
    ['Specialized in interfacial fracture characterization.', 'interfacial fracture characterization'],
    ['Accountable for patient outcome tracking.', 'patient outcome tracking'],
    ['Focused on stochastic credit modeling.', 'stochastic credit modeling'],
    ['Led work on thermoelastic fatigue prediction.', 'thermoelastic fatigue prediction'],
    ['Owned behavioral cohort segmentation.', 'behavioral cohort segmentation'],
  ]

  for (const [line, skill] of cases) {
    const parsed = parseResumeText(`Experience\n${line}`)
    assert.ok(parsed.skills.includes(skill), `missing ${skill}`)
    assert.equal(parsed.skillProvenance[skill][0].source, 'experience')
  }

  const passive = parseResumeText([
    'Projects',
    'The documentation mentioned spectral deconvolution.',
    'Experience',
    'Knowledge of clinical pathway design was preferred.',
  ].join('\n'))
  assert.deepEqual(passive.skills, [])
  assert.deepEqual(passive.skillProvenance, {})
})

test('retains all origins for duplicate skills and distinguishes learning', () => {
  const parsed = parseResumeText([
    'Skills',
    'Methods: Python',
    'Currently Learning: quantum process tomography',
    'Projects',
    'Used Python and quantum process tomography.',
    'Experience',
    'Responsible for Python and quantum process tomography.',
  ].join('\n'))

  assert.deepEqual(parsed.skillProvenance.Python.map((record) => record.source), [
    'explicit_skill',
    'project',
    'experience',
  ])
  assert.deepEqual(parsed.skillProvenance['quantum process tomography'].map((record) => record.source), [
    'currently_learning',
    'project',
    'experience',
  ])
})

test('does not classify a non-usage mention as practical evidence', () => {
  const parsed = parseResumeText([
    'Projects',
    'The report mentioned spectral deconvolution and phase field modeling.',
  ].join('\n'))

  assert.deepEqual(parsed.skills, [])
  assert.deepEqual(parsed.skillProvenance, {})
})

test('does not arbitrarily split unfamiliar compound words', () => {
  const parsed = parseResumeText([
    'Skills',
    'Methods: electrochemicalimpedancespectroscopy',
  ].join('\n'))

  assert.deepEqual(parsed.skills, ['electrochemicalimpedancespectroscopy'])
})

test('keeps provenance metadata out of RAG evidence while preserving API fields', () => {
  const parsed = parseResumeText([
    'Skills',
    'Methods: Python',
    'Projects',
    'Used Python for automation.',
  ].join('\n'))
  const chunks = chunkResume(parsed)

  assert.ok(Array.isArray(parsed.skills))
  assert.equal(typeof parsed.skillCategories, 'object')
  assert.equal(typeof parsed.skillProvenance, 'object')
  assert.ok(chunks.every((chunk) => !chunk.content.includes('explicit_skill')))
  assert.ok(chunks.some((chunk) => chunk.content.includes('Python')))
})

test('preserves parenthesized skill groups', () => {
  assert.deepEqual(skillsFromLines([
    'Computer Vision (YOLOv8, GoogleCloud Vision)',
  ]).filter((skill) => skill.startsWith('Computer Vision')), [
    'Computer Vision (YOLOv8, GoogleCloud Vision)',
  ])
})

test('splits adjacent parenthesized skill groups at a capitalized boundary', () => {
  const skills = skillsFromLines([
    'LLM Integration (LLaMA API)Retrieval-Augmented Generation (RAG)Computer Vision',
  ])

  assert.ok(skills.includes('LLM Integration (LLaMA API)'))
  assert.ok(skills.includes('Retrieval-Augmented Generation (RAG)'))
  assert.ok(skills.includes('Computer Vision'))
})

test('preserves existing skill delimiters', () => {
  const skills = skillsFromLines([
    'Alpha Skill, Beta Skill; Gamma Skill | Delta Skill / Epsilon Skill · Zeta Skill',
  ])

  for (const skill of ['Alpha Skill', 'Beta Skill', 'Gamma Skill', 'Delta Skill', 'Epsilon Skill', 'Zeta Skill']) {
    assert.ok(skills.includes(skill), `missing ${skill}`)
  }
})

test('preserves normal multi-word and compound skills', () => {
  const skills = skillsFromLines([
    'Quantum Materials Analysis',
    'Computer Vision (YOLOv8, GoogleCloud Vision)',
    'YOLOv8',
  ])

  assert.ok(skills.includes('Quantum Materials Analysis'))
  assert.ok(skills.includes('Computer Vision (YOLOv8, GoogleCloud Vision)'))
  assert.equal(skills.filter((skill) => skill === 'YOLOv8').length, 1)
})

test('deduplicates exact skills without removing compound skills', () => {
  const skills = skillsFromLines([
    'Python, python',
    'Python Automation',
  ])

  assert.equal(skills.filter((skill) => skill === 'Python').length, 1)
  assert.ok(skills.includes('Python Automation'))
})

test('preserves materials science skills', () => {
  const skills = skillsFromLines([
    'Polymer Characterization (FTIR, DSC), Sample Preparation',
  ])

  assert.ok(skills.includes('Polymer Characterization (FTIR, DSC)'))
  assert.ok(skills.includes('Sample Preparation'))
})

test('preserves computer science skills', () => {
  const skills = skillsFromLines([
    'Machine Learning, Python, REST API',
  ])

  assert.ok(skills.includes('Machine Learning'))
  assert.ok(skills.includes('Python'))
  assert.ok(skills.includes('REST API'))
})

test('detects visible LinkedIn and GitHub URLs', () => {
  const result = socialLinks('https://www.linkedin.com/in/alice/ | https://github.com/alice')
  assert.equal(result.linkedin[0], 'https://www.linkedin.com/in/alice')
  assert.equal(result.github[0], 'https://github.com/alice')
})

test('detects LinkedIn and GitHub from clickable PDF links only', async () => {
  const embeddedUrls = await extractEmbeddedPdfLinks(createPdfWithLinks([
    'https://www.linkedin.com/in/alice',
    'https://github.com/alice',
  ]))
  const result = socialLinks('LinkedIn | GitHub', embeddedUrls)
  assert.deepEqual({ linkedin: result.linkedin, github: result.github }, {
    linkedin: ['https://www.linkedin.com/in/alice'],
    github: ['https://github.com/alice'],
  })
})

test('merges an embedded LinkedIn link with a visible GitHub URL', () => {
  assert.equal(socialLinks('GitHub https://github.com/alice', ['https://linkedin.com/in/alice']).linkedin.length, 1)
})

test('merges an embedded GitHub link with a visible LinkedIn URL', () => {
  assert.equal(socialLinks('LinkedIn https://linkedin.com/in/alice', ['https://github.com/alice']).github.length, 1)
})

test('does not detect either profile when neither URL is present', () => {
  assert.deepEqual(socialLinks('Email and phone only'), { linkedin: [], github: [], website: '' })
})

test('does not fabricate URLs from visible profile labels', () => {
  assert.deepEqual(socialLinks('LinkedIn | GitHub'), { linkedin: [], github: [], website: '' })
})

test('ignores unrelated embedded hyperlinks', () => {
  const result = socialLinks('Portfolio', ['https://example.com/alice'])
  assert.deepEqual({ linkedin: result.linkedin, github: result.github }, { linkedin: [], github: [] })
})

test('deduplicates www and trailing-slash variants', () => {
  const result = socialLinks('https://linkedin.com/in/alice/', ['https://www.linkedin.com/in/alice/'])
  assert.deepEqual(result.linkedin, ['https://linkedin.com/in/alice'])
})