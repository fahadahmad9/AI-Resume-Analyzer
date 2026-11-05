const { Router } = require('express');
const multer = require('multer');
const PDFParser = require('pdf2json');
const { applyContextualScore, parseResumeText } = require('../utils/resumeParser');
const { extractEmbeddedPdfLinks } = require('../utils/pdfLinks');
const { analyzeResumeWithGemini, GeminiAnalysisError } = require('../services/geminiService');
const { ingestResume } = require('../../rag/ingest');
const { matchResumeToJob } = require('../../rag/matcher');
const pool = require('../../db/pool');

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
  const requestStartedAt = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Resume PDF is required.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are supported.' });
    }

    const extractionStartedAt = Date.now();
    const [{ text: extractedText, pageCount }, embeddedLinks] = await Promise.all([
      extractTextFromPDF(req.file.buffer),
      extractEmbeddedPdfLinks(req.file.buffer),
    ]);
    console.log(`[timing] PDF extraction ms=${Date.now() - extractionStartedAt}`);

    const parsingStartedAt = Date.now();
    let structuredResume = parseResumeText(extractedText, embeddedLinks);
    console.log(`[timing] parsing/scoring ms=${Date.now() - parsingStartedAt}`);
    let aiAnalysis = null;
    let aiAnalysisError = null;
    let resumeId = null;

    const [analysisResult, ingestionResult] = await Promise.allSettled([
      analyzeResumeWithGemini(structuredResume),
      ingestResume({
        filename: req.file.originalname,
        rawText: extractedText,
        parsed: structuredResume,
      }),
    ]);

    if (analysisResult.status === 'fulfilled') {
      aiAnalysis = analysisResult.value;
      structuredResume = applyContextualScore(structuredResume, aiAnalysis);
    } else {
      const error = analysisResult.reason;
      if (error instanceof GeminiAnalysisError) {
        aiAnalysisError = error.message;
        console.warn('Gemini resume analysis unavailable after retries.');
      } else {
        console.error('Gemini resume analysis failed:', error.message);
        aiAnalysisError = 'AI analysis failed. The resume was parsed successfully.';
      }
    }

    if (ingestionResult.status === 'fulfilled') {
      ({ resumeId } = ingestionResult.value);
    } else {
      console.error(`[ingest] failed ${ingestionResult.reason?.message || ingestionResult.reason}`);
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
    console.log(`[timing] total request ms=${Date.now() - requestStartedAt}`);

    return res.json({
      message: 'Resume parsed successfully.',
      resumeId,
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

router.post('/:id/match', async (req, res) => {
  const resumeId = Number(req.params.id);
  const { jobDescription } = req.body || {};

  if (!Number.isInteger(resumeId) || resumeId < 1) {
    return res.status(400).json({ message: 'A valid resume id is required.' });
  }
  if (typeof jobDescription !== 'string' || jobDescription.trim().length < 50) {
    return res.status(400).json({ message: 'jobDescription must be at least 50 characters.' });
  }

  try {
    const resume = await pool.query('SELECT id FROM resumes WHERE id = $1', [resumeId]);
    if (resume.rowCount === 0) {
      return res.status(404).json({ message: 'Resume not found.' });
    }

    return res.json(await matchResumeToJob(resumeId, jobDescription.trim()));
  } catch (error) {
    console.error('Resume job match failed:', error);
    return res.status(500).json({ message: 'Failed to match resume to job description.' });
  }
});

module.exports = router;