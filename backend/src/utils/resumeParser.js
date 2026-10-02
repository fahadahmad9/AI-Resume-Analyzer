
const SECTION_DEFINITIONS = [
  { key: 'summary', labels: ['summary', 'professional summary', 'profile'] },
  { key: 'education', labels: ['education', 'academic background'] },
  { key: 'experience', labels: ['experience', 'work experience', 'professional experience', 'research experience', 'volunteer experience'] },
  { key: 'laboratoryExperience', labels: ['lab experience', 'laboratory experience'] },
  { key: 'projects', labels: ['projects', 'project experience', 'academic projects'] },
  { key: 'activities', labels: ['activities', 'extracurricular activities'] },
  { key: 'certifications', labels: ['certifications'] },
  {
    key: 'skills',
    labels: [
      'skills',
      'technical skills',
      'core skills',
      'competencies',
      'technical competencies',
      'software',
      'tools',
      'programming',
      'professional skills',
      'laboratory skills',
      'research skills',
      'methods',
      'languages',
    ],
  },
]

const SKILL_CATEGORIES = [
  'Programming Languages',
  'Frontend',
  'Backend',
  'Databases',
  'Cloud & DevOps',
  'AI / Machine Learning',
  'Data Engineering',
  'Software & Tools',
  'Methods & Techniques',
  'Domain Knowledge',
  'Soft Skills',
  'Languages',
]

