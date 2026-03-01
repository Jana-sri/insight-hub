const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  try {
    const { topic1, topic2 } = req.body;
    
    if (!topic1 || !topic2) {
      return res.status(400).json({ error: 'Both topics required' });
    }

    const API_BASE = `http://localhost:${process.env.PORT}/api`;
    
    const [data1, data2] = await Promise.all([
      Promise.all([
        axios.get(`${API_BASE}/news/${topic1}`),
        axios.get(`${API_BASE}/social/${topic1}`),
        axios.get(`${API_BASE}/sentiment/${topic1}`),
        axios.get(`${API_BASE}/metrics/${topic1}`)
      ]),
      Promise.all([
        axios.get(`${API_BASE}/news/${topic2}`),
        axios.get(`${API_BASE}/social/${topic2}`),
        axios.get(`${API_BASE}/sentiment/${topic2}`),
        axios.get(`${API_BASE}/metrics/${topic2}`)
      ])
    ]);

    res.json({
      topic1: {
        name: topic1,
        news: data1[0].data,
        social: data1[1].data,
        sentiment: data1[2].data,
        metrics: data1[3].data
      },
      topic2: {
        name: topic2,
        news: data2[0].data,
        social: data2[1].data,
        sentiment: data2[2].data,
        metrics: data2[3].data
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compare' });
  }
});

module.exports = router;