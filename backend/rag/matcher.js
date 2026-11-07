const { hybridRetrieve } = require('./retriever');
const { embedTexts } = require('./embedder');
const { extractRequirements } = require('./jdExtractor');
const { EVIDENCE_SECTIONS } = require('./chunker');
const { generateWithFallback } = require('../src/services/geminiClient');
const pool = require('../db/pool');

const configuredThreshold = Number(process.env.MATCH_THRESHOLD);
const MATCH_THRESHOLD = Number.isFinite(configuredThreshold)
  ? configuredThreshold
  : 0.55;
const RETRIEVAL_COUNT = 4;
const PRACTICAL_SECTIONS = new Set(['experience', 'projects']);
const PRACTICAL_TERMS = /\b(?:built|created|developed|implemented|integrated|deployed|designed|used|using|worked|maintained|managed|delivered|led|applied|programmed|automated|optimized|analysed|analyzed)\b/i;

function hasMeaningfulContent(content) {
  if (typeof content !== 'string' || !content.trim()) return false;

  const trimmed = content.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (parsed && typeof parsed === 'object') return Object.keys(parsed).length > 0;
    return Boolean(parsed);
  } catch {
    const meaningfulLines = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^[^:]+:\s*(?:\[\]|\{\}|null|undefined|["']{2})$/i.test(line));
    return meaningfulLines.length > 0;
  }
}

function isValidEvidence(best) {
  return Boolean(
    best
    && EVIDENCE_SECTIONS.has(best.section)
    && hasMeaningfulContent(best.content),
  );
}

function splitAlternatives(requirement) {
  if (!/\bor\b/i.test(requirement)) return [requirement];
  return requirement
    .replace(/,\s*or\s+/gi, ',')
    .split(/\s+or\s+|,/i)
    .map((alternative) => alternative.trim())
    .filter(Boolean);
}

function buildRequirementQueries(requirement) {
  return [requirement, ...splitAlternatives(requirement)
    .filter((alternative) => alternative !== requirement)];
}

function normalizeConcept(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function splitConcepts(requirement) {
  return String(requirement || '')
    .split(/\s+(?:and|&)\s+/i)
    .map((concept) => concept
      .trim()
      .replace(/^(?:basic|working|strong|solid)\s+(?:knowledge|understanding)\s+of\s+/i, '')
      .replace(/^(?:experience|proficiency)\s+(?:with|in)\s+/i, '')
      .replace(/\s+(?:experience|knowledge|understanding|proficiency|development|skills?)$/i, '')
      .trim())
    .filter(Boolean);
}

function conceptPatterns(concept) {
  const normalized = normalizeConcept(concept);
  const patterns = [normalized];

  if (normalized === 'google cloud' || normalized === 'google cloud platform') {
    patterns.push('gcp', 'google cloud platform');
  }
  if (normalized === 'relational database' || normalized === 'relational databases') {
    patterns.push('postgresql', 'mysql', 'sqlite', 'oracle', 'sql server', 'relational database');
  }
  if (normalized === 'object oriented programming' || normalized === 'object oriented') {
    patterns.push('oop', 'object oriented programming');
  }

  return patterns;
}

function evidenceSupportsConcept(concept, evidence) {
  if (!isValidEvidence(evidence)) return false;
  const content = ` ${normalizeConcept(evidence.content)} `;
  return conceptPatterns(concept).some((pattern) => content.includes(` ${pattern} `));
}

function hasPracticalEvidence(concept, evidence) {
  return evidence.some((candidate) => (
    evidenceSupportsConcept(concept, candidate)
    && (PRACTICAL_SECTIONS.has(candidate.section) || PRACTICAL_TERMS.test(candidate.content))
  ));
}

function classifyRequirement(item, evidenceTop3, threshold = MATCH_THRESHOLD) {
  const candidates = evidenceTop3.filter((candidate) => (
    isValidEvidence(candidate) && Number(candidate.similarity) >= threshold
  ));
  const alternatives = splitAlternatives(item.requirement);
  const alternativeResults = alternatives.map((alternative) => {
    const concepts = splitConcepts(alternative);
    const supportedConcepts = concepts.filter((concept) => (
      candidates.some((candidate) => evidenceSupportsConcept(concept, candidate))
    ));
    const practicalConcepts = item.category === 'experience'
      ? concepts.filter((concept) => hasPracticalEvidence(concept, candidates))
      : supportedConcepts;

    return {
      alternative,
      concepts,
      supportedConcepts,
      practicalConcepts,
      matched: supportedConcepts.length === concepts.length
        && practicalConcepts.length === concepts.length,
    };
  });
  const matchedAlternative = alternativeResults.find((result) => result.matched);
  const partialAlternative = alternativeResults.find((result) => (
    result.supportedConcepts.length > 0
    && result.supportedConcepts.length < result.concepts.length
  ));

  if (matchedAlternative) {
    return {
      status: 'matched',
      explanation: `Evidence explicitly supports ${matchedAlternative.alternative}.`,
      supportedConcepts: matchedAlternative.supportedConcepts,
    };
  }
  if (partialAlternative) {
    return {
      status: 'partially_matched',
      explanation: `Evidence supports ${partialAlternative.supportedConcepts.join(', ')}, but not the complete requirement.`,
      supportedConcepts: partialAlternative.supportedConcepts,
    };
  }
  if (item.category === 'experience' && alternativeResults.some((result) => (
    result.supportedConcepts.length > 0
  ))) {
    return {
      status: 'partially_matched',
      explanation: 'The resume explicitly mentions the requirement but does not demonstrate practical experience.',
      supportedConcepts: alternativeResults.flatMap((result) => result.supportedConcepts),
    };
  }

  return {
    status: 'missing',
    explanation: 'No retrieved evidence explicitly supports the requirement.',
    supportedConcepts: [],
  };
}

async function mapWithConcurrency(items, worker, limit) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function parseJudgeResponse(text) {
  const raw = String(text || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Gemini judge returned invalid JSON');
  return parsed;
}

function supportingTermInResume(rawText, supportingTerm) {
  if (typeof supportingTerm !== 'string' || !supportingTerm.trim()) return false;
  const text = String(rawText || '').replace(/\s+/g, ' ');
  const term = supportingTerm.trim().replace(/\s+/g, ' ');
  const variants = [term];
  if (/restful/i.test(term) || /rest\s+api/i.test(term)) {
    variants.push(term.replace(/restful/ig, 'REST API').replace(/rest\s+api/ig, 'REST API'));
  }
  return variants.some((variant) => {
    const pattern = variant
      .split(/\s+/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');
    return new RegExp(`(^|[^\\p{L}\\p{N}_])${pattern}([^\\p{L}\\p{N}_]|$)`, 'iu').test(text);
  });
}

function findSupportingTerm(content, keywords) {
  return keywords.find((keyword) => supportingTermInResume(content, keyword)) || null;
}

async function judgeEvidence(requirementInputs) {
  const result = await generateWithFallback((model) => ({
    model,
    contents: [
      'Judge whether each job requirement is supported by the provided resume evidence.',
      'Use ONLY the evidence provided for that requirement. Never assume skills that are not stated.',
      'Use "partial" only when evidence strongly implies the requirement but does not state it (for example, a CS degree for object-oriented programming).',
      'Similar-but-different technologies are not_met; Google Cloud Vision is not Google Cloud.',
      'skills_* chunks are parser-generated and may contain inferred items. For met or partial, supportingTerm must be an exact word or phrase verifiable in the resume verbatim text. Do not use inferred skills from skills_* chunks, and do not treat related-but-different products or technologies as supporting terms.',
      'Return one result per requirement. evidenceChunkId must be one of that requirement’s provided chunk ids.',
      JSON.stringify(requirementInputs),
    ].join('\n\n'),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            verdict: { type: 'STRING', enum: ['met', 'partial', 'not_met'] },
            evidenceChunkId: { type: 'STRING' },
            supportingTerm: { type: 'STRING' },
            reason: { type: 'STRING' },
          },
          required: ['id', 'verdict', 'evidenceChunkId', 'supportingTerm', 'reason'],
        },
      },
    },
  }));
  const parsed = parseJudgeResponse(result.response.text);
  const byId = new Map(parsed.map((item) => [String(item.id), item]));
  if (byId.size !== requirementInputs.length) throw new Error('Gemini judge omitted requirements');
  return requirementInputs.map((input) => {
    const item = byId.get(input.id);
    if (!item) {
      return {
        id: input.id,
        verdict: 'not_met',
        evidenceChunkId: null,
        supportingTerm: null,
        reason: 'No valid supporting evidence was selected.',
        downgraded: false,
      };
    }
    const validEvidence = input.evidence.some((chunk) => String(chunk.id) === String(item.evidenceChunkId));
    const selectedEvidence = input.evidence.find((chunk) => String(chunk.id) === String(item.evidenceChunkId));
    const validSupportingTerm = item.verdict === 'not_met'
      || supportingTermInResume(selectedEvidence?.content, item.supportingTerm);
    if (!validEvidence || !validSupportingTerm || !['met', 'partial', 'not_met'].includes(item.verdict)) {
      return {
        id: input.id,
        verdict: 'not_met',
        evidenceChunkId: null,
        supportingTerm: null,
        reason: 'No valid supporting evidence was selected.',
        downgraded: false,
      };
    }
    return {
      id: input.id,
      verdict: item.verdict,
      evidenceChunkId: item.evidenceChunkId,
      supportingTerm: ['met', 'partial'].includes(item.verdict)
        ? String(item.supportingTerm || '').trim()
        : null,
      reason: String(item.reason || '').trim().split(/\s+/).slice(0, 20).join(' ') || 'Evidence was evaluated.',
      downgraded: false,
    };
  });
}

