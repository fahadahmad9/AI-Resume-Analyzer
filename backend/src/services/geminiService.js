const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const MAX_GEMINI_ATTEMPTS = 4;
const INITIAL_RETRY_DELAY_MS = 1000;

class GeminiAnalysisError extends Error {
  constructor(message = 'AI analysis is temporarily unavailable. Please try again later.') {
    super(message);
    this.name = 'GeminiAnalysisError';
    this.code = 'GEMINI_ANALYSIS_UNAVAILABLE';
    this.statusCode = 503;
  }
}

function getGeminiErrorStatus(error) {
  const status = error?.status ?? error?.statusCode ?? error?.response?.status ?? error?.error?.code;
  if (Number(status)) return Number(status);
  if (/^UNAVAILABLE$/i.test(String(status))) return 503;
  if (/^(?:RESOURCE_EXHAUSTED|TOO_MANY_REQUESTS)$/i.test(String(status))) return 429;

  const message = String(error?.message || error || '');
  if (/\b503\b|\bUNAVAILABLE\b/i.test(message)) return 503;
  if (/\b429\b|\bRESOURCE_EXHAUSTED\b|rate limit/i.test(message)) return 429;
  return null;
}

function isTransientGeminiError(error) {
  const status = getGeminiErrorStatus(error);
  return status === 503 || status === 429;
}

function getRetryAfterMs(error) {
  const retryAfter = error?.headers?.['retry-after']
    ?? error?.headers?.get?.('retry-after')
    ?? error?.response?.headers?.['retry-after'];
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

function getGeminiErrorMetadata(error) {
  return {
    name: error?.name,
    status: getGeminiErrorStatus(error),
    message: String(error?.message || error || ''),
  };
}

async function generateContentWithRetry(generateContent, options = {}) {
  const maxAttempts = options.maxAttempts || MAX_GEMINI_ATTEMPTS;
  const initialDelayMs = options.initialDelayMs ?? INITIAL_RETRY_DELAY_MS;
  const sleep = options.sleep || ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const logger = options.logger || console;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateContent();
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt === maxAttempts) {
        if (isTransientGeminiError(error)) {
          logger.error?.('Gemini request failed after retries.', getGeminiErrorMetadata(error));
          throw new GeminiAnalysisError();
        }
        throw error;
      }

      const status = getGeminiErrorStatus(error);
      const delayMs = getRetryAfterMs(error) ?? initialDelayMs * (2 ** (attempt - 1));
      logger.warn(`Gemini request failed with ${status}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxAttempts})...`);
      await sleep(delayMs);
    }
  }

  throw new GeminiAnalysisError();
}

async function testGemini() {
  const response = await generateContentWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'Say hello to my AI Resume Analyzer in one short sentence.'
    }));

  return response.text;
}

function extractJsonFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : raw;

  try {
    return JSON.parse(candidate);
  } catch (_error) {
    return null;
  }
}

function buildResumeAnalysisPrompt(structuredResume) {
  const { score, ...resumeContent } = structuredResume || {}
  const analysisInput = {
    ...resumeContent,
    deterministicFacts: score?.deterministicFacts || {},
  }

  return [
    'You are an expert resume quality reviewer.',
    'Analyze the provided structured resume JSON for contextual resume quality.',
    'Resume structures vary significantly by field, industry, career stage, and application purpose.',
    'Infer the apparent domain or field and resume purpose from the actual resume context. Do not assume the candidate is applying for a software or technical role.',
    'Determine which sections are present, relevant, optional or low-priority, relevant but missing, and not applicable to this specific resume.',
    'Absence does not automatically mean deficiency. Do not penalize omission of an irrelevant section.',
    'Use only section names supported by the resume context. Do not use a universal checklist or assume any predefined section list.',
    'Use exactly these section statuses: present, missing_relevant, optional, not_applicable.',
    'Use relevance values high, medium, or low.',
    'Do not invent evidence. Each reason must be based on actual content in the structured resume, or explain that the section is not applicable or optional without claiming unsupported facts.',
    'Use deterministicFacts as objective evidence, but do not apply universal weights, penalties, caps, or thresholds to them.',
    'Infer the final overall score from the resume domain, purpose, relevant sections, and contextual quality. The overall score must reflect contextual judgment rather than a fixed checklist.',
    'Evaluate only the generic quality dimensions that are meaningful for this resume. Omit any dimension that is not meaningful instead of forcing it onto the resume.',
    'Use these optional generic dimensions when supported by the resume evidence: contentRelevance, contentClarity, evidenceOfImpact, experienceStrength, skillsOrExpertiseStrength, overallProfessionalQuality.',
    'Each included quality dimension must have a score from 0 to 100 and concise evidence-based findings.',
    'The resume has already been extracted. Do not re-extract fields.',
    'Do not rewrite the resume.',
    'Do not do job-description matching.',
    'Return only valid JSON (no markdown, no code fences) using this exact top-level shape:',
    '{',
    '  "overallScore": 0-100,',
    '  "overallScoreRationale": "brief context-based explanation",',
    '  "qualityDimensions": {',
    '    "contentRelevance": { "score": 0-100, "findings": ["..."] },',
    '    "contentClarity": { "score": 0-100, "findings": ["..."] },',
    '    "evidenceOfImpact": { "score": 0-100, "findings": ["..."] },',
    '    "experienceStrength": { "score": 0-100, "findings": ["..."] },',
    '    "skillsOrExpertiseStrength": { "score": 0-100, "findings": ["..."] },',
    '    "overallProfessionalQuality": { "score": 0-100, "findings": ["..."] }',
    '  },',
    '  "overallStrengths": ["..."],',
    '  "overallWeaknesses": ["..."],',
    '  "priorityImprovements": ["..."],',
    '  "sectionAnalysis": {',
    '    "domain": "inferred domain or field",',
    '    "resumePurpose": "inferred resume purpose or target",',
    '    "sections": [',
    '      {',
    '        "name": "section name inferred from the resume context",',
    '        "status": "present | missing_relevant | optional | not_applicable",',
    '        "relevance": "high | medium | low",',
    '        "reason": "brief evidence-based explanation"',
    '      }',
    '    ]',
    '  }',
    '}',
    'Keep findings and section reasons concise and actionable.',
    `Structured resume JSON:\n${JSON.stringify(analysisInput, null, 2)}`,
  ].join('\n');
}

async function analyzeResumeWithGemini(structuredResume) {
  if (!structuredResume || typeof structuredResume !== 'object') {
    throw new Error('A valid structuredResume object is required.');
  }

  const prompt = buildResumeAnalysisPrompt(structuredResume);

  const response = await generateContentWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    }));

  const text = response.text || '';
  const parsed = extractJsonFromText(text);

  if (parsed) {
    return parsed;
  }

  return {
    rawText: text,
  };
}

module.exports = {
  testGemini,
  analyzeResumeWithGemini,
  buildResumeAnalysisPrompt,
  GeminiAnalysisError,
  generateContentWithRetry,
};