const { generateWithFallback } = require('../src/services/geminiClient');
const CATEGORIES = new Set(['skill', 'experience', 'education', 'soft_skill', 'other']);
const IMPORTANCE = new Set(['must', 'nice']);

function parseJson(text) {
  const raw = String(text || '').trim();
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(unfenced);
}

function sanitizeKeywords(value, category) {
  if (category === 'soft_skill' || !Array.isArray(value)) return [];
  return value
    .filter((term) => typeof term === 'string')
    .map((term) => term.trim().replace(/\s+/g, ' '))
    .filter((term) => term && term.length <= 80)
    .filter((term, index, terms) => terms.findIndex((item) => item.toLowerCase() === term.toLowerCase()) === index)
    .slice(0, 6);
}

function extractRequirements(jobDescription) {
  return generateWithFallback((model) => ({
    model,
    contents: [
      'Extract up to 25 short, atomic job requirements from this job description.',
      'Use exact technologies, concise experience requirements, education, or other qualifications.',
      'Keep alternatives joined as one requirement: "React or Node.js" and "X, Y, or Z" must each be one requirement, satisfied if any alternative is met.',
      'Classify communication, teamwork, problem-solving, leadership, and similar interpersonal requirements as soft_skill.',
      'For each non-soft requirement, provide up to 6 concise keywords that would literally appear on a resume when satisfied. Use an empty array for soft_skill.',
      'Return JSON only.',
      jobDescription,
    ].join('\n\n'),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            requirement: { type: 'STRING' },
            category: { type: 'STRING', enum: ['skill', 'experience', 'education', 'soft_skill', 'other'] },
            importance: { type: 'STRING', enum: ['must', 'nice'] },
            keywords: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['requirement', 'category', 'importance', 'keywords'],
        },
      },
    },
  })).then(({ response }) => {
    const parsed = parseJson(response.text);
    if (!Array.isArray(parsed) || parsed.length > 25) {
      throw new Error('Gemini returned invalid job requirements');
    }

    return parsed.map((item) => {
      if (
        !item
        || typeof item.requirement !== 'string'
        || !item.requirement.trim()
        || !CATEGORIES.has(item.category)
        || !IMPORTANCE.has(item.importance)
      ) {
        throw new Error('Gemini returned invalid job requirements');
      }
      return {
        requirement: item.requirement.trim(),
        category: item.category,
        importance: item.importance,
        keywords: sanitizeKeywords(item.keywords, item.category),
      };
    });
  });
}

module.exports = { extractRequirements, sanitizeKeywords, parseJson };
