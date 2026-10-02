const { Router } = require('express');
const multer = require('multer');
const PDFParser = require('pdf2json');
const { applyContextualScore, parseResumeText } = require('../utils/resumeParser');
const { extractEmbeddedPdfLinks } = require('../utils/pdfLinks');
const { analyzeResumeWithGemini, GeminiAnalysisError } = require('../services/geminiService');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function cleanExtractedText(text) {
  return String(text || '')
    .replace(/-{2,}\s*Page\s*\(\d+\)\s*Break\s*-{2,}/gi, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1);

    parser.on('pdfParser_dataError', (err) => reject(new Error(err.parserError)));

    parser.on('pdfParser_dataReady', () => {
      const raw = parser.getRawTextContent();
      const pageCount = parser.data?.Pages?.length ?? null;

      // pdf2json reads bottom-to-top — reverse lines to restore natural order
      const lines = raw.split(/\r?\n/);
      const pageBreakIndex = lines.findIndex(l => l.includes('----------------Page'));

      const contentLines = pageBreakIndex !== -1 ? lines.slice(0, pageBreakIndex) : lines;
      const remainder = pageBreakIndex !== -1 ? lines.slice(pageBreakIndex) : [];

      const text = cleanExtractedText([...contentLines.reverse(), ...remainder].join('\n'));

      resolve({ text, pageCount });
    });

    parser.parseBuffer(buffer);
  });
}

router.post('/parse', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Resume PDF is required.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are supported.' });
    }

    const [{ text: extractedText, pageCount }, embeddedLinks] = await Promise.all([
      extractTextFromPDF(req.file.buffer),
      extractEmbeddedPdfLinks(req.file.buffer),
    ]);
    let structuredResume = parseResumeText(extractedText, embeddedLinks);
    let aiAnalysis = null;
    let aiAnalysisError = null;

    try {
      aiAnalysis = await analyzeResumeWithGemini(structuredResume);
      structuredResume = applyContextualScore(structuredResume, aiAnalysis);
    } catch (error) {
      if (error instanceof GeminiAnalysisError) {
        aiAnalysisError = error.message;
        console.warn('Gemini resume analysis unavailable after retries.');
      } else {
        console.error('Gemini resume analysis failed:', error.message);
        aiAnalysisError = 'AI analysis failed. The resume was parsed successfully.';
      }
    }

    // DEBUG
    console.log('\n=== PROJECTS DEBUG ===');
    structuredResume.projects?.forEach((entry, i) => {
      console.log(`\n[Project Entry ${i + 1}]:\n${entry}`);
    });
    console.log('\n=== EXPERIENCE DEBUG ===');
    structuredResume.experience?.forEach((entry, i) => {
        console.log(`\n[Experience Entry ${i + 1}]:\n${entry}`);
    });
    console.log('======================\n');

    return res.json({
      message: 'Resume parsed successfully.',
      fileName: req.file.originalname,
      pageCount,
      structured: structuredResume,
      aiAnalysis,
      ...(aiAnalysisError ? { aiAnalysisError } : {}),
      text: extractedText,
      preview: extractedText.slice(0, 10000),
    });
  } catch (error) {
    console.error('Resume parse failed:', error);
    return res.status(500).json({
      message: error.message || 'Failed to parse resume PDF.',
    });
  }
});

module.exports = router;