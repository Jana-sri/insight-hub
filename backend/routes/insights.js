const express = require('express');
const router = express.Router();
const { generateDashboardInsights, analyzeDataset } = require('../services/insightsService');

// POST /api/insights/dashboard
// Generates AI-powered insights for a topic
router.post('/dashboard', async (req, res) => {
  try {
    const { topic, data } = req.body;

    if (!topic || !data) {
      return res.status(400).json({ error: 'topic and data are required' });
    }

    const insights = await generateDashboardInsights(topic, data);
    res.json({ success: true, insights });

  } catch (error) {
    console.error('Dashboard insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// POST /api/insights/dataset
// Generates AI-powered insights for an uploaded dataset
router.post('/dataset', async (req, res) => {
  try {
    const { analysis, purpose } = req.body;

    if (!analysis) {
      return res.status(400).json({ error: 'analysis data is required' });
    }

    const insights = await analyzeDataset(analysis, purpose || 'general analysis');
    res.json({ success: true, insights });

  } catch (error) {
    console.error('Dataset insights error:', error);
    res.status(500).json({ error: 'Failed to analyze dataset' });
  }
});

module.exports = router;