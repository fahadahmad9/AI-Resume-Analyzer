const assert = require('node:assert/strict')
const test = require('node:test')

const {
  GeminiAnalysisError,
  generateContentWithRetry,
} = require('./src/services/geminiService')

const transientError = (status) => Object.assign(new Error(`temporary ${status}`), { status })

function retryOptions() {
  return {
    initialDelayMs: 0,
    sleep: async () => {},
    logger: { warn: () => {} },
  }
}

test('returns a successful first request without retrying', async () => {
  let calls = 0
  const result = await generateContentWithRetry(async () => {
    calls += 1
    return { text: 'success' }
  }, retryOptions())

  assert.deepEqual(result, { text: 'success' })
  assert.equal(calls, 1)
})

test('retries one 503 and returns the successful result', async () => {
  let calls = 0
  const result = await generateContentWithRetry(async () => {
    calls += 1
    if (calls === 1) throw transientError(503)
    return { text: 'success' }
  }, retryOptions())

  assert.deepEqual(result, { text: 'success' })
  assert.equal(calls, 2)
})

test('retries two 503 responses before succeeding', async () => {
  let calls = 0
  const result = await generateContentWithRetry(async () => {
    calls += 1
    if (calls < 3) throw transientError(503)
    return { text: 'success' }
  }, retryOptions())

  assert.deepEqual(result, { text: 'success' })
  assert.equal(calls, 3)
})

test('stops after four transient failures with a controlled error', async () => {
  let calls = 0
  await assert.rejects(
    () => generateContentWithRetry(async () => {
      calls += 1
      throw transientError(503)
    }, retryOptions()),
    (error) => error instanceof GeminiAnalysisError
      && error.code === 'GEMINI_ANALYSIS_UNAVAILABLE'
      && error.statusCode === 503,
  )
  assert.equal(calls, 4)
})

test('retries a 429 response before succeeding', async () => {
  let calls = 0
  const result = await generateContentWithRetry(async () => {
    calls += 1
    if (calls === 1) throw transientError(429)
    return { text: 'success' }
  }, retryOptions())

  assert.deepEqual(result, { text: 'success' })
  assert.equal(calls, 2)
})

test('does not retry permanent 4xx errors', async () => {
  let calls = 0
  const error = Object.assign(new Error('invalid API key'), { status: 401 })

  await assert.rejects(
    () => generateContentWithRetry(async () => {
      calls += 1
      throw error
    }, retryOptions()),
    error,
  )
  assert.equal(calls, 1)
})