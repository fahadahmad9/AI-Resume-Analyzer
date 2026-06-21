require('dotenv').config();

const { connectDB } = require('./src/config/db');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 5000;

async function start() {
  if (process.env.MONGO_URI) {
    await connectDB();
  } else {
    console.warn('MONGO_URI is not set; starting without a database connection.');
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
