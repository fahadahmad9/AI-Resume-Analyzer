const express = require('express');

const {
  testGemini,
  analyzeResumeWithGemini
} = require('../services/geminiService');

const router = express.Router();

router.get('/test', async (req, res) => {
  try {
    const result = await testGemini();

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Gemini API error:', error);

    res.status(500).json({
      success: false,
      error: 'Gemini API request failed'
    });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { structuredResume } = req.body || {};

    if (!structuredResume || typeof structuredResume !== 'object' || Array.isArray(structuredResume)) {
      return res.status(400).json({
        success: false,
        error: 'structuredResume object is required'
      });
    }

    const result = await analyzeResumeWithGemini(structuredResume);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Gemini resume analysis error:', error);

    res.status(500).json({
      success: false,
      error: 'Gemini resume analysis request failed'
    });
  }
});

module.exports = router;