function fallbackVerdict(match, keywords = []) {
  const best = match.evidenceTop4[0];
  if (best && (best.keywordHit || Number(best.similarity) >= MATCH_THRESHOLD)) {
    const supportingTerm = findSupportingTerm(best.content, keywords);
    return {
      verdict: 'met',
      evidenceChunkId: best.id,
      supportingTerm,
      reason: best.keywordHit ? 'An exact requirement keyword appears in the evidence.' : 'The best evidence passed the similarity threshold.',
      downgraded: false,
    };
  }
  return {
    verdict: 'not_met',
    evidenceChunkId: null,
    supportingTerm: null,
    reason: 'No evidence passed the keyword or similarity fallback rule.',
    downgraded: false,
  };
}

function matchedBy(evidence) {
  const keyword = evidence.some((chunk) => chunk.keywordHit);
  const semantic = evidence.some((chunk) => Number(chunk.similarity) >= MATCH_THRESHOLD);
  if (keyword && semantic) return 'both';
  if (keyword) return 'keyword';
  if (semantic) return 'semantic';
  return null;
}

async function matchResumeToJob(resumeId, jobDescription) {
  const requirements = await extractRequirements(jobDescription);
  const queryInputs = requirements.flatMap((item, requirementIndex) => (
    buildRequirementQueries(item.requirement).map((query, queryIndex) => ({
      requirementIndex,
      queryIndex,
      query: `${query}${item.keywords?.length ? ` ${item.keywords.join(' ')}` : ''}`,
      keywords: item.keywords || [],
    }))
  ));
  const queryEmbeddings = await embedTexts(
    queryInputs.map((input) => input.query),
    'RETRIEVAL_QUERY',
  );
  const queryResults = await mapWithConcurrency(
    queryInputs,
    (input, index) => hybridRetrieve({
      resumeId,
      queryEmbedding: queryEmbeddings[index],
      queryText: input.query,
      keywords: input.keywords,
      k: RETRIEVAL_COUNT,
    }),
    5,
  );
  const matches = await mapWithConcurrency(
    requirements,
    async (item, requirementIndex) => {
      const candidates = queryResults
        .filter((_, index) => queryInputs[index].requirementIndex === requirementIndex)
        .flat()
        .filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index)
        .sort((left, right) => Number(right.rrf) - Number(left.rrf))
        .slice(0, RETRIEVAL_COUNT);
      console.log(`[rag] retrieval requirement=${item.requirement} candidates=${candidates.length}`);
      const evidenceTop4 = candidates.filter(isValidEvidence).map((candidate) => ({
        id: candidate.id,
        section: candidate.section,
        chunk_type: candidate.chunk_type,
        title: candidate.title,
        content: candidate.content,
        similarity: Number(candidate.similarity) || 0,
        rrf: Number(candidate.rrf) || 0,
        keywordHit: Boolean(candidate.keywordHit),
      }));
      return { item, evidenceTop4 };
    },
    5,
  );

  const judgeInputs = matches.map(({ item, evidenceTop4 }, index) => ({
    id: `r${index}`,
    requirement: item.requirement,
    evidence: evidenceTop4.map((chunk) => ({ id: String(chunk.id), content: chunk.content })),
  }));
  let judgeResults;
  let judge = 'gemini';
  const resumeResult = await pool.query('SELECT raw_text FROM resumes WHERE id = $1', [resumeId]);
  if (!resumeResult.rows.length) throw new Error(`Resume ${resumeId} was not found`);
  const rawText = resumeResult.rows[0].raw_text;
  try {
    judgeResults = await judgeEvidence(judgeInputs);
  } catch (error) {
    judge = 'fallback';
    console.warn(`[rag] evidence judge unavailable: ${error.message}`);
    judgeResults = matches.map((match, index) => ({
      id: `r${index}`,
      ...fallbackVerdict(match, match.item.keywords || []),
    }));
  }
  judgeResults = judgeResults.map((result, index) => {
    if (
      ['met', 'partial'].includes(result.verdict)
      && !supportingTermInResume(rawText, result.supportingTerm)
    ) {
      console.warn(`[rag] downgraded requirement=${requirements[index].requirement} term=${result.supportingTerm || ''}`);
      return {
        ...result,
        verdict: 'not_met',
        reason: 'Claimed evidence not found in resume text',
        supportingTerm: result.supportingTerm || null,
        downgraded: true,
      };
    }
    return { ...result, downgraded: false };
  });

  let totalWeight = 0;
  let coveredWeight = 0;
  let requirementsMatched = 0;
  let mustMatched = 0;
  let mustTotal = 0;
  let niceMatched = 0;
  let niceTotal = 0;
  let partial = 0;
  const matched = [];
  const missing = [];
  const partiallyMatched = [];
  const notAssessed = [];

  for (const [index, { item, evidenceTop4 }] of matches.entries()) {
    const verdict = judgeResults[index] || fallbackVerdict({ evidenceTop4 }, item.keywords || []);
    const best = evidenceTop4.find((candidate) => (
      verdict.evidenceChunkId != null
      && String(candidate.id) === String(verdict.evidenceChunkId)
    )) || evidenceTop4[0] || null;
    const similarity = best ? Number(best.similarity) : 0;
    const evidenceAll = evidenceTop4.slice(0, 3).map((candidate) => ({
      chunk_type: candidate.chunk_type,
      title: candidate.title,
      snippet: candidate.content.slice(0, 280),
    }));
    if (item.category === 'soft_skill') {
      notAssessed.push({
        requirement: item.requirement,
        importance: item.importance,
        status: 'not_assessed',
        note: 'Soft-skill requirements are not assessed by semantic resume matching.',
        explanation: 'Soft-skill requirements are not assessed by semantic resume matching.',
        evidenceTop3: evidenceTop4.slice(0, 3),
        verdict: 'not_assessed',
        reason: 'Soft-skill requirements are not assessed by semantic resume matching.',
        matchedBy: null,
        evidenceAll,
        supportingTerm: null,
        downgraded: false,
      });
      continue;
    }
    const weight = item.importance === 'must' ? 2 : 1;
    totalWeight += weight;
    if (item.importance === 'must') mustTotal += 1;
    else niceTotal += 1;
    const status = verdict.verdict === 'met'
      ? 'matched'
      : verdict.verdict === 'partial' ? 'partially_matched' : 'missing';
    const itemResult = {
      requirement: item.requirement,
      importance: item.importance,
      similarity,
      evidence: best ? { section: best.section, content: best.content } : null,
      evidenceTop3: evidenceTop4.slice(0, 3),
      evidenceAll,
      status,
      verdict: verdict.verdict,
      reason: verdict.reason,
      explanation: verdict.reason,
      matchedBy: matchedBy(evidenceTop4),
      judge,
      supportingTerm: verdict.supportingTerm || null,
      downgraded: Boolean(verdict.downgraded),
    };
    if (verdict.verdict === 'met') {
      coveredWeight += weight;
      requirementsMatched += 1;
      if (item.importance === 'must') mustMatched += 1;
      else niceMatched += 1;
      console.log(`[rag] match requirement=${item.requirement} status=matched`);
      matched.push(itemResult);
    } else if (verdict.verdict === 'partial') {
      coveredWeight += weight / 2;
      partial += 1;
      console.log(`[rag] match requirement=${item.requirement} status=partially_matched`);
      partiallyMatched.push(itemResult);
    } else {
      console.log(`[rag] match requirement=${item.requirement} status=missing`);
      missing.push(itemResult);
    }
  }

  return {
    score: totalWeight ? Math.round((coveredWeight / totalWeight) * 100) : 0,
    matched,
    partiallyMatched,
    missing,
    threshold: MATCH_THRESHOLD,
    requirementsTotal: mustTotal + niceTotal,
    requirementsMatched,
    scoreBreakdown: {
      mustMatched,
      mustTotal,
      niceMatched,
      niceTotal,
      mustMet: mustMatched,
      niceMet: niceMatched,
      partial,
    },
    notAssessed,
    judge,
  };
}

module.exports = {
  matchResumeToJob,
  MATCH_THRESHOLD,
  hasMeaningfulContent,
  isValidEvidence,
  splitAlternatives,
  buildRequirementQueries,
  normalizeConcept,
  splitConcepts,
  evidenceSupportsConcept,
  classifyRequirement,
  parseJudgeResponse,
  supportingTermInResume,
  findSupportingTerm,
  fallbackVerdict,
  matchedBy,
};
