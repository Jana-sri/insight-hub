// backend/services/sentiment.js - IMPROVED VERSION
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const axios = require('axios');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const NEWS_API_KEY = process.env.NEWS_API_KEY;

async function analyzeSentiment(topic) {
  try {
    console.log(`🧠 Analyzing sentiment for: ${topic}`);
    
    // Fetch REAL news with better filtering
    let newsText = '';
    let articleCount = 0;
    
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: topic,
          language: 'en',
          sortBy: 'relevancy', // Changed from publishedAt for better accuracy
          pageSize: 20, // Increased for better sample
          apiKey: NEWS_API_KEY
        },
        timeout: 10000
      });
      
      if (response.data && response.data.articles) {
        // Filter for relevance
        const topicLower = topic.toLowerCase();
        const relevantArticles = response.data.articles.filter(a => {
          if (!a.title || a.title === '[Removed]') return false;
          const combined = (a.title + ' ' + (a.description || '')).toLowerCase();
          return combined.includes(topicLower);
        });
        
        newsText = relevantArticles
          .slice(0, 15)
          .map(a => `${a.title}. ${a.description || ''}`)
          .join(' ');
        
        articleCount = relevantArticles.length;
        console.log(`✅ Analyzed ${articleCount} relevant articles`);
      }
    } catch (error) {
      console.log('⚠️ NewsAPI fetch failed:', error.message);
    }
    
    // If insufficient news data, use AI knowledge
    if (!newsText || newsText.length < 100 || articleCount < 3) {
      console.log('📊 Using AI knowledge-based analysis');
      return await generateKnowledgeBasedSentiment(topic);
    }
    
    // Analyze actual news with improved prompt
    const prompt = `Analyze sentiment for "${topic}" from these ${articleCount} news articles:

${newsText.substring(0, 3000)} ${newsText.length > 3000 ? '...' : ''}

Provide ACCURATE sentiment analysis based ONLY on this news content:

{
  "sentiment": "Positive" or "Negative" or "Neutral",
  "sentimentScore": 0-100 (0=very negative, 50=neutral, 100=very positive),
  "summary": "1-2 sentences explaining WHY based on the actual news",
  "confidence": 0-100 (how confident based on article count and clarity)
}

Rules:
- Base score on actual news tone and content
- Higher confidence with more articles
- Be realistic - not everything is 80+
- Return ONLY valid JSON`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // Lower for more consistent analysis
      max_tokens: 400
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanJson);
    
    // Validate and normalize
    result.sentimentScore = Math.max(0, Math.min(100, parseInt(result.sentimentScore) || 50));
    result.confidence = Math.max(0, Math.min(100, parseInt(result.confidence) || 70));
    result.sentiment = result.sentiment || getSentimentLabel(result.sentimentScore);
    result.summary = result.summary || `Analyzed ${articleCount} articles about ${topic}.`;
    result.articlesAnalyzed = articleCount;
    
    console.log(`✅ Sentiment: ${result.sentiment} (${result.sentimentScore}/100, ${result.confidence}% confidence)`);
    return result;
    
  } catch (error) {
    console.error('❌ Sentiment Analysis Error:', error.message);
    return generateFallbackSentiment(topic);
  }
}

async function generateKnowledgeBasedSentiment(topic) {
  try {
    const prompt = `Based on your knowledge (up to early 2025), provide realistic public sentiment for "${topic}":

Consider:
- Recent public perception and reviews
- Known controversies or positive developments  
- Market reception and adoption
- Expert opinions and user feedback

{
  "sentiment": "Positive/Negative/Neutral",
  "sentimentScore": 0-100 (realistic, not inflated),
  "summary": "Brief factual explanation",
  "confidence": 0-100 (lower if uncertain)
}

Be honest - not everything has 80+ sentiment. Return ONLY JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 300
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanJson);
    
    result.sentimentScore = Math.max(0, Math.min(100, parseInt(result.sentimentScore) || 55));
    result.confidence = Math.max(30, Math.min(75, parseInt(result.confidence) || 60));
    result.sentiment = result.sentiment || getSentimentLabel(result.sentimentScore);
    result.summary = result.summary || `General sentiment assessment for ${topic}.`;
    result.articlesAnalyzed = 0;
    result.source = 'ai-knowledge';
    
    return result;
    
  } catch (error) {
    return generateFallbackSentiment(topic);
  }
}

function getSentimentLabel(score) {
  if (score >= 65) return 'Positive';
  if (score >= 45) return 'Neutral';
  return 'Negative';
}

function generateFallbackSentiment(topic) {
  return {
    sentiment: 'Neutral',
    sentimentScore: 50,
    summary: `Sentiment analysis for ${topic} unavailable. Showing neutral baseline.`,
    confidence: 40,
    articlesAnalyzed: 0,
    source: 'fallback'
  };
}

router.get('/:topic', async (req, res) => {
  try {
    const topic = decodeURIComponent(req.params.topic);
    
    if (!topic || topic.length < 2) {
      return res.status(400).json({ error: 'Valid topic required' });
    }

    const sentiment = await analyzeSentiment(topic);
    res.json(sentiment);
    
  } catch (error) {
    console.error('Sentiment route error:', error);
    res.status(500).json(generateFallbackSentiment(req.params.topic));
  }
});

module.exports = router;