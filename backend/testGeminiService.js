require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function runTest() {
  console.log('Starting simple Gemini test...');
  console.log('API key exists:', Boolean(process.env.GEMINI_API_KEY));
  console.log('Calling Gemini...');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'Say hello in one short sentence.'
    });

    console.log('Gemini responded:');
    console.log(response.text);
  } catch (error) {
    console.error('Gemini error:', error);
  }
}

runTest();