const SKILL_DICTIONARY = [
  { synonyms: ['python'], canonical: 'Python', category: 'Programming Languages' },
  { synonyms: ['java'], canonical: 'Java', category: 'Programming Languages' },
  { synonyms: ['c++', 'cpp'], canonical: 'C++', category: 'Programming Languages' },
  { synonyms: ['javascript', 'js'], canonical: 'JavaScript', category: 'Programming Languages' },
  { synonyms: ['sql'], canonical: 'SQL', category: 'Programming Languages' },
  { synonyms: ['react', 'react.js'], canonical: 'React', category: 'Frontend' },
  { synonyms: ['three.js', 'threejs'], canonical: 'Three.js', category: 'Frontend' },
  { synonyms: ['node', 'node.js', 'nodejs'], canonical: 'Node.js', category: 'Backend' },
  { synonyms: ['express', 'express.js', 'expressjs'], canonical: 'Express.js', category: 'Backend' },
  { synonyms: ['fastapi'], canonical: 'FastAPI', category: 'Backend' },
  { synonyms: ['spring boot', 'spring-boot'], canonical: 'Spring Boot', category: 'Backend' },
  { synonyms: ['rest api', 'restapis', 'rest apis'], canonical: 'REST API', category: 'Backend' },
  { synonyms: ['mongodb'], canonical: 'MongoDB', category: 'Databases' },
  { synonyms: ['mysql'], canonical: 'MySQL', category: 'Databases' },
  { synonyms: ['postgresql', 'postgres'], canonical: 'PostgreSQL', category: 'Databases' },
  { synonyms: ['supabase'], canonical: 'Supabase', category: 'Databases' },
  { synonyms: ['gcp', 'google cloud platform', 'google cloud'], canonical: 'GCP', category: 'Cloud & DevOps' },
  { synonyms: ['docker'], canonical: 'Docker', category: 'Cloud & DevOps' },
  { synonyms: ['git'], canonical: 'Git', category: 'Cloud & DevOps' },
  { synonyms: ['linux'], canonical: 'Linux', category: 'Cloud & DevOps' },
  { synonyms: ['cloud run', 'cloudrun'], canonical: 'Cloud Run', category: 'Cloud & DevOps' },
  { synonyms: ['yolov8'], canonical: 'YOLOv8', category: 'AI / Machine Learning' },
  { synonyms: ['ocr'], canonical: 'OCR', category: 'AI / Machine Learning' },
  { synonyms: ['llama'], canonical: 'LLaMA', category: 'AI / Machine Learning' },
  { synonyms: ['llm', 'llms'], canonical: 'LLM', category: 'AI / Machine Learning' },
  { synonyms: ['gemini'], canonical: 'Gemini', category: 'AI / Machine Learning' },
  { synonyms: ['cuda'], canonical: 'CUDA', category: 'AI / Machine Learning' },
  { synonyms: ['spark'], canonical: 'Spark', category: 'Data Engineering' },
  { synonyms: ['pyspark'], canonical: 'PySpark', category: 'Data Engineering' },
  { synonyms: ['kafka'], canonical: 'Kafka', category: 'Data Engineering' },
  { synonyms: ['storm'], canonical: 'Storm', category: 'Data Engineering' },
  { synonyms: ['etl'], canonical: 'ETL', category: 'Data Engineering' },
  { synonyms: ['postman'], canonical: 'Postman', category: 'Software & Tools' },
  { synonyms: ['power bi'], canonical: 'Power BI', category: 'Software & Tools' },
  { synonyms: ['streamlit'], canonical: 'Streamlit', category: 'Software & Tools' },
  { synonyms: ['matplotlib'], canonical: 'Matplotlib', category: 'Software & Tools' },
  { synonyms: ['matlab'], canonical: 'MATLAB', category: 'Software & Tools' },
  { synonyms: ['comsol', 'comsol multiphysics'], canonical: 'COMSOL', category: 'Software & Tools' },
  { synonyms: ['origin', 'originpro'], canonical: 'Origin', category: 'Software & Tools' },
  { synonyms: ['excel', 'ms excel', 'microsoft excel'], canonical: 'Microsoft Excel', category: 'Software & Tools' },
  { synonyms: ['microsoft powerpoint', 'ms powerpoint', 'powerpoint'], canonical: 'Microsoft PowerPoint', category: 'Software & Tools' },
  { synonyms: ['ftir', 'ftir spectroscopy'], canonical: 'FTIR', category: 'Methods & Techniques' },
  { synonyms: ['tga', 'thermogravimetric analysis'], canonical: 'TGA', category: 'Methods & Techniques' },
  { synonyms: ['dsc', 'differential scanning calorimetry'], canonical: 'DSC', category: 'Methods & Techniques' },
  { synonyms: ['tensile strength testing', 'tensile testing'], canonical: 'Tensile Strength Testing', category: 'Methods & Techniques' },
  { synonyms: ['acid-base titration', 'acid base titration', 'titration'], canonical: 'Acid-Base Titration', category: 'Methods & Techniques' },
  { synonyms: ['organic synthesis'], canonical: 'Organic Synthesis', category: 'Methods & Techniques' },
  { synonyms: ['chemical kinetics'], canonical: 'Chemical Kinetics', category: 'Methods & Techniques' },
  { synonyms: ['material characterization', 'materials characterization'], canonical: 'Material Characterization', category: 'Methods & Techniques' },
  { synonyms: ['spectroscopy'], canonical: 'Spectroscopy', category: 'Methods & Techniques' },
  { synonyms: ['chromatography'], canonical: 'Chromatography', category: 'Methods & Techniques' },
  { synonyms: ['microscopy'], canonical: 'Microscopy', category: 'Methods & Techniques' },
  { synonyms: ['thermal analysis'], canonical: 'Thermal Analysis', category: 'Methods & Techniques' },
  { synonyms: ['mechanical testing'], canonical: 'Mechanical Testing', category: 'Methods & Techniques' },
  { synonyms: ['laboratory techniques', 'laboratory technique'], canonical: 'Laboratory Techniques', category: 'Methods & Techniques' },
  { synonyms: ['sample preparation'], canonical: 'Sample Preparation', category: 'Methods & Techniques' },
  { synonyms: ['communication', 'communication skills'], canonical: 'Communication', category: 'Soft Skills' },
  { synonyms: ['presentation', 'presentation skills'], canonical: 'Presentation', category: 'Soft Skills' },
  { synonyms: ['organizational skills', 'organisational skills'], canonical: 'Organizational Skills', category: 'Soft Skills' },
  { synonyms: ['teamwork', 'team work'], canonical: 'Teamwork', category: 'Soft Skills' },
  { synonyms: ['leadership'], canonical: 'Leadership', category: 'Soft Skills' },
  { synonyms: ['problem solving', 'problem-solving'], canonical: 'Problem Solving', category: 'Soft Skills' },
  { synonyms: ['critical thinking'], canonical: 'Critical Thinking', category: 'Soft Skills' },
  { synonyms: ['research'], canonical: 'Research', category: 'Soft Skills' },
  { synonyms: ['time management'], canonical: 'Time Management', category: 'Soft Skills' },
  { synonyms: ['collaboration'], canonical: 'Collaboration', category: 'Soft Skills' },
  { synonyms: ['adaptability'], canonical: 'Adaptability', category: 'Soft Skills' },
  { synonyms: ['english'], canonical: 'English', category: 'Languages' },
  { synonyms: ['turkish'], canonical: 'Turkish', category: 'Languages' },
  { synonyms: ['arabic'], canonical: 'Arabic', category: 'Languages' },
  { synonyms: ['urdu'], canonical: 'Urdu', category: 'Languages' },
  { synonyms: ['french'], canonical: 'French', category: 'Languages' },
  { synonyms: ['german'], canonical: 'German', category: 'Languages' },
  { synonyms: ['spanish'], canonical: 'Spanish', category: 'Languages' },
]

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line
      .replace(/-{2,}\s*Page\s*\(\d+\)\s*Break\s*-{2,}/gi, ' ')
      .replace(/_{4,}/g, ' ')
      .replace(/[|=]{4,}/g, ' ')
      .replace(/-{8,}/g, ' ')
      .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d)\s+(\d{3})\b/gi, '$1 $2$3')
      .replace(/\b(19|20)\d\s+(\d)\b/g, '$1$2')
      .replace(/\b(Presen)\s+t\b/gi, '$1t')
      .replace(/\b(Workin)\s+Proficiency\b/gi, '$1g Proficiency')
      .replace(/\bSoftwares\b/gi, 'Software')
      .replace(/\bAC\s+TIVITES\b/gi, 'ACTIVITIES')
      .replace(/[ \t]+/g, ' ')
      .trim())
    .filter((line) => !/^[\s._|=~-]+$/.test(line))
    .filter(Boolean)
}

