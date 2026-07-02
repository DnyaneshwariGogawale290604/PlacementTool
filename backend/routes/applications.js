const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const authMiddleware = require('../middleware/auth');

// Utility to guess platform from URL
function detectPlatform(url) {
  if (!url) return 'Other';
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('linkedin.com')) return 'LinkedIn';
  if (lowercaseUrl.includes('greenhouse.io')) return 'Greenhouse';
  if (lowercaseUrl.includes('lever.co')) return 'Lever';
  if (lowercaseUrl.includes('indeed.com')) return 'Indeed';
  if (lowercaseUrl.includes('workday.com') || lowercaseUrl.includes('myworkdayjobs.com')) return 'Workday';
  if (lowercaseUrl.includes('ashbyhq.com')) return 'Ashby';
  if (lowercaseUrl.includes('angel.co') || lowercaseUrl.includes('wellfound.com')) return 'Wellfound';
  return 'Other';
}

// GET all applications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const apps = await Application.find({ userId: req.user.id }).sort({ dateSaved: -1 });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST new application
router.post('/', authMiddleware, async (req, res) => {
  try {
    const body = req.body;
    
    // Auto-detect platform
    const platform = detectPlatform(body.url);
    
    const newApp = new Application({
      ...body,
      platform,
      userId: req.user.id,
      statusHistory: [{ status: body.status || 'Wishlist', date: body.dateSaved || new Date().toISOString().split('T')[0] }]
    });

    const savedApp = await newApp.save();
    res.status(201).json(savedApp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PUT (update) application
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    
    const existingApp = await Application.findOne({ _id: id, userId: req.user.id });
    if (!existingApp) {
      return res.status(404).json({ error: 'Application not found or unauthorized' });
    }

    // Check if status changed
    let statusHistory = existingApp.statusHistory;
    if (body.status && body.status !== existingApp.status) {
      statusHistory.push({
        status: body.status,
        date: body.lastUpdated || new Date().toISOString().split('T')[0]
      });
    }

    // Ensure platform is set if URL is updated (optional, but good practice)
    let platform = existingApp.platform;
    if (body.url && body.url !== existingApp.url) {
        platform = detectPlatform(body.url);
    }

    const updatedApp = await Application.findByIdAndUpdate(
      id, 
      { ...body, statusHistory, platform }, 
      { new: true }
    );
    
    res.json(updatedApp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE application
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedApp = await Application.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deletedApp) {
      return res.status(404).json({ error: 'Application not found or unauthorized' });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

module.exports = router;
