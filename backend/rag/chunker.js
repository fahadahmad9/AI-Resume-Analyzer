const MAX_ENTRY_LENGTH = 1000;
const RAW_WINDOW_LENGTH = 600;
const RAW_WINDOW_OVERLAP = 120;
const ENTRY_SECTIONS = new Set(['experience', 'projects']);
const EVIDENCE_SECTIONS = new Set([
  'summary',
  'education',
  'experience',
  'projects',
  'skills',
  'certifications',
  'activities',
  'laboratoryExperience',
  'other',
  'raw_window',
]);
const EXCLUDED_SECTIONS = new Set([
  'score',
  'sections',
  'profiles',
  'socialLinks',
  'name',
  'email',
  'phone',
  'skillProvenance',
]);
const SECTION_LABELS = {
  laboratoryExperience: 'Laboratory Experience',
};

function toContent(value) {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(', ')
      .trim();
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) return '';
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`)
    .join('\n')
    .trim();
}

function splitSentences(content, limit = MAX_ENTRY_LENGTH) {
  if (content.length <= limit) return [content];
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [content];
  const parts = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const next = current ? `${current} ${trimmed}` : trimmed;
    if (current && next.length > limit) {
      parts.push(current);
      current = trimmed;
    } else {
      current = next;
    }
  }
  if (current) parts.push(current);
  return parts.flatMap((part) => {
    if (part.length <= limit) return [part];
    const words = part.split(/\s+/);
    const result = [];
    let currentPart = '';
    words.forEach((word) => {
      const next = currentPart ? `${currentPart} ${word}` : word;
      if (currentPart && next.length > limit) {
        result.push(currentPart);
        currentPart = word;
      } else {
        currentPart = next;
      }
    });
    if (currentPart) result.push(currentPart);
    return result;
  });
}

function formatEducationEntry(entry) {
  if (typeof entry === 'string') return entry.trim();
  if (!entry || typeof entry !== 'object') return '';

  const degree = entry.degree || entry.qualification || entry.program || '';
  const field = entry.field || entry.major || entry.specialization || '';
  const institution = entry.institution || entry.university || entry.school || '';
  const location = entry.location || entry.city || '';
  const start = entry.startYear || entry.startDate || entry.from || '';
  const end = entry.endYear || entry.endDate || entry.to || '';
  const qualification = [degree, field].filter(Boolean).join(' in ');
  const place = [institution, location].filter(Boolean).join(', ');
  const dates = start || end ? `${start}${start && end ? '-' : ''}${end}` : '';
  return [qualification, place, dates].filter(Boolean).join(', ').trim() || toContent(entry);
}

function formatSectionLabel(section) {
  return SECTION_LABELS[section] || section.charAt(0).toUpperCase() + section.slice(1);
}

function entryParts(entry) {
  if (typeof entry === 'string') return { title: entry.split(/[.!?\n]/)[0].trim(), content: entry.trim() };
  if (!entry || typeof entry !== 'object') return { title: '', content: '' };

  const title = entry.title || entry.name || entry.role || entry.position || entry.company || '';
  const header = [
    entry.role || entry.position,
    entry.company || entry.organization || entry.institution,
    entry.location,
    entry.dates || entry.date || entry.period || [entry.startDate, entry.endDate].filter(Boolean).join('-'),
    entry.stack ? `Stack: ${toContent(entry.stack)}` : '',
  ].filter(Boolean).join(' | ');
  const details = entry.details || entry.description || entry.bullets || entry.responsibilities || '';
  const content = [header, toContent(details)].filter(Boolean).join('\n').trim() || toContent(entry);
  return { title: String(title || header).trim(), content };
}

function cleanSkills(parsed) {
  const categories = parsed?.skillCategories && typeof parsed.skillCategories === 'object'
    ? parsed.skillCategories
    : { 'General skills': parsed?.skills || [] };

  return Object.entries(categories)
    .filter(([category]) => category.trim().toLowerCase() !== 'skills')
    .map(([category, items]) => [
      category.trim(),
      (Array.isArray(items) ? items : [items])
        .map((item) => String(item || '').trim())
        .filter((item) => item && item.split(/\s+/).length <= 4 && item.length <= 40),
    ])
    .filter(([, items]) => items.length > 0);
}

function makeRawWindows(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw) return [];

  const chunks = [];
  let start = 0;
  let ordinal = 0;
  while (start < raw.length) {
    let end = Math.min(raw.length, start + RAW_WINDOW_LENGTH);
    if (end < raw.length) {
      const nextLine = raw.indexOf('\n', end);
      if (nextLine !== -1 && raw.lastIndexOf('\n', end) < start) {
        end = nextLine + 1;
      }
      const boundary = Math.max(
        raw.lastIndexOf('\n', end),
        raw.lastIndexOf('.', end),
        raw.lastIndexOf('!', end),
        raw.lastIndexOf('?', end),
      );
      if (boundary > start && end <= start + RAW_WINDOW_LENGTH) end = boundary + 1;
    }
    const content = raw.slice(start, end).trim();
    const leftTrim = raw.slice(start, end).search(/\S/);
    const charStart = leftTrim < 0 ? start : start + leftTrim;
    const charEnd = charStart + content.length;
    if (content) {
      chunks.push({
        chunk_type: 'raw_window',
        section: 'raw_window',
        title: `Raw window ${ordinal + 1}`,
        content: `Section: Raw resume text | ${content}`,
        ordinal,
        char_start: charStart,
        char_end: charEnd,
      });
      ordinal += 1;
    }
    if (end >= raw.length) break;
    start = Math.max(start + 1, end - RAW_WINDOW_OVERLAP);
  }
  return chunks;
}

function chunkResume(parsed, rawText = '') {
  if (!parsed || typeof parsed !== 'object') return makeRawWindows(rawText);

  const chunks = [];
  const add = (chunk) => {
    if (chunk.content && chunk.content.trim()) chunks.push(chunk);
  };
  let ordinal = 0;

  if (parsed.summary) {
    add({
      chunk_type: 'summary',
      section: 'summary',
      title: 'Summary',
      content: `Section: Summary | ${toContent(parsed.summary)}`,
      ordinal: ordinal++,
    });
  }

  const education = Array.isArray(parsed.education) ? parsed.education.map(formatEducationEntry).filter(Boolean) : [];
  if (education.length) {
    add({
      chunk_type: 'education',
      section: 'education',
      title: 'Education',
      content: `Section: Education | ${education.map((entry) => `Education: ${entry}`).join(' ')}`,
      ordinal: ordinal++,
    });
  }

  for (const section of ['experience', 'projects']) {
    const entries = Array.isArray(parsed[section]) ? parsed[section] : [];
    entries.forEach((entry) => {
      const { title, content } = entryParts(entry);
      if (!content) return;
      const header = `Section: ${formatSectionLabel(section)} | ${title || formatSectionLabel(section)}`;
      splitSentences(content).forEach((part, partIndex) => {
        add({
          chunk_type: section === 'projects' ? 'project' : 'experience',
          section,
          title: title || formatSectionLabel(section),
          content: `${header} | ${part}`,
          ordinal: ordinal++,
        });
      });
    });
  }

  const skills = cleanSkills(parsed);
  if (skills.length) {
    add({
      chunk_type: 'skills_overview',
      section: 'skills',
      title: 'Skills overview',
      content: `Section: Skills | Technical skills. ${skills.map(([category, items]) => `${category}: ${items.join(', ')}`).join('; ')}`,
      ordinal: ordinal++,
    });
    skills.forEach(([category, items]) => {
      add({
        chunk_type: 'skills_category',
        section: 'skills',
        title: `Skills - ${category}`,
        content: `Section: Skills | Skills - ${category}: ${items.join(', ')}`,
        ordinal: ordinal++,
      });
    });
  }

  return [...chunks, ...makeRawWindows(rawText).map((chunk) => ({ ...chunk, ordinal: ordinal++ }))];
}

module.exports = {
  chunkResume,
  EVIDENCE_SECTIONS,
  EXCLUDED_SECTIONS,
  formatEducationEntry,
  formatSectionLabel,
  toContent,
};
