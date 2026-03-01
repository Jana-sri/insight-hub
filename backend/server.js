const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/chat', require('./routes/chat'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/dataset', require('./routes/dataset'));
app.use('/api/news', require('./routes/news'));
app.use('/api/social', require('./routes/social'));
app.use('/api/sentiment', require('./routes/sentiment'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/compare', require('./routes/compare'));

// ✅ Added import and route
const analysisRoutes = require('./routes/analysis');
app.use('/api/analysis', analysisRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'InsightHub API is running!',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
