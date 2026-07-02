const express = require('express');
const router = express.Router();
const Application = require('../models/Application');

// GET analytics summary
router.get('/summary', async (req, res) => {
  try {
    const apps = await Application.find({});
    
    const total = apps.length;
    const applied = apps.filter(a => a.status === 'Applied').length;
    const interviewing = apps.filter(a => a.status === 'Interviewing').length;
    const offers = apps.filter(a => a.status === 'Offer').length;
    const ghosted = apps.filter(a => a.status === 'Ghosted').length;

    res.json({
      total,
      applied,
      interviewing,
      offers,
      ghosted
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Utility to escape CSV fields
function escapeCSV(str) {
  if (!str) return '';
  str = str.toString();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET export CSV (for Tableau)
router.get('/export/csv', async (req, res) => {
  try {
    const apps = await Application.find({}).sort({ dateSaved: 1 }); // Oldest first for charts is sometimes better, or maybe it doesn't matter
    
    const headers = ['id', 'company', 'role', 'location', 'type', 'salary', 'platform', 'status', 'dateSaved', 'lastUpdated', 'notes'];
    
    const csvRows = [];
    csvRows.push(headers.join(','));

    apps.forEach(app => {
      const row = [
        app._id.toString(),
        escapeCSV(app.company),
        escapeCSV(app.role),
        escapeCSV(app.location),
        escapeCSV(app.type),
        escapeCSV(app.salary),
        escapeCSV(app.platform),
        escapeCSV(app.status),
        app.dateSaved,
        app.lastUpdated,
        escapeCSV(app.notes)
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`job-pipeline-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvString);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

module.exports = router;
