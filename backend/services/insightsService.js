const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// AI generates insights for dashboard
async function generateDashboardInsights(topic, data) {
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 15000)
    );

    const insightPromise = (async () => {
      console.log(`🤖 Generating insights for: ${topic}`);
      
      // Include actual news headlines for context
      const newsHeadlines = data.news.slice(0, 5).map(n => n.title).join('. ');
      
      const prompt = `You are analyzing "${topic}" based on REAL DATA.

ACTUAL DATA:
- Sentiment: ${data.sentiment.sentiment} (${data.sentiment.sentimentScore}/100)
- Social Mentions: ${data.metrics.social}
- Trend: ${data.metrics.trend}%
- Relevance: ${data.metrics.relevance}%
- News Articles: ${data.news.length}
- Recent Headlines: "${newsHeadlines}"

CRITICAL RULES:
1. ONLY use the data above - DO NOT speculate about releases or existence
2. If sentiment >= 60 AND trend >= 0: Say YES
3. If sentiment < 60 OR trend < 0: Say NO
4. Reference ACTUAL headlines in your answer
5. Never say "not released" or "doesn't exist" - just analyze the DATA

JSON Response:
{
  "answer": "YES/NO, based on current data for ${topic}: [Use actual numbers and reference headlines]",
  "insights": [
    {
      "title": "Data-Driven Insight",
      "description": "Analysis using the ${data.sentiment.sentimentScore}/100 sentiment and actual news",
      "type": "positive/negative/neutral",
      "importance": "high",
      "impact": "What this means",
      "explanation": "Detailed context"
    }
  ],
  "recommendation": "Based on ${data.sentiment.sentimentScore}/100 sentiment, ${data.metrics.social} mentions, and ${data.metrics.trend}% trend...",
  "risks": ["Data-based risk", "Another risk", "Third risk"],
  "opportunities": ["From the ${data.sentiment.sentimentScore}/100 score", "From trend", "From coverage"],
  "nextSteps": ["Monitor ${topic}", "Check news", "Track changes"],
  "confidence": ${data.sentiment.sentimentScore >= 70 ? 85 : 75},
  "bestCharts": ["line", "bar", "area"],
  "keyMetric": "sentiment"
}`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (typeof parsed.confidence === 'string') {
        parsed.confidence = parseInt(parsed.confidence) || 75;
      }
      
      return parsed;
    })();

    return await Promise.race([insightPromise, timeoutPromise]);
    
  } catch (error) {
    console.error('❌ Insights Error:', error.message);
    
    const score = data.sentiment?.sentimentScore || 50;
    const trend = data.metrics?.trend || 0;
    const social = data.metrics?.social || 0;
    
    let verdict = (score >= 60 && trend >= 0) ? 'YES' : 'NO';
    
    return {
      answer: `${verdict}, based on current data for ${topic}: Sentiment score is ${score}/100, with ${social.toLocaleString()} social mentions and ${trend >= 0 ? '+' : ''}${trend}% trend. ${score >= 70 ? 'Strong positive sentiment suggests favorable conditions.' : score >= 60 ? 'Moderate positive sentiment shows potential.' : score >= 40 ? 'Mixed sentiment indicates uncertainty.' : 'Low sentiment suggests caution.'}`,
      insights: [
        {
          title: `${topic} Sentiment Analysis`,
          description: `Current sentiment: ${data.sentiment.sentiment} (${score}/100) with ${social.toLocaleString()} mentions`,
          type: score >= 60 ? 'positive' : score >= 40 ? 'neutral' : 'negative',
          importance: 'high',
          impact: score >= 60 ? 'Favorable for engagement' : 'Requires monitoring',
          explanation: `${score}/100 sentiment ${score >= 70 ? 'indicates strong public support' : score >= 60 ? 'shows moderate interest' : score >= 40 ? 'suggests mixed reactions' : 'reflects concerns'}`
        },
        {
          title: `Market Momentum`,
          description: `${trend >= 0 ? 'Growing' : 'Declining'} trend at ${trend >= 0 ? '+' : ''}${trend}%`,
          type: trend >= 0 ? 'positive' : 'negative',
          importance: 'high',
          impact: trend >= 0 ? 'Increasing interest' : 'Declining attention',
          explanation: `${Math.abs(trend) > 10 ? 'Significant' : 'Moderate'} ${trend >= 0 ? 'growth' : 'decline'} in engagement`
        },
        {
          title: `Media Coverage`,
          description: `${data.news.length} recent articles, ${data.metrics.relevance}% relevance`,
          type: 'neutral',
          importance: 'medium',
          impact: 'Indicates public attention',
          explanation: data.news.length > 5 ? 'High media interest' : 'Moderate coverage'
        }
      ],
      recommendation: `${verdict === 'YES' ? 'Positive indicators support attention to' : 'Current data suggests monitoring'} ${topic}. Sentiment: ${score}/100, Trend: ${trend}%, Social: ${social.toLocaleString()}.`,
      risks: [
        `Sentiment at ${score}/100 ${score < 60 ? 'below favorable threshold' : 'may fluctuate'}`,
        `${trend < 0 ? 'Declining trend indicates waning interest' : 'Market conditions can change'}`,
        `${data.news.length} articles may not show full picture`
      ],
      opportunities: [
        `${score >= 60 ? 'Positive sentiment creates opportunities' : 'Monitor for sentiment improvement'}`,
        `${trend >= 0 ? 'Growing trend suggests momentum' : 'Watch for trend reversal'}`,
        `${data.news.length > 3 ? 'Active coverage provides insights' : 'Limited coverage allows positioning'}`
      ],
      nextSteps: [
        `Track ${topic} sentiment daily`,
        `Review news for developments`,
        `Monitor trend changes`,
        `Compare with alternatives`
      ],
      confidence: score >= 70 ? 85 : score >= 60 ? 75 : 60,
      bestCharts: ['line', 'bar', 'area'],
      keyMetric: 'sentiment'
    };
  }
}

