require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const applicationsRouter = require('./routes/applications');
const analyticsRouter = require('./routes/analytics');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/job-tracker';

// Middleware
app.use(cors()); // Allow extension to connect
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/analytics', analyticsRouter);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });
