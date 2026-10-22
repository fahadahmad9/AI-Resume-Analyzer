const MAX_CHUNK_LENGTH = 800;
const ENTRY_SECTIONS = new Set(['experience', 'projects']);

function toContent(value) {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return Object.entries(value)
    .map(([key, item]) => {
      const content = typeof item === 'object' ? JSON.stringify(item) : String(item);
      return `${key}: ${content}`;
    })
    .join('\n')
    .trim();
}

function splitContent(content) {
  if (content.length <= MAX_CHUNK_LENGTH) return [content];

  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [content];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence.trim()}` : sentence.trim();
    if (current && next.length > MAX_CHUNK_LENGTH) {
      chunks.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);

  return chunks.flatMap((chunk) => {
    if (chunk.length <= MAX_CHUNK_LENGTH) return [chunk];
    return chunk.match(new RegExp(`.{1,${MAX_CHUNK_LENGTH}}(?:\\s|$)`, 'g')) || [chunk];
  }).map((chunk) => chunk.trim()).filter(Boolean);
}

function chunkResume(parsed) {
  if (!parsed || typeof parsed !== 'object') return [];

  const chunks = [];
  for (const [section, value] of Object.entries(parsed)) {
    if (ENTRY_SECTIONS.has(section) && Array.isArray(value)) {
      value.forEach((entry) => {
        splitContent(toContent(entry)).forEach((content) => chunks.push({ section, content }));
      });
    } else {
      splitContent(toContent(value)).forEach((content) => chunks.push({ section, content }));
    }
  }
  return chunks;
}

module.exports = { chunkResume };
