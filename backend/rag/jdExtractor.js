const { ai } = require('../src/services/geminiService');

const MODEL = 'gemini-3.7-flash';
const CATEGORIES = new Set(['skill', 'experience', 'education', 'other']);
const IMPORTANCE = new Set(['must', 'nice']);

function parseJson(text) {
  const raw = String(text || '').trim();
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(unfenced);
}

function extractRequirements(jobDescription) {
  return ai.models.generateContent({
    model: MODEL,
    contents: [
      'Extract up to 25 short, atomic job requirements from this job description.',
      'Use exact technologies, concise experience requirements, education, or other qualifications.',
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
            category: { type: 'STRING', enum: ['skill', 'experience', 'education', 'other'] },
            importance: { type: 'STRING', enum: ['must', 'nice'] },
          },
          required: ['requirement', 'category', 'importance'],
        },
      },
    },
  }).then((response) => {
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
      };
    });
  });
}

module.exports = { extractRequirements };
