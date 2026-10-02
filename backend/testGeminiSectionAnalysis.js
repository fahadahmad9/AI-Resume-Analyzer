const assert = require('node:assert/strict')
const test = require('node:test')

const { buildResumeAnalysisPrompt } = require('./src/services/geminiService')

const baseResume = {
  name: 'Candidate',
  email: 'candidate@example.com',
  sections: {},
  score: { total: 70 },
}

function promptFor(resume) {
  return buildResumeAnalysisPrompt({ ...baseResume, ...resume })
}

test('CS prompt requests context-aware analysis without requiring lab, publications, or certifications', () => {
  const prompt = promptFor({
    summary: 'Software engineer building web applications.',
    education: ['BS Computer Science'],
    experience: ['Software Engineer: built web services.'],
    projects: ['Resume Analyzer web application'],
    skills: ['JavaScript', 'Node.js'],
  })

  assert.match(prompt, /Resume structures vary significantly by field/i)
  assert.match(prompt, /Absence does not automatically mean deficiency/i)
  assert.match(prompt, /Do not use a universal checklist/i)
  assert.match(prompt, /not applicable/i)
  assert.doesNotMatch(prompt, /Laboratory Experience.*missing_relevant/i)
  assert.doesNotMatch(prompt, /Publications.*missing_relevant/i)
  assert.doesNotMatch(prompt, /Certifications.*missing_relevant/i)
  assert.match(prompt, /"overallScore"/)
  assert.match(prompt, /"overallScoreRationale"/)
  assert.match(prompt, /"qualityDimensions"/)
  assert.match(prompt, /contentRelevance/)
  assert.match(prompt, /skillsOrExpertiseStrength/)
  assert.match(prompt, /deterministicFacts/)
  assert.match(prompt, /objective evidence/i)
  assert.doesNotMatch(prompt, /"total": 70/)
  assert.doesNotMatch(prompt, /"atsCompatibility"/)
  assert.doesNotMatch(prompt, /"projectQuality"/)
  assert.doesNotMatch(prompt, /"quantifiedAchievements"/)
  assert.match(prompt, /"sectionAnalysis"/)
  assert.match(prompt, /missing_relevant/)
})

test('research resume prompt provides content for Gemini to identify research-oriented sections', () => {
  const prompt = promptFor({
    summary: 'Materials science researcher focused on polymer characterization.',
    education: ['PhD Materials Science'],
    experience: ['Researcher: designed experiments and analyzed microscopy results.'],
    projects: ['Polymer composite study'],
    sections: { researchExperience: true, laboratoryExperience: true },
  })

  assert.match(prompt, /polymer characterization/i)
  assert.match(prompt, /designed experiments/i)
  assert.match(prompt, /actual resume context/i)
  assert.match(prompt, /Do not invent evidence/i)
})

test('dynamic section schema permits domain-specific section names', () => {
  const prompt = promptFor({
    summary: 'Marketing strategist developing multi-channel campaigns.',
    experience: ['Marketing Manager: led campaign planning and measurement.'],
    skills: ['Campaign planning', 'Market research'],
  })

  assert.match(prompt, /marketing strategist/i)
  assert.match(prompt, /section name inferred from the resume context/i)
  assert.doesNotMatch(prompt, /allowed sections|must choose from/i)
})