require('dotenv').config();

const { analyzeResumeWithGemini } = require('./src/services/geminiService');

const sampleResume = {
  name: 'Aisha Khan',
  email: 'aisha.khan@example.com',
  phone: '+1 555-0142',
  socialLinks: {
    linkedin: ['https://linkedin.com/in/aisha-khan'],
    github: ['https://github.com/aishakhan'],
    website: 'https://aishakhan.dev',
  },
  profiles: {
    linkedin: ['https://linkedin.com/in/aisha-khan'],
    github: ['https://github.com/aishakhan'],
    website: 'https://aishakhan.dev',
  },
  sections: {
    summary: true,
    education: true,
    experience: true,
    projects: true,
    skills: true,
  },
  summary: 'Software engineer with four years of experience building reliable web applications and data services.',
  skills: ['Python', 'JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Git'],
  skillCategories: {
    'Programming Languages': ['Python', 'JavaScript'],
    Frontend: ['React'],
    Backend: ['Node.js'],
    Databases: ['PostgreSQL'],
    'Cloud & DevOps': ['Docker', 'Git'],
    'AI / Machine Learning': [],
    'Data Engineering': [],
    Tools: [],
  },
  education: [
    'BS Computer Science, Northbridge University, 2020',
  ],
  experience: [
    'Software Engineer, Brightline Technologies, 2021-2024',
    'Built Node.js services used by 50,000 monthly users and reduced API latency by 35%.',
    'Software Engineering Intern, Brightline Technologies, 2020-2021',
    'Developed React features and automated regression testing for internal applications.',
  ],
  projects: [
    'Customer Support Insights Dashboard - React, Node.js, PostgreSQL',
    'Created a dashboard that analyzed 100,000 support records and reduced weekly reporting time by 8 hours.',
  ],
  score: {
    total: null,
    maxScore: 100,
    deterministicFacts: {
      skillCount: 7,
      educationEntryCount: 1,
      experienceEntryCount: 4,
      projectEntryCount: 2,
      numericExpressionCount: 4,
    },
    breakdown: null,
    interpretation: null,
    strengths: [],
    weaknesses: [],
    penalties: null,
    scoreSource: 'contextual-ai-evaluation',
  },
};

async function runTest() {
  console.log('Starting Gemini analysis test...');

  try {
    console.log('Calling analyzeResumeWithGemini...');
    const result = await analyzeResumeWithGemini(sampleResume);
    console.log('Gemini response received.');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Gemini resume analysis test failed:', error);
    process.exitCode = 1;
  }
}


runTest();
