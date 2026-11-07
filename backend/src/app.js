const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const healthRoutes = require('./routes/healthRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const geminiRoutes = require('./routes/geminiRoutes');

function createApp() {
  const app = express();
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS'));
    },
  }));
  app.use(express.json());

  app.use('/api/health', healthRoutes);
  app.use('/api/resume', resumeRoutes);
  app.use('/api/gemini', geminiRoutes);

  app.use((error, req, res, next) => {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Resume PDF must be 5 MB or smaller.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.message === 'Only PDF files are supported.') {
      return res.status(400).json({ message: 'Only PDF files are supported.' });
    }
    if (error.message === 'Origin is not allowed by CORS') {
      return res.status(403).json({ message: error.message });
    }
    return next(error);
  });

  return app;
}

module.exports = { createApp };
