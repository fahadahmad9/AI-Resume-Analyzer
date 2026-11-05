const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const DEFAULT_PRIMARY_MODEL = 'gemini-3.6-flash';
const DEFAULT_FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];
const ATTEMPT_TIMEOUT_MS = 25000;

function getModels() {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || DEFAULT_FALLBACK_MODELS.join(','))
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

function getStatus(error) {
  const status = error?.status ?? error?.statusCode ?? error?.response?.status ?? error?.error?.code;
  if (Number(status)) return Number(status);
  if (/^UNAVAILABLE$/i.test(String(status))) return 503;
  if (/^(?:RESOURCE_EXHAUSTED|TOO_MANY_REQUESTS)$/i.test(String(status))) return 429;
  const message = String(error?.message || error || '');
  if (/\b404\b|not found|unsupported model/i.test(message)) return 404;
  if (/\b503\b|\bUNAVAILABLE\b/i.test(message)) return 503;
  if (/\b429\b|\bRESOURCE_EXHAUSTED\b|rate limit/i.test(message)) return 429;
  return null;
}

function isNetworkError(error) {
  return ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH', 'EAI_AGAIN'].includes(error?.code)
    || /network|fetch failed|socket|timed out|timeout/i.test(String(error?.message || ''));
}

function isRetryable(error) {
  return [429, 503].includes(getStatus(error)) || error?.code === 'GEMINI_TIMEOUT' || isNetworkError(error);
}

function timeoutError() {
  const error = new Error('Gemini request timed out after 25000ms');
  error.code = 'GEMINI_TIMEOUT';
  error.status = 408;
  return error;
}

async function attemptRequest(buildRequest, model) {
  let timer;
  const request = Promise.resolve().then(() => ai.models.generateContent(buildRequest(model)));
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(timeoutError()), ATTEMPT_TIMEOUT_MS);
  });

  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithFallback(buildRequest) {
  if (typeof buildRequest !== 'function') {
    throw new TypeError('buildRequest must be a function');
  }

  const attempts = [];
  let lastStatus = null;
  for (const model of getModels()) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const startedAt = Date.now();
      try {
        const response = await attemptRequest(buildRequest, model);
        console.log(`[gemini] model=${model} attempt=${attempt} status=ok ms=${Date.now() - startedAt}`);
        return { response, model };
      } catch (error) {
        const status = getStatus(error);
        lastStatus = status || error?.code || null;
        const displayStatus = status || error?.code || 'error';
        console.log(`[gemini] model=${model} attempt=${attempt} status=${displayStatus} ms=${Date.now() - startedAt}`);
        attempts.push(`${model}#${attempt}:${displayStatus}`);

        if ([400, 401, 403].includes(status)) {
          error.message = `Gemini request failed with status ${status}: ${error.message}`;
          throw error;
        }
        if (status === 404 || !isRetryable(error) || attempt === 2) {
          break;
        }
        const delay = 1000 + Math.floor(Math.random() * 1001);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const error = new Error(`All Gemini models failed (${attempts.join(', ')})`);
  error.status = lastStatus || 503;
  error.attempts = attempts;
  throw error;
}

module.exports = {
  ai,
  generateWithFallback,
};