async function suggestComparisonTopics(topic) {
  try {
    const prompt = `Suggest 3-5 REAL competitors/alternatives to "${topic}":
{
  "suggestions": [
    {"topic": "name", "reason": "why", "category": "competitor/related/alternative"}
  ]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
    
  } catch (error) {
    return { suggestions: [] };
  }
}

async function analyzeDataset(analysis, purpose) {
  try {
    console.log(`🤖 Analyzing dataset for purpose: ${purpose}`);
    
    const numericCols = Object.entries(analysis.columnTypes)
      .filter(([k, v]) => v === 'numeric')
      .map(([k]) => k);
    
    const prompt = `Dataset Analysis:
- Rows: ${analysis.rowCount}
- Columns: ${analysis.columns.join(', ')}
- Numeric: ${numericCols.join(', ')}
- Question: "${purpose}"

Give YES/NO answer using actual columns. JSON:
{
  "answer": "YES/NO with column names and data",
  "insights": [{"title": "Finding", "description": "Detail", "type": "positive/negative"}],
  "recommendation": "Action based on data",
  "recommendedCharts": [{"chartType": "line/bar", "columns": ["col1", "col2"], "title": "Chart name"}]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
    
  } catch (error) {
    console.error('❌ Dataset Error:', error.message);
    
    const numericCols = Object.entries(analysis.columnTypes).filter(([k, v]) => v === 'numeric').map(([k]) => k);
    const hasData = numericCols.length >= 2;
    
    return {
      answer: `${hasData ? 'YES' : 'NO'}, dataset has ${analysis.rowCount} rows, ${analysis.columns.length} columns (${numericCols.length} numeric). ${hasData ? 'Can analyze: ' + numericCols.join(', ') : 'Need more numeric data'}.`,
      insights: [
        {
          title: 'Dataset Overview',
          description: `${analysis.rowCount} records, ${numericCols.length} numeric columns`,
          type: hasData ? 'positive' : 'neutral'
        }
      ],
      recommendation: hasData ? 'Visualize: ' + numericCols.slice(0, 2).join(' vs ') : 'Add numeric columns',
      recommendedCharts: numericCols.length >= 2 ? [
        {
          chartType: 'line',
          columns: [numericCols[0], numericCols[1]],
          title: `${numericCols[1]} over ${numericCols[0]}`
        }
      ] : []
    };
  }
}

module.exports = {
  generateDashboardInsights,
  suggestComparisonTopics,
  analyzeDataset
};