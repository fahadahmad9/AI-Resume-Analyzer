const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-embedding-001';
const BATCH_SIZE = 16;

async function embedBatch(texts, taskType) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ai.models.embedContent({
        model: MODEL,
        contents: texts,
        config: {
          ...(taskType ? { taskType } : {}),
          outputDimensionality: 768,
        },
      });
      const embeddings = response.embeddings || [];
      if (embeddings.length !== texts.length) {
        throw new Error('Gemini returned an unexpected number of embeddings');
      }
      return embeddings.map((item) => {
        if (!item.values || item.values.length !== 768) {
          throw new Error('Gemini returned an embedding with an unexpected dimension');
        }
        return item.values;
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function embedTexts(texts, taskType) {
  if (!Array.isArray(texts)) throw new TypeError('texts must be an array');
  const embeddings = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    embeddings.push(...await embedBatch(texts.slice(i, i + BATCH_SIZE), taskType));
  }
  return embeddings;
}

module.exports = { embedTexts };
