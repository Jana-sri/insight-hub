const express = require('express');
const router = express.Router();
const { analyzeTopicWithQuestion } = require('../services/topicAnalysisService');

router.post('/full', async (req, res) => {
  try {
    const { topic, question, topicData } = req.body;
    
    if (!topic || !question || !topicData) {
      return res.status(400).json({ 
        error: 'Missing: topic, question, or topicData' 
      });
    }
    
    console.log(`\n📊 Analysis request: ${topic}`);
    
    const result = await analyzeTopicWithQuestion(topic, question, topicData);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Endpoint error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message 
    });
  }
});

module.exports = router;