const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/healthRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const geminiRoutes = require('./routes/geminiRoutes');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/health', healthRoutes);
  app.use('/api/resume', resumeRoutes);
  app.use('/api/gemini', geminiRoutes);

  return app;
}

module.exports = { createApp };