function normalizeHeader(line) {
  return line
    .toLowerCase()
    .replace(/[:\-–—]+$/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function isSectionHeader(line) {
  return SECTION_DEFINITIONS.some((section) => section.labels.includes(normalizeHeader(line)))
}

function findSectionKey(line) {
  const normalized = normalizeHeader(line)

  for (const section of SECTION_DEFINITIONS) {
    if (section.labels.includes(normalized)) {
      return section.key
    }
  }

  return null
}

function extractEmail(text) {
  const match = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0] : ''
}

function extractPhone(text) {
  const match = String(text || '').match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/)
  return match ? match[0].trim() : ''
}

function normalizeProfileUrl(candidate) {
  const cleaned = String(candidate || '').trim().replace(/[),.;]+$/g, '').replace(/\/$/, '')
  if (!cleaned) return ''

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned
  }

  return `https://${cleaned}`
}

function profileUrlKey(url) {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const pathname = parsed.pathname.replace(/\/$/, '')
    return `${hostname}${pathname}${parsed.search}${parsed.hash}`
  } catch {
    return url.toLowerCase().replace(/^www\./, '').replace(/\/$/, '')
  }
}

function uniqueProfileUrls(urls) {
  const seen = new Set()
  return urls.filter((url) => {
    const key = profileUrlKey(url)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractSocialLinks(text, embeddedUrls = []) {
  const source = [String(text || ''), ...embeddedUrls].join(' ').replace(/[()\[\]{}]/g, ' ')
  const linkedinMatches = source.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?/gi) || []
  const githubMatches = source.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?/gi) || []
  const websiteMatch = source.match(/https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[A-Za-z0-9_.~/?#=&%-]*)?/i)

  const linkedin = uniqueProfileUrls(linkedinMatches.map(normalizeProfileUrl).filter(Boolean))
  const github = uniqueProfileUrls(githubMatches.map(normalizeProfileUrl).filter(Boolean))

  return {
    linkedin,
    github,
    website: websiteMatch ? websiteMatch[0].replace(/[),.;]+$/g, '') : '',
  }
}

function extractName(lines, email, phone) {
  const blockedPatterns = [email, phone, 'linkedin.com', 'github.com', 'http://', 'https://']

  for (const line of lines.slice(0, 8)) {
    if (!line) continue

    const lower = line.toLowerCase()
    if (blockedPatterns.some((pattern) => pattern && lower.includes(String(pattern).toLowerCase()))) {
      continue
    }

    if (line.length > 60) continue

    const wordCount = line.split(/\s+/).length
    if (wordCount < 2 || wordCount > 5) continue

    if (/^[A-Z][A-Z\s'.-]+$/.test(line) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(line)) {
      return line
    }
  }

  return lines[0] || ''
}

function splitIntoEntries(lines) {
  console.log('\n--- splitIntoEntries input ---');
  console.log('Line count:', lines.length);
  lines.forEach((l, i) => console.log(`  [${i}]: ${l.substring(0, 80)}`));
  console.log('-----------------------------\n');

  const hasBullets = lines.some(line => /^[•\-–—]/.test(line.trim()));

  if (!hasBullets) {
    const result = lines.map(l => l.trim()).filter(Boolean);
    console.log('\n--- splitIntoEntries output (no bullets) ---');
    result.forEach((e, i) => console.log(`  [${i}]: ${e.substring(0, 80)}`));
    console.log('-----------------------------\n');
    return result;
  }

  const isProjectTitle = (line) => {
    const t = line.trim();
    // Has · separators = tech stack line
    if (/[·]/.test(t)) return true;
    // Looks like a project/company name: title case, no punctuation, short
    if (t.length < 60 && /^[A-Z]/.test(t) && !/[,]/.test(t) && !/\b(and|the|for|with|from|into|across|within|enabling|handling|replacing|resolving|providing|feeding|developed|built|designed|implemented|trained|integrated|architected|applied|containerized|connected)\b/i.test(t)) return true;
    return false;
  };

  const endsIncomplete = (text) => {
    const t = text.trimEnd();
    // Line ends without sentence-ending punctuation = truncated
    return !/[.;!?]$/.test(t);
  };

  const rawEntries = [];
  let current = null; // { type: 'title' | 'bullet', text: string }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isBullet = /^[•\-–—]/.test(trimmed);

    if (isBullet) {
      if (current) rawEntries.push(current);
      current = { type: 'bullet', text: trimmed.replace(/^[•\-–—]\s*/, '').trim() };
    } else if (!current) {
      // Before any bullet — title
      current = { type: 'title', text: trimmed };
    } else if (current.type === 'title') {
      if (isProjectTitle(trimmed)) {
        // Continuation of title (tech stack line etc.)
        current.text = `${current.text} ${trimmed}`;
      } else {
        rawEntries.push(current);
        current = { type: 'bullet', text: trimmed };
      }
    } else {
      // current.type === 'bullet'
      if (endsIncomplete(current.text)) {
        // Previous line was truncated — this is a continuation regardless of content
        current.text = `${current.text} ${trimmed}`;
      } else if (isProjectTitle(trimmed)) {
        // Previous bullet ended cleanly, this is a new section title
        rawEntries.push(current);
        current = { type: 'title', text: trimmed };
      } else {
        // Previous bullet ended cleanly, this is continuation text or new content
        current.text = `${current.text} ${trimmed}`;
      }
    }
  }

  if (current) rawEntries.push(current);

  const entries = rawEntries.map(e => e.text.trim()).filter(Boolean);

  console.log('\n--- splitIntoEntries output ---');
  entries.forEach((e, i) => console.log(`  [${i}]: ${e.substring(0, 80)}`));
  console.log('-----------------------------\n');

  return entries;
}

function stripSkillLabel(line) {
  const cleaned = line.replace(/^[•\-–—]\s*/, '').trim()
  const labelMatch = cleaned.match(/^([A-Za-z][A-Za-z0-9 &/+.-]{0,40})\s*:\s*(.+)$/)

  if (labelMatch && labelMatch[2].trim()) {
    return labelMatch[2].trim()
  }

  return cleaned
}

function cleanEdgePunctuation(text) {
  return String(text || '')
    .replace(/^[\s"'`[{<]+/, '')
    .replace(/[\s"'`\].,;:!?]+$/, '')
    .trim()
}

function findSkillDefinition(skill) {
  const normalized = skill.toLowerCase().replace(/\s+/g, ' ')

  return SKILL_DICTIONARY.find((skillDefinition) =>
    skillDefinition.synonyms.some((synonym) => normalized === synonym.toLowerCase())
  )
}

function normalizeSkillLabel(skill) {
  const trimmed = cleanEdgePunctuation(skill)
  if (!trimmed) return ''

  const skillDefinition = findSkillDefinition(trimmed)
  if (skillDefinition) {
    return skillDefinition.canonical
  }

  return trimmed.replace(/\bLLMs\b/i, 'LLM')
}

function getSkillCategory(skill) {
  const skillDefinition = SKILL_DICTIONARY.find((definition) =>
    definition.canonical.toLowerCase() === skill.toLowerCase()
  )
  if (skillDefinition) {
    return skillDefinition.category
  }

  if (/\b(communication|presentation|leadership|collaboration|teamwork|problem solving|critical thinking|research|time management|adaptability)\b/i.test(skill)) {
    return 'Soft Skills'
  }

  if (/\b(english|urdu|turkish|arabic|french|german|spanish)\b/i.test(skill)) {
    return 'Languages'
  }

  if (/\b(material|polymer|resin|chemical|mechanical|electrical|financial|finance|marketing|healthcare|education|consumer behavior|consumer behaviour|optimization|optimisation|processing)\b/i.test(skill)) {
    return 'Domain Knowledge'
  }

  if (/\b(characterization|chromatography|kinetics|microscopy|organic synthesis|preparation|spectroscopy|testing|technique|titration)\b/i.test(skill)) {
    return 'Methods & Techniques'
  }

  return 'Software & Tools'
}

function isValidSkillCandidate(candidate) {
  const normalized = candidate.trim()
  const wordCount = normalized.split(/\s+/).length

  if (!normalized || wordCount > 8) return false
  if (/^[\s\W_]+$/.test(normalized)) return false
  if (/_{3,}|-{8,}|={4,}|\|{4,}/.test(normalized)) return false
  if (isSectionHeader(normalized)) return false
  if (/^(?:limited|working|full|native|fluent|professional)\s+(?:working\s+)?proficiency$/i.test(normalized)) return false
  if (/\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(normalized) && /\d/.test(normalized)) return false
  if (/[.!?]$/.test(normalized)) return false
  if (/^(?:coordinated|organized|organised|managed|delivered|developed|performed|conducted|increased|taught|collaborated|initiated|contributed|led|created|designed|analyzed|analysed|investigated|applied|synthesized|synthesised)\b/i.test(normalized)) return false
  if (/^(?:ambassador|tutor|manager|engineer|developer|analyst|professor|intern|student|captain|coordinator)\b/i.test(normalized)) return false

  return true
}

function createEmptySkillCategories() {
  return SKILL_CATEGORIES.reduce((categories, category) => {
    categories[category] = []
    return categories
  }, {})
}

function splitSkillLine(line) {
  const fragments = []
  let start = 0
  let parenthesesDepth = 0
  const delimiters = new Set([':', '|', '·', '•', '/', ';', ','])

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '(') {
      parenthesesDepth += 1
    } else if (character === ')' && parenthesesDepth > 0) {
      parenthesesDepth -= 1
      if (parenthesesDepth === 0 && /^[A-Z][a-z]/.test(line.slice(index + 1))) {
        fragments.push(line.slice(start, index + 1))
        start = index + 1
      }
    } else if (parenthesesDepth === 0 && delimiters.has(character)) {
      fragments.push(line.slice(start, index))
      start = index + 1
    }
  }

  fragments.push(line.slice(start))
  return fragments
}

function extractSkills(text, sections) {
  const combinedText = [text, ...(sections.skills || [])].join(' ')
  const detectedSkills = new Map()

  const addSkill = (candidate) => {
    const normalized = normalizeSkillLabel(candidate)
    if (!normalized) return

    const dedupeKey = normalized.toLowerCase()
    if (!detectedSkills.has(dedupeKey)) {
      detectedSkills.set(dedupeKey, normalized)
    }
  }

  for (const skillDefinition of SKILL_DICTIONARY) {
    for (const synonym of skillDefinition.synonyms) {
      const escaped = synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
      const regex = new RegExp(`\\b${escaped}(?:s)?\\b`, 'i')
      if (regex.test(combinedText)) {
        addSkill(skillDefinition.canonical)
      }
    }
  }

  for (const line of sections.skills || []) {
    const cleanedLine = stripSkillLabel(line)
    const fragments = splitSkillLine(cleanedLine)
      .map((item) => cleanEdgePunctuation(item.replace(/^[\u2022•\-–—]\s*/, '')))
      .filter(Boolean)

    for (const fragment of fragments) {
      if (!isValidSkillCandidate(fragment)) {
        continue
      }

      addSkill(fragment)
    }
  }

  const normalizedSkills = Array.from(detectedSkills.values())
  const categorizedSkills = createEmptySkillCategories()

  for (const skill of normalizedSkills) {
    const category = getSkillCategory(skill)
    categorizedSkills[category].push(skill)
  }

  return {
    list: normalizedSkills,
    categories: categorizedSkills,
    rawCount: detectedSkills.size,
    duplicateCount: Math.max(0, (sections.skills || []).length - normalizedSkills.length),
  }
}

function detectSectionAvailability(text) {
  const normalizedText = normalizeText(text).join(' ').toLowerCase()

  return SECTION_DEFINITIONS.reduce((availability, section) => {
    availability[section.key] = section.labels.some((label) => normalizedText.includes(label))
    return availability
  }, {})
}

function countMatches(text, pattern) {
  return String(text || '').match(pattern)?.length || 0
}

function countEntriesWithMatch(entries, pattern) {
  return (entries || []).filter((entry) => pattern.test(entry)).length
}

function createDeterministicFacts(structuredResume, extractionMeta = {}) {
  const sectionEntryCounts = extractionMeta.sectionEntryCounts || {}
  const allEntries = Object.values(sectionEntryCounts).flat()
  const entryText = allEntries.join(' ')
  const sourceText = String(extractionMeta.sourceText || '')
  const socialLinks = structuredResume.socialLinks || {}
  const contactFields = [
    structuredResume.name,
    structuredResume.email,
    structuredResume.phone,
    socialLinks.linkedin?.length,
    socialLinks.github?.length,
    socialLinks.website,
  ]

  return {
    contact: {
      namePresent: Boolean(structuredResume.name),
      emailPresent: Boolean(structuredResume.email),
      phonePresent: Boolean(structuredResume.phone),
      profileCounts: Object.fromEntries(
        Object.entries(socialLinks).map(([key, value]) => [key, Array.isArray(value) ? value.length : Number(Boolean(value))])
      ),
      populatedFieldCount: contactFields.filter(Boolean).length,
    },
    sectionEntryCounts: Object.fromEntries(
      Object.entries(sectionEntryCounts).map(([key, entries]) => [key, entries.length])
    ),
    populatedSectionCount: Object.values(sectionEntryCounts).filter((entries) => entries.length > 0).length,
    totalEntryCount: allEntries.length,
    educationEntryCount: (sectionEntryCounts.education || []).length,
    experienceEntryCount: (sectionEntryCounts.experience || []).length,
    projectEntryCount: (sectionEntryCounts.projects || []).length,
    skillCount: structuredResume.skills?.length || 0,
    duplicateSkillCount: extractionMeta.duplicateSkillCount || 0,
    bloatedSkillCount: extractionMeta.bloatedSkillCount || 0,
    datedEntryCount: countEntriesWithMatch(allEntries, /\b(?:19|20)\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-](?:19|20)?\d{2}\b/),
    numericExpressionCount: countMatches(entryText, /\b\d+(?:[.,]\d+)?\b/g),
    text: {
      characterCount: sourceText.length,
      lineCount: sourceText ? sourceText.split(/\r?\n/).length : 0,
      nonEmptyLineCount: sourceText.split(/\r?\n/).filter((line) => line.trim()).length,
    },
    extraction: {
      hasSourceText: Boolean(sourceText.trim()),
      populatedContactFieldCount: contactFields.filter(Boolean).length,
      populatedSectionCount: Object.values(sectionEntryCounts).filter((entries) => entries.length > 0).length,
    },
  }
}

function createScoreData(structuredResume, extractionMeta = {}) {
  return {
    total: null,
    maxScore: 100,
    deterministicFacts: createDeterministicFacts(structuredResume, extractionMeta),
    breakdown: null,
    interpretation: null,
    strengths: [],
    weaknesses: [],
    penalties: null,
    scoreSource: 'contextual-ai-evaluation',
  }
}

function applyContextualScore(structuredResume, aiAnalysis) {
  const overallScore = aiAnalysis?.overallScore
  if (typeof overallScore !== 'number' || !Number.isFinite(overallScore) || overallScore < 0 || overallScore > 100) {
    return structuredResume
  }

  return {
    ...structuredResume,
    score: {
      ...structuredResume.score,
      total: overallScore,
    },
  }
}

function parseResumeText(text, embeddedUrls = []) {
  const lines = normalizeText(text)
  const sections = {
    summary: [],
    education: [],
    experience: [],
    laboratoryExperience: [],
    projects: [],
    activities: [],
    certifications: [],
    skills: [],
    other: [],
  }

  let currentSection = 'other'

  for (const line of lines) {
    const sectionKey = findSectionKey(line)
    if (sectionKey) {
      currentSection = sectionKey
      continue
    }

    sections[currentSection].push(line)
  }

  const email = extractEmail(text)
  const phone = extractPhone(text)
  const socialLinks = extractSocialLinks(text, embeddedUrls)
  const name = extractName(lines, email, phone)
  const skills = extractSkills(text, sections)
  const sectionAvailability = detectSectionAvailability(text)

  const structuredResume = {
    name,
    email,
    phone,
    socialLinks,
    profiles: socialLinks,
    sections: sectionAvailability,
    summary: sections.summary.join(' '),
    skills: skills.list,
    skillCategories: skills.categories,
    education: splitIntoEntries(sections.education),
    experience: splitIntoEntries(sections.experience),
    projects: splitIntoEntries(sections.projects),
  }

  const sectionEntryCounts = Object.fromEntries(
    Object.entries(sections).map(([key, sectionLines]) => [key, splitIntoEntries(sectionLines)])
  )

  return {
    ...structuredResume,
    score: createScoreData(structuredResume, {
      duplicateSkillCount: skills.duplicateCount,
      bloatedSkillCount: Math.max(0, skills.rawCount - skills.list.length),
      sectionEntryCounts,
      sourceText: text,
    }),
  }
}

module.exports = { applyContextualScore, parseResumeText }