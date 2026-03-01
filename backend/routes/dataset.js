const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const { analyzeDataset } = require('../services/insightsService');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvData = req.file.buffer.toString('utf8');
    
    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const columns = results.meta.fields;
        
        const analysis = {
          rowCount: data.length,
          columns: columns,
          columnTypes: {},
          summary: {},
          preview: data.slice(0, 10)
        };

        columns.forEach(col => {
          const values = data.map(row => row[col]).filter(v => v != null);
          const numericValues = values.filter(v => typeof v === 'number');
          
          if (numericValues.length > values.length * 0.5) {
            analysis.columnTypes[col] = 'numeric';
            analysis.summary[col] = {
              min: Math.min(...numericValues),
              max: Math.max(...numericValues),
              avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
              count: numericValues.length
            };
          } else {
            analysis.columnTypes[col] = 'categorical';
            const valueCounts = {};
            values.forEach(v => {
              valueCounts[v] = (valueCounts[v] || 0) + 1;
            });
            analysis.summary[col] = {
              uniqueValues: Object.keys(valueCounts).length,
              topValues: Object.entries(valueCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
            };
          }
        });

        res.json({
          success: true,
          analysis: analysis,
          data: data
        });
      },
      error: (error) => {
        res.status(400).json({ error: 'Failed to parse CSV: ' + error.message });
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { analysis, purpose } = req.body;
    const recommendations = await analyzeDataset(analysis, purpose);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze dataset' });
  }
});

module.exports = router;