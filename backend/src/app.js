const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/healthRoutes');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/health', healthRoutes);

  return app;
}

module.exports = { createApp };
