const { retrieveChunks } = require('./retriever');
const { extractRequirements } = require('./jdExtractor');

const MATCH_THRESHOLD = 0.6;

async function mapWithConcurrency(items, worker, limit) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function matchResumeToJob(resumeId, jobDescription) {
  const requirements = await extractRequirements(jobDescription);
  const matches = await mapWithConcurrency(
    requirements,
    async (item) => {
      const [best] = await retrieveChunks(item.requirement, { resumeId, k: 1 });
      const similarity = best ? 1 - Number(best.distance) : 0;
      return { item, best, similarity };
    },
    5,
  );

  let totalWeight = 0;
  let coveredWeight = 0;
  const matched = [];
  const missing = [];

  for (const { item, best, similarity } of matches) {
    const weight = item.importance === 'must' ? 2 : 1;
    totalWeight += weight;
    if (similarity >= MATCH_THRESHOLD && best) {
      coveredWeight += weight * similarity;
      matched.push({
        requirement: item.requirement,
        importance: item.importance,
        similarity,
        evidence: { section: best.section, content: best.content },
      });
    } else {
      missing.push({
        requirement: item.requirement,
        importance: item.importance,
        bestSimilarity: similarity,
      });
    }
  }

  return {
    score: totalWeight ? Math.round((coveredWeight / totalWeight) * 100) : 0,
    matched,
    missing,
    threshold: MATCH_THRESHOLD,
  };
}

module.exports = { matchResumeToJob, MATCH_THRESHOLD };
