const assert = require('node:assert/strict')
const test = require('node:test')

const { parseResumeText } = require('./src/utils/resumeParser')
const { extractEmbeddedPdfLinks } = require('./src/utils/pdfLinks')

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